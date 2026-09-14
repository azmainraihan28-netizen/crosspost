"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { CalendarPlus, Check, LoaderCircle, Save, Sparkles, Trash } from "lucide-react";
import type { AccountDTO } from "@/lib/data";
import { api } from "@/lib/fetcher";
import { PlatformBadge } from "@/components/platform-badge";

type PlanPost = { day: number; theme: string; content: string; shortVersion: string };

const EXAMPLES = [
  "Launching our new spring menu at a neighborhood coffee shop",
  "Lessons from bootstrapping a SaaS to its first 100 customers",
  "Home workout tips for busy parents",
];

export function WeekPlanner({
  accounts,
  aiEnabled,
  defaultStart,
  timezone,
}: {
  accounts: AccountDTO[];
  aiEnabled: boolean;
  defaultStart: string;
  timezone: string;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanPost[] | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set(accounts.filter((a) => a.platform !== "instagram").map((a) => a.id)));
  const [startDate, setStartDate] = useState(defaultStart);
  const [times, setTimes] = useState(["09:00", "17:00"]);
  const [saving, setSaving] = useState<"drafts" | "schedule" | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const r = await api<{ plan: PlanPost[] }>("/api/ai/week", {
        method: "POST",
        body: { topic, audience: audience || undefined, tone: tone || undefined, postsPerDay },
      });
      setPlan(r.plan.sort((a, b) => a.day - b.day));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function save(mode: "drafts" | "schedule") {
    if (!plan) return;
    setSaving(mode);
    setError(null);
    try {
      const r = await api<{ created: number }>("/api/ai/week", {
        method: "PUT",
        body: { posts: plan, accountIds: [...selected], mode, startDate, times: times.slice(0, postsPerDay) },
      });
      setSaved(mode === "drafts" ? `${r.created} drafts saved.` : `${r.created} posts scheduled.`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  const update = (i: number, patch: Partial<PlanPost>) => setPlan((p) => p!.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const hasInstagram = accounts.some((a) => selected.has(a.id) && a.platform === "instagram");

  return (
    <div className="space-y-6">
      <form onSubmit={generate} className="card grid gap-4 p-6 md:grid-cols-[2fr_1fr]">
        <div>
          <label className="label" htmlFor="topic">Topic</label>
          <textarea
            id="topic"
            required
            minLength={3}
            rows={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What should this week be about?"
            className="input resize-none text-base"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button type="button" key={ex} onClick={() => setTopic(ex)} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 hover:border-ink/30">
                {ex}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="aud">Audience (optional)</label>
            <input id="aud" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. first-time founders" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="tone">Tone (optional)</label>
            <input id="tone" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. warm, witty, no jargon" className="input" />
          </div>
          <div className="flex items-end gap-3">
            <div>
              <p className="label">Per day</p>
              <div className="flex rounded-full border border-line bg-card p-0.5">
                {[1, 2].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setPostsPerDay(n)}
                    className={clsx("rounded-full px-3 py-1 text-sm", postsPerDay === n ? "bg-ink text-paper" : "text-muted")}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button disabled={!aiEnabled || loading} className="btn-signal flex-1 py-2.5">
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {plan ? "Regenerate" : "Generate week"}
            </button>
          </div>
        </div>
        {!aiEnabled && <p className="text-sm text-amber md:col-span-2">Set OPENAI_API_KEY in your environment to enable AI features.</p>}
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger md:col-span-2">{error}</p>}
      </form>

      {loading && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="card h-48 animate-pulse bg-paper-2/60" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
      )}

      {plan && !loading && (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {plan.map((p, i) => (
              <article key={i} className="card animate-rise flex flex-col p-4" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-widest text-signal uppercase">Day {p.day}</span>
                  <button onClick={() => setPlan((x) => x!.filter((_, j) => j !== i))} className="text-muted hover:text-danger" aria-label="Remove post">
                    <Trash className="size-3.5" />
                  </button>
                </div>
                <input
                  value={p.theme}
                  onChange={(e) => update(i, { theme: e.target.value })}
                  className="mt-1 bg-transparent font-display text-xl leading-tight outline-none"
                />
                <textarea
                  value={p.content}
                  onChange={(e) => update(i, { content: e.target.value })}
                  rows={7}
                  className="mt-2 flex-1 resize-y bg-transparent text-sm leading-relaxed text-ink-2 outline-none"
                />
                <details className="mt-2 border-t border-line pt-2">
                  <summary className="cursor-pointer font-mono text-[11px] text-muted">Short version for X / Threads ({p.shortVersion.length})</summary>
                  <textarea
                    value={p.shortVersion}
                    maxLength={280}
                    onChange={(e) => update(i, { shortVersion: e.target.value })}
                    rows={4}
                    className="mt-2 w-full resize-y bg-transparent text-sm outline-none"
                  />
                </details>
              </article>
            ))}
          </div>

          <section className="card p-6">
            <h2 className="font-display text-2xl">Save this week</h2>
            <div className="mt-4 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <p className="label">Accounts</p>
                {accounts.length === 0 ? (
                  <p className="text-sm text-muted">No accounts connected. You can still save these as drafts.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((a) => {
                      const on = selected.has(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() =>
                            setSelected((s) => {
                              const n = new Set(s);
                              if (n.has(a.id)) n.delete(a.id);
                              else n.add(a.id);
                              return n;
                            })
                          }
                          className={clsx(
                            "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm",
                            on ? "border-ink bg-ink text-paper" : "border-line text-ink-2 opacity-70",
                          )}
                        >
                          <PlatformBadge platform={a.platform} size={20} />
                          {a.displayName || a.username}
                          {on && <Check className="size-3.5 text-signal" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {hasInstagram && (
                  <p className="mt-2 text-xs text-amber">Instagram needs an image. Open each draft to add one before it publishes.</p>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="label" htmlFor="start">Start date</label>
                  <input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
                </div>
                {Array.from({ length: postsPerDay }).map((_, i) => (
                  <div key={i}>
                    <label className="label" htmlFor={`t${i}`}>{postsPerDay > 1 ? `Time ${i + 1}` : "Time"}</label>
                    <input
                      id={`t${i}`}
                      type="time"
                      value={times[i]}
                      onChange={(e) => setTimes((t) => t.map((x, j) => (j === i ? e.target.value : x)))}
                      className="input w-32"
                    />
                  </div>
                ))}
                <p className="w-full font-mono text-[11px] text-muted">Times in {timezone}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
              <button onClick={() => save("drafts")} disabled={saving !== null || plan.length === 0} className="btn-ghost">
                {saving === "drafts" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Save as drafts
              </button>
              <button onClick={() => save("schedule")} disabled={saving !== null || plan.length === 0 || selected.size === 0} className="btn-primary">
                {saving === "schedule" ? <LoaderCircle className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />} Schedule all {plan.length}
              </button>
              {saved && (
                <span className="flex items-center gap-2 text-sm text-moss">
                  <Check className="size-4" /> {saved}{" "}
                  <a href="/app/calendar" className="underline underline-offset-2">View calendar</a>
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
