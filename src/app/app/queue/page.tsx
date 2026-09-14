import Link from "next/link";
import clsx from "clsx";
import { PenLine } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listPosts } from "@/lib/data";
import { getSlots, nextFreeSlots } from "@/lib/queue";
import { PageHeader } from "@/components/page-header";
import { PostList } from "./post-list";
import { SlotEditor } from "./slot-editor";

export const metadata = { title: "Queue & drafts" };

const TABS = [
  { id: "queue", label: "Queue" },
  { id: "drafts", label: "Drafts" },
  { id: "sent", label: "Sent" },
  { id: "times", label: "Posting times" },
] as const;

export default async function QueuePage({ searchParams }: PageProps<"/app/queue">) {
  const user = await requireUser();
  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.id === rawTab)?.id ?? "queue";

  const [queued, drafts, sent] = await Promise.all([
    listPosts(user.id, { statuses: ["scheduled", "publishing"], order: "scheduled" }),
    listPosts(user.id, { statuses: ["draft"] }),
    listPosts(user.id, { statuses: ["published", "partial", "failed"], limit: 100 }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Pipeline"
        title="Queue & drafts"
        actions={
          <Link href="/app/compose" className="btn-primary">
            <PenLine className="size-4" /> New post
          </Link>
        }
      />
      <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const count = t.id === "queue" ? queued.length : t.id === "drafts" ? drafts.length : t.id === "sent" ? sent.length : null;
          return (
            <Link
              key={t.id}
              href={`/app/queue?tab=${t.id}`}
              className={clsx(
                "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm whitespace-nowrap",
                tab === t.id ? "border-signal font-semibold" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {t.label}
              {count !== null && <span className="rounded-full bg-paper-2 px-1.5 font-mono text-[10px] text-ink-2">{count}</span>}
            </Link>
          );
        })}
      </div>

      {tab === "queue" && <PostList kind="queue" posts={queued} timezone={user.timezone} />}
      {tab === "drafts" && <PostList kind="drafts" posts={drafts} timezone={user.timezone} />}
      {tab === "sent" && <PostList kind="sent" posts={sent} timezone={user.timezone} />}
      {tab === "times" && (
        <SlotEditor
          initialSlots={await getSlots(user.id)}
          timezone={user.timezone}
          next={(await nextFreeSlots(user.id, user.timezone, 5).catch(() => [])).map((d) => d.toISOString())}
        />
      )}
    </>
  );
}
