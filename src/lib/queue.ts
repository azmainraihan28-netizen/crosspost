import "server-only";
import { TZDate } from "@date-fns/tz";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db, posts, queueSlots } from "@/db";

// Default posting times, adapted from social-media-agent's priority slots
// (weekday mornings, lunch and early evening perform best for most audiences).
export const DEFAULT_SLOTS: { dayOfWeek: number; minuteOfDay: number }[] = [1, 2, 3, 4, 5].flatMap((d) => [
  { dayOfWeek: d, minuteOfDay: 9 * 60 },
  { dayOfWeek: d, minuteOfDay: 12 * 60 + 30 },
  { dayOfWeek: d, minuteOfDay: 17 * 60 },
]);

export async function getSlots(userId: string) {
  const rows = await db.select().from(queueSlots).where(eq(queueSlots.userId, userId));
  return rows.length ? rows : DEFAULT_SLOTS;
}

/** Expand weekly slots into concrete UTC instants over the next `days` days. */
export function upcomingSlotTimes(
  slots: { dayOfWeek: number; minuteOfDay: number }[],
  timezone: string,
  days = 60,
  from = new Date(),
): Date[] {
  const out: Date[] = [];
  const start = new TZDate(from, timezone);
  for (let i = 0; i < days; i++) {
    const day = new TZDate(start.getFullYear(), start.getMonth(), start.getDate() + i, timezone);
    for (const s of slots) {
      if (s.dayOfWeek !== day.getDay()) continue;
      const t = new TZDate(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        Math.floor(s.minuteOfDay / 60),
        s.minuteOfDay % 60,
        timezone,
      );
      if (t.getTime() > from.getTime() + 60_000) out.push(new Date(t.getTime()));
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

/** Next N queue slots not already taken by a scheduled post. */
export async function nextFreeSlots(userId: string, timezone: string, n = 1): Promise<Date[]> {
  const slots = await getSlots(userId);
  const taken = await db
    .select({ at: posts.scheduledAt })
    .from(posts)
    .where(
      and(eq(posts.userId, userId), inArray(posts.status, ["scheduled", "publishing"]), gte(posts.scheduledAt, new Date())),
    );
  const takenSet = new Set(taken.map((t) => t.at?.getTime()));
  const free = upcomingSlotTimes(slots, timezone).filter((d) => !takenSet.has(d.getTime()));
  if (free.length < n) throw new Error("No free queue slots in the next 60 days. Add more posting times.");
  return free.slice(0, n);
}
