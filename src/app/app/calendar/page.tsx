import Link from "next/link";
import { TZDate } from "@date-fns/tz";
import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listPosts } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { fmt, nowMs } from "@/components/format";
import { CalendarGrid } from "./calendar-grid";

export const metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: PageProps<"/app/calendar">) {
  const user = await requireUser();
  const tz = user.timezone;
  const { month } = await searchParams;

  const now = new TZDate(nowMs(), tz);
  const [y, m] =
    typeof month === "string" && /^\d{4}-\d{2}$/.test(month)
      ? month.split("-").map(Number)
      : [now.getFullYear(), now.getMonth() + 1];
  const anchor = new TZDate(y, m - 1, 1, tz);
  const gridStart = startOfWeek(startOfMonth(anchor));
  const gridEnd = endOfWeek(endOfMonth(anchor));

  const posts = await listPosts(user.id, { from: new Date(gridStart.getTime()), to: new Date(gridEnd.getTime()), order: "scheduled" });

  const days: string[] = [];
  for (let d = new TZDate(gridStart, tz); d <= gridEnd; d = new TZDate(d.getFullYear(), d.getMonth(), d.getDate() + 1, tz)) {
    days.push(fmt(d, "yyyy-MM-dd", tz));
  }

  const prev = fmt(addMonths(anchor, -1), "yyyy-MM", tz);
  const next = fmt(addMonths(anchor, 1), "yyyy-MM", tz);

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title={
          <>
            {fmt(anchor, "MMMM", tz)} <em className="text-muted">{fmt(anchor, "yyyy", tz)}</em>
          </>
        }
        description="Drag a scheduled post to another day to reschedule it. It keeps its time of day."
        actions={
          <>
            <div className="flex items-center rounded-full border border-line bg-card">
              <Link href={`/app/calendar?month=${prev}`} className="p-2 text-ink-2 hover:text-ink" aria-label="Previous month">
                <ChevronLeft className="size-4" />
              </Link>
              <Link href="/app/calendar" className="px-2 text-sm font-medium">Today</Link>
              <Link href={`/app/calendar?month=${next}`} className="p-2 text-ink-2 hover:text-ink" aria-label="Next month">
                <ChevronRight className="size-4" />
              </Link>
            </div>
            <Link href="/app/compose" className="btn-primary">
              <PenLine className="size-4" /> New post
            </Link>
          </>
        }
      />
      <CalendarGrid
        days={days}
        month={fmt(anchor, "yyyy-MM", tz)}
        today={fmt(new Date(), "yyyy-MM-dd", tz)}
        timezone={tz}
        posts={posts}
      />
    </>
  );
}
