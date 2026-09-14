import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/session";
import { analyticsRows } from "@/lib/data";
import { PLATFORMS, isPlatformId } from "@/lib/platforms/meta";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import { compact, daysAgo, fmt } from "@/components/format";
import { SyncButton } from "./sync-button";

export const metadata = { title: "Analytics" };

const RANGES = [7, 30, 90] as const;

export default async function AnalyticsPage({ searchParams }: PageProps<"/app/analytics">) {
  const user = await requireUser();
  const { range: rawRange } = await searchParams;
  const range = RANGES.find((r) => String(r) === rawRange) ?? 30;
  const rows = await analyticsRows(user.id, daysAgo(range));

  const total = (k: "impressions" | "likes" | "comments" | "shares") => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
  const engagements = total("likes") + total("comments") + total("shares");
  const reach = total("impressions");
  const lastSynced = rows.reduce<Date | null>((d, r) => (r.fetchedAt && (!d || r.fetchedAt > d) ? r.fetchedAt : d), null);
  const neverSynced = rows.length > 0 && rows.every((r) => !r.fetchedAt);

  const byPlatform = Object.values(
    rows.reduce<Record<string, { platform: string; posts: number; reach: number; engagements: number; unavailable: number }>>((acc, r) => {
      const a = (acc[r.platform] ??= { platform: r.platform, posts: 0, reach: 0, engagements: 0, unavailable: 0 });
      a.posts++;
      a.reach += r.impressions ?? 0;
      a.engagements += (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0);
      if (r.fetchedAt && !r.available) a.unavailable++;
      return acc;
    }, {}),
  ).sort((a, b) => b.engagements - a.engagements);
  const maxEng = Math.max(1, ...byPlatform.map((p) => p.engagements));

  // Daily engagement series for the bar chart.
  const days: { key: string; label: string; value: number }[] = [];
  const chartDays = Math.min(range, 30);
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = daysAgo(i);
    days.push({ key: fmt(d, "yyyy-MM-dd", user.timezone), label: fmt(d, "MMM d", user.timezone), value: 0 });
  }
  for (const r of rows) {
    const k = fmt(r.publishedAt, "yyyy-MM-dd", user.timezone);
    const day = days.find((d) => d.key === k);
    if (day) day.value += (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0);
  }
  const maxDay = Math.max(1, ...days.map((d) => d.value));

  const top = [...rows]
    .sort((a, b) => (b.likes ?? 0) + (b.comments ?? 0) + (b.shares ?? 0) - ((a.likes ?? 0) + (a.comments ?? 0) + (a.shares ?? 0)))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="How your posts are doing"
        description={
          lastSynced ? `Last synced ${fmt(lastSynced, "MMM d, h:mm a", user.timezone)}.` : "Sync to pull the latest numbers from each network."
        }
        actions={
          <>
            <div className="flex rounded-full border border-line bg-card p-0.5">
              {RANGES.map((r) => (
                <Link
                  key={r}
                  href={`/app/analytics?range=${r}`}
                  className={`rounded-full px-3 py-1 text-sm ${r === range ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
                >
                  {r}d
                </Link>
              ))}
            </div>
            <SyncButton autoSync={neverSynced} />
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No published posts in this range"
          body="Once your posts go out, reach and engagement from each network show up here."
          action={<Link href="/app/compose" className="btn-primary">Publish something</Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Posts" value={rows.length} />
            <Kpi label="Reach / views" value={reach} />
            <Kpi label="Likes" value={total("likes")} />
            <Kpi label="Comments" value={total("comments")} />
            <Kpi label="Engagement rate" value={reach ? `${((engagements / reach) * 100).toFixed(1)}%` : "n/a"} dark />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section className="card p-6">
              <h2 className="font-display text-2xl">Engagement by publish day</h2>
              <div className="mt-6 flex h-48 items-end gap-[3px]">
                {days.map((d) => (
                  <div key={d.key} className="group relative flex h-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-sm bg-ink transition group-hover:bg-signal"
                      style={{ height: `${d.value ? Math.max(3, (d.value / maxDay) * 100) : 1}%`, opacity: d.value ? 1 : 0.15 }}
                    />
                    <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-paper group-hover:block">
                      {d.label}: {d.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
                <span>{days[0]?.label}</span>
                <span>{days.at(-1)?.label}</span>
              </div>
            </section>

            <section className="card p-6">
              <h2 className="font-display text-2xl">By network</h2>
              <ul className="mt-5 space-y-4">
                {byPlatform.map((p) => (
                  <li key={p.platform}>
                    <div className="flex items-center gap-2 text-sm">
                      <PlatformBadge platform={p.platform} size={20} />
                      <span className="font-medium">{isPlatformId(p.platform) ? PLATFORMS[p.platform].name : p.platform}</span>
                      <span className="ml-auto font-mono text-xs text-muted">
                        {p.posts} posts · {compact(p.reach)} reach
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-paper-2">
                      <div className="h-full rounded-full bg-signal" style={{ width: `${(p.engagements / maxEng) * 100}%` }} />
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted">{compact(p.engagements)} engagements</p>
                    {p.unavailable > 0 && isPlatformId(p.platform) && (
                      <p className="mt-1 text-[11px] text-amber">
                        Metrics unavailable for {p.unavailable} post(s). {PLATFORMS[p.platform].analytics}.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="card mt-6 overflow-hidden">
            <h2 className="px-6 pt-6 font-display text-2xl">Top posts</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-line bg-paper-2/50 text-left font-mono text-[10px] tracking-widest text-muted uppercase">
                    <th className="px-6 py-2 font-normal">Post</th>
                    <th className="px-3 py-2 text-right font-normal">Reach</th>
                    <th className="px-3 py-2 text-right font-normal">Likes</th>
                    <th className="px-3 py-2 text-right font-normal">Comments</th>
                    <th className="px-3 py-2 text-right font-normal">Shares</th>
                    <th className="px-6 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {top.map((r) => (
                    <tr key={r.targetId}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <PlatformBadge platform={r.platform} size={22} />
                          <div className="min-w-0">
                            <p className="line-clamp-1 max-w-md">{r.override ?? r.content}</p>
                            <p className="font-mono text-[10px] text-muted">
                              {fmt(r.publishedAt, "MMM d", user.timezone)} · @{r.username}
                              {r.isDemo && " · demo data"}
                            </p>
                          </div>
                        </div>
                      </td>
                      {r.fetchedAt && !r.available ? (
                        <td colSpan={4} className="px-3 text-right text-xs text-muted">Not available from this network</td>
                      ) : (
                        <>
                          <td className="px-3 text-right font-mono">{compact(r.impressions ?? 0)}</td>
                          <td className="px-3 text-right font-mono">{compact(r.likes ?? 0)}</td>
                          <td className="px-3 text-right font-mono">{compact(r.comments ?? 0)}</td>
                          <td className="px-3 text-right font-mono">{compact(r.shares ?? 0)}</td>
                        </>
                      )}
                      <td className="px-6 text-right">
                        {r.externalUrl && (
                          <a href={r.externalUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-ink" aria-label="Open post">
                            <ExternalLink className="inline size-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {rows.some((r) => r.isDemo) && (
            <p className="mt-4 font-mono text-[11px] text-muted">Demo accounts show simulated metrics so you can explore the dashboard.</p>
          )}
        </>
      )}
    </>
  );
}

function Kpi({ label, value, dark }: { label: string; value: number | string; dark?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${dark ? "col-span-2 border-ink bg-ink text-paper lg:col-span-1" : "border-line bg-card"}`}>
      <p className={`font-mono text-[11px] tracking-[0.12em] uppercase ${dark ? "text-paper/60" : "text-muted"}`}>{label}</p>
      <p className="mt-2 font-display text-4xl leading-none">{typeof value === "number" ? compact(value) : value}</p>
    </div>
  );
}
