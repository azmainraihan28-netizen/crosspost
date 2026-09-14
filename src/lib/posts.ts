import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import { db, posts, postTargets, socialAccounts, type User } from "@/db";
import { HttpError } from "./session";
import { assertLimit } from "./plans";
import { nextFreeSlots } from "./queue";
import { publishPost } from "./publisher";
import { isPlatformId, PLATFORMS } from "./platforms/meta";
import type { postInputSchema } from "./validation";
import { listPosts } from "./data";

type PostInput = z.infer<typeof postInputSchema>;

/** Create or update a post and its targets, then schedule/queue/publish according to `action`. */
export async function savePost(user: User, input: PostInput, postId?: string) {
  const existing = postId
    ? (await db.select().from(posts).where(and(eq(posts.id, postId), eq(posts.userId, user.id))))[0]
    : undefined;
  if (postId && !existing) throw new HttpError(404, "Post not found");
  // Partial posts are locked too: re-saving would reset targets and re-post to networks that succeeded.
  if (existing && ["publishing", "published", "partial"].includes(existing.status)) {
    throw new HttpError(409, "This post has already been published and can't be edited. Use Retry for failed networks.");
  }
  if (!existing) await assertLimit(user, "posts");

  // Validate targets belong to the user.
  const accountIds = [...new Set(input.targets.map((t) => t.accountId))];
  const accounts = accountIds.length
    ? await db
        .select()
        .from(socialAccounts)
        .where(and(eq(socialAccounts.userId, user.id), inArray(socialAccounts.id, accountIds)))
    : [];
  if (accounts.length !== accountIds.length) throw new HttpError(400, "One or more selected accounts were not found");

  if (input.action !== "draft") {
    if (!accounts.length) throw new HttpError(400, "Select at least one account");
    for (const acc of accounts) {
      if (!isPlatformId(acc.platform)) continue;
      const meta = PLATFORMS[acc.platform];
      const t = input.targets.find((x) => x.accountId === acc.id)!;
      const text = t.contentOverride ?? input.content;
      if (!text.trim() && !input.media.length) throw new HttpError(400, `Post for ${meta.name} is empty`);
      if (text.length > meta.charLimit)
        throw new HttpError(400, `${meta.name} post is ${text.length} characters (limit ${meta.charLimit})`);
      if (meta.requiresMedia && !input.media.length) throw new HttpError(400, `${meta.name} requires at least one image`);
    }
  }

  let scheduledAt: Date | null = null;
  let status: "draft" | "scheduled" = "draft";
  if (input.action === "schedule") {
    if (!input.scheduledAt || input.scheduledAt.getTime() < Date.now() - 60_000)
      throw new HttpError(400, "Pick a time in the future");
    scheduledAt = input.scheduledAt;
    status = "scheduled";
  } else if (input.action === "queue") {
    try {
      [scheduledAt] = await nextFreeSlots(user.id, user.timezone);
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    status = "scheduled";
  }

  const values = { content: input.content, media: input.media, status, scheduledAt };
  const id = await db.transaction(async (tx) => {
    let id = postId;
    if (existing) {
      await tx.update(posts).set(values).where(eq(posts.id, existing.id));
      await tx.delete(postTargets).where(eq(postTargets.postId, existing.id));
    } else {
      [{ id }] = await tx.insert(posts).values({ userId: user.id, ...values }).returning({ id: posts.id });
    }
    if (input.targets.length) {
      await tx.insert(postTargets).values(
        input.targets.map((t) => ({
          postId: id!,
          accountId: t.accountId,
          contentOverride: t.contentOverride?.trim() ? t.contentOverride : null,
        })),
      );
    }
    return id!;
  });

  if (input.action === "now") await publishPost(id);
  return getPost(user.id, id);
}

export async function getPost(userId: string, id: string) {
  const [post] = await listPosts(userId, { id });
  return post ?? null;
}
