"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { TZDate } from "@date-fns/tz";
import { Plus } from "lucide-react";
import type { PostDTO } from "@/lib/data";
import { api } from "@/lib/fetcher";
import { PlatformBadge } from "@/components/platform-badge";
import { fmt } from "@/components/format";

const DOT: Record<string, string> = {
  draft: "bg-muted",
  scheduled: "bg-amber",
  publishing: "bg-signal",
  published: "bg-moss",
  partial: "bg-amber",
  failed: "bg-danger",
};

export function CalendarGrid({
  days,
  month,
  today,
  timezone,
  posts,
}: {
  days: string[];
  month: string;
  today: string;
  timezone: string;
  posts: PostDTO[];
}) {
  const router = useRouter();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byDay = new Map<string, PostDTO[]>();
  for (const p of posts) {
    const key = fmt(p.scheduledAt ?? p.publishedAt, "yyyy-MM-dd", timezone);
    byDay.set(key, [...(byDay.get(key) ?? []), p]);
  }

  async function drop(day: string) {
    const post = posts.find((p) => p.id === dragId);
    setDragId(null);
    setOverDay(null);
    if (!post?.scheduledAt || post.status !== "scheduled") return;
    const [y, m, d] = day.split("-").map(Number);
    const time = new TZDate(new Date(post.scheduledAt).getTime(), timezone);
    const when = new TZDate(y, m - 1, d, time.getHours(), time.getMinutes(), timezone);
    try {
      setError(null);
      await api(`/api/posts/${post.id}`, { method: "PATCH", body: { action: "reschedule", scheduledAt: new Date(when.getTime()).toISOString() } });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-paper-2/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2 py-2 text-center font-mono text-[10px] tracking-widest text-muted uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = day.startsWith(month);
            const items = byDay.get(day) ?? [];
            const past = day < today;
            return (
              <div
                key={day}
                onDragOver={(e) => {
                  if (!dragId || past) return;
                  e.preventDefault();
                  setOverDay(day);
                }}
                onDragLeave={() => setOverDay((d) => (d === day ? null : d))}
                onDrop={() => drop(day)}
                className={clsx(
                  "group relative min-h-24 border-line p-1.5 sm:min-h-32",
                  i % 7 !== 6 && "border-r",
                  i < days.length - 7 && "border-b",
                  !inMonth && "bg-paper-2/40",
                  overDay === day && "bg-signal/10",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={clsx(
                      "grid size-6 place-items-center rounded-full font-mono text-xs",
                      day === today ? "bg-signal text-white" : inMonth ? "text-ink" : "text-muted",
                    )}
                  >
                    {Number(day.slice(8))}
                  </span>
                  {!past && (
                    <Link
                      href={`/app/compose?date=${day}`}
                      aria-label={`New post on ${day}`}
                      className="grid size-6 place-items-center rounded-full text-muted opacity-0 transition group-hover:opacity-100 hover:bg-ink hover:text-paper"
                    >
                      <Plus className="size-3.5" />
                    </Link>
                  )}
                </div>
                <ul className="mt-1 space-y-1">
                  {items.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/app/compose?id=${p.id}`}
                        draggable={p.status === "scheduled"}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", p.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragId(p.id);
                        }}
                        onDragEnd={() => setDragId(null)}
                        className={clsx(
                          "flex items-center gap-1 rounded-md border border-line bg-card px-1.5 py-1 text-[11px] leading-tight shadow-sm hover:border-ink/30",
                          p.status === "scheduled" && "cursor-grab active:cursor-grabbing",
                          dragId === p.id && "opacity-40",
                        )}
                      >
                        <span className={clsx("size-1.5 shrink-0 rounded-full", DOT[p.status])} />
                        <span className="hidden shrink-0 font-mono text-muted sm:inline">
                          {fmt(p.scheduledAt ?? p.publishedAt, "h:mma", timezone).toLowerCase()}
                        </span>
                        <span className="hidden truncate md:inline">{p.content || "Untitled"}</span>
                        <span className="ml-auto hidden shrink-0 -space-x-1 lg:flex">
                          {p.targets.slice(0, 3).map((t) => (
                            <PlatformBadge key={t.id} platform={t.platform} size={12} />
                          ))}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {items.length > 4 && <li className="px-1 font-mono text-[10px] text-muted">+{items.length - 4} more</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] text-muted">
        {["scheduled", "published", "partial", "failed"].map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={clsx("size-2 rounded-full", DOT[s])} /> {s}
          </span>
        ))}
      </div>
    </div>
  );
}
