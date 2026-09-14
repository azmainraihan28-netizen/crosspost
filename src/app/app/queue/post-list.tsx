"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, ExternalLink, LoaderCircle, PenLine, RefreshCw, Trash, Undo2 } from "lucide-react";
import type { PostDTO } from "@/lib/data";
import { api } from "@/lib/fetcher";
import { EmptyState, StatusPill } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import { fmt } from "@/components/format";

export function PostList({ kind, posts, timezone }: { kind: "queue" | "drafts" | "sent"; posts: PostDTO[]; timezone: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!posts.length) {
    const copy = {
      queue: ["Your queue is empty", "Posts you schedule or add to the queue show up here in the order they'll go out."],
      drafts: ["No drafts", "Save a post as a draft to finish it later, or generate a week of drafts with AI."],
      sent: ["Nothing sent yet", "Published posts and their per-network results will appear here."],
    }[kind];
    return (
      <EmptyState
        title={copy[0]}
        body={copy[1]}
        action={
          <div className="flex justify-center gap-2">
            <Link href="/app/compose" className="btn-primary">Compose</Link>
            {kind === "drafts" && <Link href="/app/ai" className="btn-ghost">AI week planner</Link>}
          </div>
        }
      />
    );
  }

  // Group the queue by day for a timeline feel.
  const rows = posts.map((p, i) => {
    const when = kind === "sent" ? (p.publishedAt ?? p.createdAt) : kind === "queue" ? p.scheduledAt : p.createdAt;
    const day = kind === "queue" ? fmt(when, "EEEE, MMM d", timezone) : "";
    const prevDay = i > 0 && kind === "queue" ? fmt(posts[i - 1].scheduledAt, "EEEE, MMM d", timezone) : "";
    return { p, when, header: day !== prevDay ? day : "" };
  });

  return (
    <div>
      {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <ul className="space-y-3">
        {rows.map(({ p, when, header }) => {
          return (
            <li key={p.id}>
              {header && <p className="eyebrow mt-6 mb-2 first:mt-0">{header}</p>}
              <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                {kind === "queue" && (
                  <div className="shrink-0 sm:w-20">
                    <p className="font-display text-2xl leading-none">{fmt(when, "h:mm", timezone)}</p>
                    <p className="font-mono text-[10px] text-muted uppercase">{fmt(when, "a", timezone)}</p>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <p className="line-clamp-3 flex-1 text-sm whitespace-pre-wrap">{p.content || <em className="text-muted">No text</em>}</p>
                    {p.media[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.media[0]} alt="" className="size-14 shrink-0 rounded-lg border border-line object-cover" />
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusPill status={p.status} />
                    {kind !== "queue" && <span className="font-mono text-[11px] text-muted">{fmt(when, "MMM d, h:mm a", timezone)}</span>}
                    <span className="flex flex-wrap gap-1.5">
                      {p.targets.map((t) => (
                        <span
                          key={t.id}
                          title={t.error ?? `${t.platform} · ${t.status}`}
                          className={`inline-flex items-center gap-1 rounded-full border py-0.5 pr-2 pl-0.5 text-[11px] ${
                            t.status === "failed" ? "border-danger/40 text-danger" : "border-line text-ink-2"
                          }`}
                        >
                          <PlatformBadge platform={t.platform} size={16} />
                          {t.username}
                          {t.externalUrl && (
                            <a href={t.externalUrl} target="_blank" rel="noreferrer" aria-label="Open post">
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </span>
                      ))}
                      {p.targets.length === 0 && <span className="text-[11px] text-muted">No accounts selected</span>}
                    </span>
                  </div>
                  {kind === "sent" && p.targets.some((t) => t.error) && (
                    <ul className="mt-2 space-y-0.5">
                      {p.targets
                        .filter((t) => t.error)
                        .map((t) => (
                          <li key={t.id} className="text-xs text-danger">
                            {t.platform}: {t.error}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {busy === p.id ? (
                    <LoaderCircle className="m-2 size-4 animate-spin text-muted" />
                  ) : (
                    <>
                      {kind !== "sent" && (
                        <Link href={`/app/compose?id=${p.id}`} className="btn-ghost px-2.5 py-1.5" aria-label="Edit">
                          <PenLine className="size-4" />
                        </Link>
                      )}
                      {kind === "drafts" && (
                        <Link href={`/app/compose?id=${p.id}`} className="btn-ghost px-2.5 py-1.5" aria-label="Schedule">
                          <CalendarClock className="size-4" />
                        </Link>
                      )}
                      {kind === "queue" && p.status === "scheduled" && (
                        <button
                          onClick={() => act(p.id, () => api(`/api/posts/${p.id}`, { method: "PATCH", body: { action: "unschedule" } }))}
                          className="btn-ghost px-2.5 py-1.5"
                          title="Move to drafts"
                        >
                          <Undo2 className="size-4" />
                        </button>
                      )}
                      {kind === "sent" && ["failed", "partial"].includes(p.status) && (
                        <button
                          onClick={() => act(p.id, () => api(`/api/posts/${p.id}`, { method: "PATCH", body: { action: "retry" } }))}
                          className="btn-ghost px-2.5 py-1.5"
                        >
                          <RefreshCw className="size-4" /> Retry failed
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Delete this post from the app? Already-published posts stay on the networks.")) {
                            act(p.id, () => api(`/api/posts/${p.id}`, { method: "DELETE" }));
                          }
                        }}
                        className="btn-ghost px-2.5 py-1.5 text-danger"
                        aria-label="Delete"
                      >
                        <Trash className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
