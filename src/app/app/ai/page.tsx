import { requireUser } from "@/lib/session";
import { listAccounts } from "@/lib/data";
import { aiConfigured } from "@/lib/ai";
import { PageHeader } from "@/components/page-header";
import { daysAgo, fmt } from "@/components/format";
import { WeekPlanner } from "./week-planner";

export const metadata = { title: "AI week planner" };

export default async function AiPage() {
  const user = await requireUser();
  const accounts = await listAccounts(user.id);
  const tomorrow = fmt(daysAgo(-1), "yyyy-MM-dd", user.timezone);
  return (
    <>
      <PageHeader
        eyebrow="AI"
        title={
          <>
            A week of posts, <em className="text-signal">from one topic.</em>
          </>
        }
        description="Describe what you want to talk about. You'll get seven days of varied posts (tips, stories, questions and a soft pitch) to edit, then save as drafts or schedule."
      />
      <WeekPlanner accounts={accounts} aiEnabled={aiConfigured()} defaultStart={tomorrow} timezone={user.timezone} />
    </>
  );
}
