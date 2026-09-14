import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db, metrics, posts, postTargets, socialAccounts, type Post } from "@/db";

/** Client-safe account shape (never includes tokens). */
export type AccountDTO = {
  id: string;
  platform: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isDemo: boolean;
  expiresAt: string | null;
};

export async function listAccounts(userId: string): Promise<AccountDTO[]> {
  const rows = await db
    .select({
      id: socialAccounts.id,
      platform: socialAccounts.platform,
      username: socialAccounts.username,
      displayName: socialAccounts.displayName,
      avatarUrl: socialAccounts.avatarUrl,
      isDemo: socialAccounts.isDemo,
      expiresAt: socialAccounts.expiresAt,
    })
    .from(socialAccounts)
    .where(eq(socialAccounts.userId, userId))
    .orderBy(asc(socialAccounts.platform), asc(socialAccounts.createdAt));
  return rows.map((r) => ({ ...r, expiresAt: r.expiresAt?.toISOString() ?? null }));
}

export type TargetDTO = {
  id: string;
  accountId: string;
  platform: string;
  username: string;
  contentOverride: string | null;
  status: string;
  externalUrl: string | null;
  error: string | null;
};

export type PostDTO = Omit<Post, "scheduledAt" | "publishedAt" | "createdAt" | "updatedAt" | "userId"> & {
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  targets: TargetDTO[];
};

export async function listPosts(
  userId: string,
  opts: { id?: string; statuses?: Post["status"][]; from?: Date; to?: Date; order?: "scheduled" | "recent"; limit?: number } = {},
): Promise<PostDTO[]> {
  const where: SQL[] = [eq(posts.userId, userId)];
  if (opts.id) where.push(eq(posts.id, opts.id));
  if (opts.statuses) where.push(inArray(posts.status, opts.statuses));
  // Date range matches scheduled time, falling back to publish time for "publish now" posts.
  const when = sql`coalesce(${posts.scheduledAt}, ${posts.publishedAt})`;
  if (opts.from) where.push(gte(when, opts.from.getTime()));
  if (opts.to) where.push(lte(when, opts.to.getTime()));

  const rows = await db
    .select()
    .from(posts)
    .where(and(...where))
    .orderBy(opts.order === "scheduled" ? asc(posts.scheduledAt) : desc(posts.updatedAt))
    .limit(opts.limit ?? 500);
  if (!rows.length) return [];

  const targets = await db
    .select({
      id: postTargets.id,
      postId: postTargets.postId,
      accountId: postTargets.accountId,
      platform: socialAccounts.platform,
      username: socialAccounts.username,
      contentOverride: postTargets.contentOverride,
      status: postTargets.status,
      externalUrl: postTargets.externalUrl,
      error: postTargets.error,
    })
    .from(postTargets)
    .innerJoin(socialAccounts, eq(postTargets.accountId, socialAccounts.id))
    .where(inArray(postTargets.postId, rows.map((r) => r.id)));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return rows.map(({ userId, updatedAt, ...p }) => ({
    ...p,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    targets: targets.filter((t) => t.postId === p.id).map(({ postId, ...t }) => t),
  }));
}

export async function analyticsRows(userId: string, since: Date) {
  return db
    .select({
      targetId: postTargets.id,
      postId: posts.id,
      content: posts.content,
      override: postTargets.contentOverride,
      publishedAt: postTargets.publishedAt,
      externalUrl: postTargets.externalUrl,
      platform: socialAccounts.platform,
      username: socialAccounts.username,
      isDemo: socialAccounts.isDemo,
      impressions: metrics.impressions,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      available: metrics.available,
      fetchedAt: metrics.fetchedAt,
    })
    .from(postTargets)
    .innerJoin(posts, eq(postTargets.postId, posts.id))
    .innerJoin(socialAccounts, eq(postTargets.accountId, socialAccounts.id))
    .leftJoin(metrics, eq(metrics.targetId, postTargets.id))
    .where(and(eq(posts.userId, userId), eq(postTargets.status, "published"), gte(postTargets.publishedAt, since)))
    .orderBy(desc(postTargets.publishedAt));
}
