import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, posts } from "@/db";
import { route } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/session";
import { getPost, savePost } from "@/lib/posts";
import { publishPost } from "@/lib/publisher";
import { postInputSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/posts/[id]">;

export const GET = route(async (_req, ctx: Ctx) => {
  const user = await apiUser();
  const post = await getPost(user.id, (await ctx.params).id);
  if (!post) throw new HttpError(404, "Post not found");
  return Response.json({ post });
});

export const PUT = route(async (req, ctx: Ctx) => {
  const user = await apiUser();
  const input = postInputSchema.parse(await req.json());
  const post = await savePost(user, input, (await ctx.params).id);
  return Response.json({ post });
});

/** Lightweight actions from the calendar/queue: reschedule, unschedule, retry. */
export const PATCH = route(async (req, ctx: Ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const body = z
    .object({
      action: z.enum(["reschedule", "unschedule", "retry"]),
      scheduledAt: z.coerce.date().optional(),
    })
    .parse(await req.json());

  const post = await getPost(user.id, id);
  if (!post) throw new HttpError(404, "Post not found");

  if (body.action === "retry") {
    if (!["failed", "partial"].includes(post.status)) throw new HttpError(409, "Only failed posts can be retried");
    await publishPost(id);
    return Response.json({ post: await getPost(user.id, id) });
  }
  if (["publishing", "published", "partial"].includes(post.status)) {
    throw new HttpError(409, "Published posts can't be rescheduled");
  }
  if (body.action === "unschedule") {
    await db.update(posts).set({ status: "draft", scheduledAt: null }).where(eq(posts.id, id));
  } else {
    if (!body.scheduledAt || body.scheduledAt.getTime() < Date.now()) throw new HttpError(400, "Pick a time in the future");
    if (!post.targets.length) throw new HttpError(400, "Add at least one account before scheduling");
    await db.update(posts).set({ status: "scheduled", scheduledAt: body.scheduledAt }).where(eq(posts.id, id));
  }
  return Response.json({ post: await getPost(user.id, id) });
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const deleted = await db
    .delete(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
    .returning({ id: posts.id });
  if (!deleted.length) throw new HttpError(404, "Post not found");
  // Note: this removes the post from the app only; it does not delete it from the social platforms.
  return Response.json({ ok: true });
});
