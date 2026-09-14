"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { TZDate } from "@date-fns/tz";
import {
  CalendarClock,
  Check,
  ExternalLink,
  ImagePlus,
  ListOrdered,
  LoaderCircle,
  Save,
  Send,
  Sparkles,
  Trash,
  TriangleAlert,
  X,
} from "lucide-react";
import { api } from "@/lib/fetcher";
import { PLATFORMS, isPlatformId, type PlatformId } from "@/lib/platforms/meta";
import type { AccountDTO, PostDTO } from "@/lib/data";
import { PlatformBadge } from "@/components/platform-badge";
import { PostPreview } from "@/components/post-preview";
import { StatusPill } from "@/components/page-header";
import { fmt } from "@/components/format";

type Action = "draft" | "schedule" | "queue" | "now";

export function Composer({
  accounts,
  post,
  timezone,
  aiEnabled,
  initialDate,
}: {
  accounts: AccountDTO[];
  post: PostDTO | null;
  timezone: string;
  aiEnabled: boolean;
  initialDate?: string;
}) {
  const router = useRouter();
  const readOnly = post ? ["publishing", "published", "partial"].includes(post.status) : false;

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(post ? post.targets.map((t) => t.accountId) : accounts.map((a) => a.id)),
  );
  const [content, setContent] = useState(post?.content ?? "");
  const [media, setMedia] = useState<string[]>(post?.media ?? []);
  const [overrides, setOverrides] = useState<Partial<Record<PlatformId, string>>>(() => {
    const o: Partial<Record<PlatformId, string>> = {};
    post?.targets.forEach((t) => {
      if (t.contentOverride && isPlatformId(t.platform)) o[t.platform] = t.contentOverride;
    });
    return o;
  });
  const [editing, setEditing] = useState<PlatformId | "all">("all");
  const [previewTab, setPreviewTab] = useState<PlatformId | null>(null);
  const [scheduleAt, setScheduleAt] = useState(() => {
    if (post?.scheduledAt) return fmt(post.scheduledAt, "yyyy-MM-dd'T'HH:mm", timezone);
    if (initialDate) return `${initialDate}T09:00`;
    return "";
  });
  const [showSchedule, setShowSchedule] = useState(Boolean(initialDate || post?.scheduledAt));
  const [busy, setBusy] = useState<Action | "upload" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PostDTO | null>(null);

  // AI
  const [aiOpen, setAiOpen] = useState(false);
  const [tone, setTone] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [variations, setVariations] = useState<Partial<Record<PlatformId, string[]>> | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");

  const selectedAccounts = accounts.filter((a) => selected.has(a.id));
  const platforms = useMemo(
    () => [...new Set(selectedAccounts.map((a) => a.platform))].filter(isPlatformId),
    [selectedAccounts],
  );
  const activePreview = previewTab && platforms.includes(previewTab) ? previewTab : platforms[0];
  const textFor = (p: PlatformId) => overrides[p] ?? content;
  const editorValue = editing === "all" ? content : textFor(editing);
  const editorLimit = editing === "all" ? Math.min(...platforms.map((p) => PLATFORMS[p].charLimit), Infinity) : PLATFORMS[editing].charLimit;

  const problems = platforms.flatMap((p) => {
    const m = PLATFORMS[p];
    const out: string[] = [];
    if (textFor(p).length > m.charLimit) out.push(`${m.name}: ${textFor(p).length}/${m.charLimit} characters`);
    if (m.requiresMedia && media.length === 0) out.push(`${m.name}: add at least one image`);
    return out;
  });

  function setEditorValue(v: string) {
    if (editing === "all") setContent(v);
    else setOverrides((o) => ({ ...o, [editing]: v }));
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy("upload");
    setError(null);
    try {
      for (const f of Array.from(files).slice(0, 10 - media.length)) {
        const fd = new FormData();
        fd.append("file", f);
        const { url } = await api<{ url: string }>("/api/uploads", { method: "POST", body: fd });
        setMedia((m) => [...m, url]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function runAi() {
    setAiLoading(true);
    setAiError(null);
    try {
      const r = await api<{ variations: Partial<Record<PlatformId, string[]>> }>("/api/ai/variations", {
        method: "POST",
        body: { draft: content, platforms, count: 2, tone: tone || undefined },
      });
      setVariations(r.variations);
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  async function submit(action: Action) {
    setError(null);
    let scheduledAt: string | undefined;
    if (action === "schedule") {
      if (!scheduleAt) {
        setShowSchedule(true);
        setError("Pick a date and time");
        return;
      }
      const [d, t] = scheduleAt.split("T");
      const [y, mo, da] = d.split("-").map(Number);
      const [h, mi] = t.split(":").map(Number);
      scheduledAt = new Date(new TZDate(y, mo - 1, da, h, mi, timezone).getTime()).toISOString();
    }
    setBusy(action);
    try {
      const body = {
        content,
        media,
        action,
        scheduledAt,
        targets: selectedAccounts.map((a) => ({
          accountId: a.id,
          contentOverride: isPlatformId(a.platform) ? (overrides[a.platform] ?? null) : null,
        })),
      };
      const r = await api<{ post: PostDTO }>(post ? `/api/posts/${post.id}` : "/api/posts", {
        method: post ? "PUT" : "POST",
        body,
      });
      if (action === "now") {
        setResult(r.post);
        router.refresh();
      } else {
        router.push(action === "draft" ? "/app/queue?tab=drafts" : "/app/queue");
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!post || !confirm("Delete this post? This only removes it from the app.")) return;
    setBusy("delete");
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      router.push("/app/queue");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  if (result) return <PublishResult post={result} accounts={accounts} />;

  if (accounts.length === 0) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <p className="font-display text-3xl">Connect an account first</p>
        <p className="mt-2 text-ink-2">Pick where you want to post. You can connect as many networks as your plan allows.</p>
        <Link href="/app/accounts" className="btn-primary mt-6">Connect accounts</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{post ? "Edit post" : "New post"}</p>
          <h1 className="mt-1 flex items-center gap-3 font-display text-4xl leading-none sm:text-5xl">
            Compose {post && <StatusPill status={post.status} />}
          </h1>
        </div>
        {post && !readOnly && (
          <button onClick={remove} disabled={busy !== null} className="btn-ghost text-danger">
            <Trash className="size-4" /> Delete
          </button>
        )}
      </div>

      {readOnly && (
        <p className="mb-4 rounded-xl bg-moss/10 px-4 py-3 text-sm text-moss">This post has been published and can no longer be edited. Failed networks can be retried from Queue → Sent.</p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        {/* ---------------- Editor column ---------------- */}
        <div className="space-y-4">
          <section className="card p-5">
            <p className="label">Post to</p>
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => {
                const on = selected.has(a.id);
                return (
                  <button
                    key={a.id}
                    disabled={readOnly}
                    onClick={() => toggle(a.id)}
                    className={clsx(
                      "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition",
                      on ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 opacity-70 hover:opacity-100",
                    )}
                  >
                    <PlatformBadge platform={a.platform} size={22} />
                    <span className="max-w-[140px] truncate">{a.displayName || a.username}</span>
                    {on && <Check className="size-3.5 text-signal" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card overflow-hidden">
            {/* per-platform tabs */}
            <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-line px-3 pt-3">
              <Tab active={editing === "all"} onClick={() => setEditing("all")}>
                All networks
              </Tab>
              {platforms.map((p) => (
                <Tab key={p} active={editing === p} onClick={() => setEditing(p)}>
                  <PlatformBadge platform={p} size={16} />
                  {PLATFORMS[p].name}
                  {overrides[p] !== undefined && <span className="size-1.5 rounded-full bg-signal" title="Customized" />}
                </Tab>
              ))}
            </div>

            <div className="p-5">
              {editing !== "all" && (
                <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-paper-2 px-3 py-2 text-xs text-ink-2">
                  {overrides[editing] === undefined ? (
                    <>
                      Uses the shared text.
                      <button className="font-semibold text-ink underline underline-offset-2" onClick={() => setOverrides((o) => ({ ...o, [editing]: content }))}>
                        Customize for {PLATFORMS[editing].name}
                      </button>
                    </>
                  ) : (
                    <>
                      Custom text for {PLATFORMS[editing].name}.
                      <button
                        className="font-semibold text-ink underline underline-offset-2"
                        onClick={() =>
                          setOverrides((o) => {
                            const n = { ...o };
                            delete n[editing as PlatformId];
                            return n;
                          })
                        }
                      >
                        Reset to shared text
                      </button>
                    </>
                  )}
                </div>
              )}
              <textarea
                value={editorValue}
                onChange={(e) => setEditorValue(e.target.value)}
                readOnly={readOnly || (editing !== "all" && overrides[editing] === undefined)}
                placeholder="What do you want to share?"
                rows={9}
                className="w-full resize-y bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted"
              />

              {/* media */}
              {media.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {media.map((m) => (
                    <div key={m} className="group relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m} alt="" className="size-20 rounded-lg border border-line object-cover" />
                      {!readOnly && (
                        <button
                          aria-label="Remove image"
                          onClick={() => setMedia((x) => x.filter((y) => y !== m))}
                          className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink text-paper opacity-0 transition group-hover:opacity-100"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
                  <button disabled={readOnly || busy === "upload"} onClick={() => fileRef.current?.click()} className="btn-ghost px-3 py-1.5">
                    {busy === "upload" ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Image
                  </button>
                  <form
                    className="flex items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (/^https?:\/\//.test(urlInput)) {
                        setMedia((m) => [...m, urlInput]);
                        setUrlInput("");
                      }
                    }}
                  >
                    <input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={readOnly}
                      placeholder="or paste image URL"
                      className="input w-44 py-1.5 text-xs"
                    />
                  </form>
                  <button
                    disabled={readOnly || platforms.length === 0}
                    onClick={() => setAiOpen((v) => !v)}
                    className={clsx("btn-ghost px-3 py-1.5", aiOpen && "border-signal text-signal")}
                  >
                    <Sparkles className="size-4 text-signal" /> AI variations
                  </button>
                </div>
                <span className={clsx("font-mono text-xs", editorValue.length > editorLimit ? "text-danger" : "text-muted")}>
                  {editorValue.length}
                  {Number.isFinite(editorLimit) && ` / ${editorLimit}`}
                </span>
              </div>
            </div>
          </section>

          {aiOpen && (
            <section className="card border-signal/40 p-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-2xl">AI variations</p>
                  <p className="text-sm text-ink-2">
                    Turns your draft (or a rough idea) into versions tuned for {platforms.map((p) => PLATFORMS[p].name).join(", ")}.
                  </p>
                </div>
                <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Tone (optional): witty, expert…" className="input w-56" />
                <button onClick={runAi} disabled={!aiEnabled || aiLoading || content.trim().length < 3} className="btn-signal">
                  {aiLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {variations ? "Regenerate" : "Generate"}
                </button>
              </div>
              {!aiEnabled && <p className="mt-3 text-sm text-amber">Set OPENAI_API_KEY to enable AI features.</p>}
              {content.trim().length < 3 && aiEnabled && <p className="mt-3 text-sm text-muted">Write a draft or topic above first.</p>}
              {aiError && <p className="mt-3 text-sm text-danger">{aiError}</p>}
              {aiLoading && <p className="mt-4 animate-pulse font-mono text-xs text-muted">Writing variations for each network…</p>}
              {variations && !aiLoading && (
                <div className="mt-4 space-y-4">
                  {platforms.map((p) =>
                    variations[p]?.length ? (
                      <div key={p}>
                        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <PlatformBadge platform={p} size={18} /> {PLATFORMS[p].name}
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {variations[p]!.map((v, i) => (
                            <div key={i} className="flex flex-col rounded-xl border border-line bg-paper/60 p-3">
                              <p className="flex-1 text-sm whitespace-pre-wrap">{v}</p>
                              <div className="mt-3 flex items-center justify-between">
                                <span className="font-mono text-[10px] text-muted">{v.length} chars</span>
                                <div className="flex gap-1">
                                  <button
                                    className="btn-ghost px-2.5 py-1 text-xs"
                                    onClick={() => {
                                      setContent(v);
                                    }}
                                  >
                                    Use for all
                                  </button>
                                  <button
                                    className="btn-primary px-2.5 py-1 text-xs"
                                    onClick={() => {
                                      setOverrides((o) => ({ ...o, [p]: v }));
                                      setEditing(p);
                                      setPreviewTab(p);
                                    }}
                                  >
                                    Use for {PLATFORMS[p].name}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ---------------- Preview column ---------------- */}
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <p className="label !mb-0">Preview</p>
              <div className="flex gap-1">
                {platforms.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPreviewTab(p)}
                    className={clsx("rounded-full p-0.5 transition", activePreview === p ? "ring-2 ring-signal" : "opacity-50 hover:opacity-100")}
                    aria-label={`Preview ${PLATFORMS[p].name}`}
                  >
                    <PlatformBadge platform={p} size={24} />
                  </button>
                ))}
              </div>
            </div>
            <div className="rule-dots mt-4 rounded-xl bg-paper-2/50 p-4">
              {activePreview ? (
                (() => {
                  const acc = selectedAccounts.find((a) => a.platform === activePreview)!;
                  return (
                    <PostPreview
                      platform={activePreview}
                      text={textFor(activePreview)}
                      media={media}
                      name={acc.displayName || acc.username}
                      handle={acc.username}
                    />
                  );
                })()
              ) : (
                <p className="py-12 text-center text-sm text-muted">Select an account to preview</p>
              )}
            </div>
            {platforms.length > 0 && (
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {platforms.map((p) => {
                  const len = textFor(p).length;
                  const pct = Math.min(100, (len / PLATFORMS[p].charLimit) * 100);
                  return (
                    <li key={p} className="flex items-center gap-2 text-xs">
                      <PlatformBadge platform={p} size={14} />
                      <div className="h-1 flex-1 rounded-full bg-paper-2">
                        <div className={clsx("h-full rounded-full", pct >= 100 ? "bg-danger" : pct > 85 ? "bg-amber" : "bg-moss")} style={{ width: `${Math.max(2, pct)}%` }} />
                      </div>
                      <span className={clsx("w-16 text-right font-mono", len > PLATFORMS[p].charLimit ? "text-danger" : "text-muted")}>
                        {len}/{PLATFORMS[p].charLimit}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {!readOnly && (
            <section className="card p-5">
              {problems.length > 0 && (
                <ul className="mb-4 space-y-1 rounded-xl bg-amber/10 p-3 text-xs text-amber">
                  {problems.map((p) => (
                    <li key={p} className="flex items-center gap-1.5">
                      <TriangleAlert className="size-3.5" /> {p}
                    </li>
                  ))}
                </ul>
              )}

              {showSchedule && (
                <div className="mb-4">
                  <label className="label" htmlFor="when">Publish at ({timezone})</label>
                  <input id="when" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="input" />
                </div>
              )}

              {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}

              <div className="grid grid-cols-2 gap-2">
                <button disabled={busy !== null} onClick={() => submit("draft")} className="btn-ghost">
                  {busy === "draft" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Save draft
                </button>
                <button disabled={busy !== null || problems.length > 0} onClick={() => submit("queue")} className="btn-ghost">
                  {busy === "queue" ? <LoaderCircle className="size-4 animate-spin" /> : <ListOrdered className="size-4" />} Add to queue
                </button>
                <button
                  disabled={busy !== null || problems.length > 0}
                  onClick={() => (showSchedule ? submit("schedule") : setShowSchedule(true))}
                  className="btn-primary"
                >
                  {busy === "schedule" ? <LoaderCircle className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
                  {showSchedule ? "Schedule" : "Schedule…"}
                </button>
                <button disabled={busy !== null || problems.length > 0 || platforms.length === 0} onClick={() => submit("now")} className="btn-signal">
                  {busy === "now" ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />} Publish now
                </button>
              </div>
              {selectedAccounts.some((a) => a.isDemo) && (
                <p className="mt-3 font-mono text-[11px] text-muted">Demo accounts simulate publishing. Nothing is sent to the network.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition",
        active ? "border-signal font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function PublishResult({ post, accounts }: { post: PostDTO; accounts: AccountDTO[] }) {
  const ok = post.targets.filter((t) => t.status === "published").length;
  return (
    <div className="card mx-auto max-w-2xl p-8">
      <p className="eyebrow">Publish report</p>
      <h1 className="mt-2 font-display text-5xl leading-none">
        {ok === post.targets.length ? "Sent everywhere." : ok === 0 ? "That didn't go out." : "Partly sent."}
      </h1>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {post.targets.map((t) => {
          const acc = accounts.find((a) => a.id === t.accountId);
          return (
            <li key={t.id} className="flex items-start gap-3 py-3">
              <PlatformBadge platform={t.platform} size={26} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{acc?.displayName || t.username}</p>
                {t.error && <p className="mt-0.5 text-xs text-danger">{t.error}</p>}
                {acc?.isDemo && t.status === "published" && <p className="mt-0.5 text-xs text-muted">Simulated (demo account)</p>}
              </div>
              <StatusPill status={t.status} />
              {t.externalUrl && (
                <a href={t.externalUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-ink" aria-label="Open post">
                  <ExternalLink className="size-4" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        <a href="/app/compose" className="btn-primary">Compose another</a>
        {ok < post.targets.length && (
          <Link href={`/app/queue?tab=sent`} className="btn-ghost">Retry from Sent</Link>
        )}
        <Link href="/app/analytics" className="btn-ghost">Analytics</Link>
      </div>
    </div>
  );
}
