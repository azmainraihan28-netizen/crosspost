import "server-only";
import { and, eq, inArray, lte } from "drizzle-orm";
import { db, posts, postTargets, socialAccounts, metrics, type SocialAccount } from "@/db";
import { adapters, demoAllowed, PLATFORMS, isPlatformId, type AccountCtx, type MetricsResult } from "./platforms";
import { absoluteMediaUrl } from "./platforms/media";
import { decrypt, encrypt } from "./crypto";

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Decrypts tokens and refreshes them if they're about to expire. */
export async function accountContext(account: SocialAccount): Promise<AccountCtx> {
  const meta = account.meta ?? {};
  let accessToken = decrypt(account.accessToken);
  const adapter = isPlatformId(account.platform) ? adapters[account.platform] : null;

  if (
    !account.isDemo &&
    adapter?.refresh &&
    account.expiresAt &&
    account.expiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS
  ) {
    const refreshed = await adapter.refresh({
      accessToken,
      refreshToken: account.refreshToken ? decrypt(account.refreshToken) : undefined,
    });
    if (refreshed) {
      accessToken = refreshed.accessToken;
      await db
        .update(socialAccounts)
        .set({
          accessToken: encrypt(refreshed.accessToken),
          refreshToken: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : account.refreshToken,
          expiresAt: refreshed.expiresAt ?? null,
        })
        .where(eq(socialAccounts.id, account.id));
    }
  }
  return { externalId: account.externalId, accessToken, meta };
}

/**
 * Publishes every pending target of a post. Targets publish independently so one platform
 * failing doesn't block the others; the post ends up published, partial, or failed.
 */
export async function publishPost(postId: string) {
  // Claim the post atomically so the scheduler and "Publish now" can't double-post.
  const claimed = await db
    .update(posts)
    .set({ status: "publishing" })
    .where(and(eq(posts.id, postId), inArray(posts.status, ["draft", "scheduled", "failed", "partial"])))
    .returning();
  const post = claimed[0];
  if (!post) return null;

  const targets = await db
    .select({ target: postTargets, account: socialAccounts })
    .from(postTargets)
    .innerJoin(socialAccounts, eq(postTargets.accountId, socialAccounts.id))
    .where(and(eq(postTargets.postId, postId), inArray(postTargets.status, ["pending", "failed"])));

  const media = post.media.map(absoluteMediaUrl);

  await Promise.all(
    targets.map(async ({ target, account }) => {
      const text = target.contentOverride ?? post.content;
      try {
        if (!isPlatformId(account.platform)) throw new Error(`Unknown platform ${account.platform}`);
        const meta = PLATFORMS[account.platform];
        if (text.length > meta.charLimit) throw new Error(`Text exceeds ${meta.name}'s ${meta.charLimit} character limit`);
        if (meta.requiresMedia && media.length === 0) throw new Error(`${meta.name} requires an image`);

        if (account.isDemo && !demoAllowed()) {
          throw new Error("Demo accounts are disabled. Connect a real account to publish.");
        }
        const result = account.isDemo
          ? { id: `demo_${target.id}`, url: undefined }
          : await adapters[account.platform].publish(await accountContext(account), { text, media });

        await db
          .update(postTargets)
          .set({
            status: "published",
            externalPostId: result.id,
            externalUrl: result.url ?? null,
            error: null,
            publishedAt: new Date(),
          })
          .where(eq(postTargets.id, target.id));
      } catch (err) {
        await db
          .update(postTargets)
          .set({ status: "failed", error: err instanceof Error ? err.message : String(err) })
          .where(eq(postTargets.id, target.id));
      }
    }),
  );

  const all = await db.select({ status: postTargets.status }).from(postTargets).where(eq(postTargets.postId, postId));
  const ok = all.filter((t) => t.status === "published").length;
  const status = all.length === 0 ? "failed" : ok === all.length ? "published" : ok === 0 ? "failed" : "partial";
  const [updated] = await db
    .update(posts)
    .set({ status, publishedAt: ok > 0 ? new Date() : null })
    .where(eq(posts.id, postId))
    .returning();
  return updated;
}

/** Called every minute by the scheduler (local interval or cron endpoint). */
export async function publishDuePosts() {
  const due = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.status, "scheduled"), lte(posts.scheduledAt, new Date())))
    .limit(25);
  for (const { id } of due) await publishPost(id);
  // Recover posts stuck in "publishing" (e.g. server restarted mid-publish).
  await db
    .update(posts)
    .set({ status: "scheduled" })
    .where(and(eq(posts.status, "publishing"), lte(posts.updatedAt, new Date(Date.now() - 15 * 60 * 1000))));
  return due.length;
}

/* ------------------------------- Analytics ------------------------------- */

/** Deterministic, slowly-growing fake numbers so demo accounts have a believable dashboard. */
function demoMetrics(targetId: string, publishedAt: Date, platform: string): MetricsResult {
  let h = 0;
  for (const c of targetId + platform) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hours = Math.max(1, (Date.now() - publishedAt.getTime()) / 3.6e6);
  const growth = Math.min(1, Math.log10(hours + 1) / 2);
  const base = 400 + (h % 4600);
  const impressions = Math.round(base * growth);
  const rate = 0.02 + ((h >> 8) % 60) / 1000;
  const likes = Math.round(impressions * rate);
  return {
    impressions,
    likes,
    comments: Math.round(likes * 0.12),
    shares: Math.round(likes * 0.08),
  };
}

/** Refresh metrics for a user's published targets from the last 30 days. */
export async function syncMetrics(userId: string) {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const rows = await db
    .select({ target: postTargets, account: socialAccounts })
    .from(postTargets)
    .innerJoin(posts, eq(postTargets.postId, posts.id))
    .innerJoin(socialAccounts, eq(postTargets.accountId, socialAccounts.id))
    .where(and(eq(posts.userId, userId), eq(postTargets.status, "published")));

  const recent = rows.filter((r) => r.target.publishedAt && r.target.publishedAt >= since);
  await Promise.all(
    recent.map(async ({ target, account }) => {
      let m: MetricsResult | null = null;
      if (account.isDemo) m = demoMetrics(target.id, target.publishedAt!, account.platform);
      else if (isPlatformId(account.platform) && target.externalPostId) {
        try {
          m = await adapters[account.platform].metrics(await accountContext(account), target.externalPostId);
        } catch {
          m = null;
        }
      }
      const values = {
        impressions: m?.impressions ?? 0,
        likes: m?.likes ?? 0,
        comments: m?.comments ?? 0,
        shares: m?.shares ?? 0,
        available: m !== null,
        fetchedAt: new Date(),
      };
      await db
        .insert(metrics)
        .values({ targetId: target.id, ...values })
        .onConflictDoUpdate({ target: metrics.targetId, set: values });
    }),
  );
  return recent.length;
}
