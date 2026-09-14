import { z } from "zod";
import { TZDate } from "@date-fns/tz";
import { db, aiUsage, posts, postTargets, socialAccounts } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { route } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/session";
import { assertLimit } from "@/lib/plans";
import { generateWeek } from "@/lib/ai";
import { PLATFORMS, isPlatformId } from "@/lib/platforms/meta";
import { weekSchema } from "@/lib/validation";

export const maxDuration = 180;

/** Generate a 7-day plan (not saved). */
export const POST = route(async (req) => {
  const user = await apiUser();
  const input = weekSchema.parse(await req.json());
  await assertLimit(user, "ai");
  const plan = await generateWeek(input);
  await db.insert(aiUsage).values({ userId: user.id, kind: "week" });
  return Response.json({ plan });
});

const saveSchema = z.object({
  posts: z
    .array(z.object({ day: z.number().int().min(1).max(7), content: z.string().min(1), shortVersion: z.string() }))
    .min(1)
    .max(14),
  accountIds: z.array(z.string()).default([]),
  mode: z.enum(["drafts", "schedule"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(2).default(["09:00"]),
});

/** Save a plan as drafts or scheduled posts. Short versions are used where the full text won't fit. */
export const PUT = route(async (req) => {
  const user = await apiUser();
  const input = saveSchema.parse(await req.json());
  await assertLimit(user, "posts", input.posts.length);

  const accounts = input.accountIds.length
    ? await db
        .select()
        .from(socialAccounts)
        .where(and(eq(socialAccounts.userId, user.id), inArray(socialAccounts.id, input.accountIds)))
    : [];
  if (input.mode === "schedule" && !accounts.length) throw new HttpError(400, "Select accounts to schedule to");

  const [y, m, d] = input.startDate.split("-").map(Number);
  const perDay: Record<number, number> = {};
  let created = 0;

  await db.transaction(async (tx) => {
    for (const p of input.posts) {
      const idx = (perDay[p.day] = (perDay[p.day] ?? -1) + 1);
      const [hh, mm] = input.times[Math.min(idx, input.times.length - 1)].split(":").map(Number);
      const when = new Date(new TZDate(y, m - 1, d + p.day - 1, hh, mm, user.timezone).getTime());
      const schedule = input.mode === "schedule" && when.getTime() > Date.now();

      const [{ id }] = await tx
        .insert(posts)
        .values({
          userId: user.id,
          content: p.content,
          status: schedule ? "scheduled" : "draft",
          scheduledAt: schedule ? when : null,
        })
        .returning({ id: posts.id });
      created++;

      if (accounts.length) {
        await tx.insert(postTargets).values(
          accounts.map((a) => {
            const limit = isPlatformId(a.platform) ? PLATFORMS[a.platform].charLimit : 280;
            return {
              postId: id,
              accountId: a.id,
              contentOverride: p.content.length > limit ? p.shortVersion : null,
            };
          }),
        );
      }
    }
  });
  return Response.json({ created });
});
