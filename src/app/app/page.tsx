import Link from "next/link";
import { ArrowRight, Check, PenLine, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/session";
import { planOf, usageFor } from "@/lib/plans";
import { analyticsRows, listAccounts, listPosts } from "@/lib/data";
import { EmptyState, PageHeader, StatusPill } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import { compact, daysAgo, fmt } from "@/components/format";

export const metadata = { title: "Overview" };

export default async function Overview() {
  const user = await requireUser();
  const plan = planOf(user);
  const [usage, accounts, upcoming, recent, stats] = await Promise.all([
    usageFor(user),
    listAccounts(user.id),
    listPosts(user.id, { statuses: ["scheduled"], from: new Date(), order: "scheduled", limit: 5 }),
    listPosts(user.id, { statuses: ["published", "partial", "failed"], limit: 4 }),
    analyticsRows(user.id, daysAgo(30)),
  ]);

  const engagement = stats.reduce((s, r) => s + (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0), 0);
  const reach = stats.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const hour = Number(fmt(new Date(), "H", user.timezone));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const steps = [
    { done: accounts.length > 0, label: "Connect a social account", href: "/app/accounts" },
    { done: usage.posts > 0, label: "Compose your first post", href: "/app/compose" },
    { done: upcoming.length > 0, label: "Schedule something for later", href: "/app/queue" },
    { done: usage.ai > 0, label: "Generate a week of content with AI", href: "/app/ai" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={fmt(new Date(), "EEEE, MMMM d", user.timezone)}
        title={
          <>
            {greeting}
            {user.name ? `, ${user.name.split(" ")[0]}` : ""}.
          </>
        }
        actions={
          <>
            <Link href="/app/ai" className="btn-ghost">
              <Sparkles className="size-4 text-signal" /> Plan a week
            </Link>
            <Link href="/app/compose" className="btn-primary">
              <PenLine className="size-4" /> New post
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Scheduled" value={String(upcoming.length === 5 ? "5+" : upcoming.length)} />
        <Stat label="Posts this month" value={`${usage.posts}${Number.isFinite(plan.postsPerMonth) ? ` / ${plan.postsPerMonth}` : ""}`} />
        <Stat label="Reach · 30d" value={compact(reach)} />
        <Stat label="Engagements · 30d" value={compact(engagement)} accent />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Up next</h2>
            <Link href="/app/calendar" className="text-sm text-muted hover:text-ink">Calendar →</Link>
          </div>
          <div className="mt-4">
            {upcoming.length === 0 ? (
              <EmptyState
                title="Nothing scheduled"
                body="Add a post to your queue and it'll go out at your next posting time."
                action={<Link href="/app/compose" className="btn-primary">Compose</Link>}
              />
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((p) => (
                  <li key={p.id}>
                    <Link href={`/app/compose?id=${p.id}`} className="group flex items-start gap-4 py-3">
                      <div className="w-16 shrink-0 text-center">
                        <p className="font-mono text-[10px] text-muted uppercase">{fmt(p.scheduledAt, "EEE d", user.timezone)}</p>
                        <p className="font-display text-xl leading-tight">{fmt(p.scheduledAt, "h:mm", user.timezone)}</p>
                        <p className="font-mono text-[10px] text-muted">{fmt(p.scheduledAt, "a", user.timezone)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm group-hover:text-ink-2">{p.content || <em className="text-muted">No text</em>}</p>
                        <div className="mt-2 flex gap-1">
                          {p.targets.map((t) => (
                            <PlatformBadge key={t.id} platform={t.platform} size={18} />
                          ))}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="space-y-6">
          {steps.some((s) => !s.done) && (
            <section className="card p-6">
              <h2 className="font-display text-2xl">Getting started</h2>
              <ul className="mt-4 space-y-2">
                {steps.map((s) => (
                  <li key={s.label}>
                    <Link href={s.href} className="flex items-center gap-3 rounded-lg py-1.5 text-sm hover:text-ink">
                      <span className={`grid size-5 place-items-center rounded-full border ${s.done ? "border-moss bg-moss text-white" : "border-line"}`}>
                        {s.done && <Check className="size-3" />}
                      </span>
                      <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
                      {!s.done && <ArrowRight className="ml-auto size-3.5 text-muted" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Recently sent</h2>
              <Link href="/app/queue?tab=sent" className="text-sm text-muted hover:text-ink">All →</Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Your published posts will show up here.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-start gap-3">
                    <StatusPill status={p.status} />
                    <p className="line-clamp-1 flex-1 text-sm text-ink-2">{p.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6">
            <h2 className="font-display text-2xl">{plan.name} plan usage</h2>
            <div className="mt-4 space-y-3">
              <Meter label="Accounts" used={usage.accounts} max={plan.accounts} />
              <Meter label="Posts this month" used={usage.posts} max={plan.postsPerMonth} />
              <Meter label="AI generations" used={usage.ai} max={plan.aiPerMonth} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-ink bg-ink text-paper" : "border-line bg-card"}`}>
      <p className={`font-mono text-[11px] tracking-[0.12em] uppercase ${accent ? "text-paper/60" : "text-muted"}`}>{label}</p>
      <p className="mt-2 font-display text-4xl leading-none">{value}</p>
    </div>
  );
}

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const finite = Number.isFinite(max);
  const pct = finite ? Math.min(100, (used / max) * 100) : 6;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="font-mono text-xs text-muted">
          {used} / {finite ? max : "∞"}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-paper-2">
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-signal" : "bg-ink"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
