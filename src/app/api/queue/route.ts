import { eq } from "drizzle-orm";
import { db, queueSlots, users } from "@/db";
import { route } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/session";
import { getSlots, nextFreeSlots } from "@/lib/queue";
import { slotsSchema } from "@/lib/validation";

export const GET = route(async () => {
  const user = await apiUser();
  const [slots, next] = await Promise.all([
    getSlots(user.id),
    nextFreeSlots(user.id, user.timezone, 5).catch(() => []),
  ]);
  return Response.json({ slots, next, timezone: user.timezone });
});

export const PUT = route(async (req) => {
  const user = await apiUser();
  const { slots, timezone } = slotsSchema.parse(await req.json());
  if (timezone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      throw new HttpError(400, "Unknown timezone");
    }
    await db.update(users).set({ timezone }).where(eq(users.id, user.id));
  }
  await db.transaction(async (tx) => {
    await tx.delete(queueSlots).where(eq(queueSlots.userId, user.id));
    if (slots.length) {
      await tx.insert(queueSlots).values(slots.map((s) => ({ ...s, userId: user.id }))).onConflictDoNothing();
    }
  });
  return Response.json({ ok: true });
});
