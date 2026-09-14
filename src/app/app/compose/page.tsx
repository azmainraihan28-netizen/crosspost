import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listAccounts, listPosts } from "@/lib/data";
import { aiConfigured } from "@/lib/ai";
import { Composer } from "./composer";

export const metadata = { title: "Compose" };

export default async function ComposePage({ searchParams }: PageProps<"/app/compose">) {
  const user = await requireUser();
  const { id, date } = await searchParams;
  const accounts = await listAccounts(user.id);

  let post = null;
  if (typeof id === "string") {
    [post = null] = await listPosts(user.id, { id });
    if (!post) notFound();
  }

  return (
    <Composer
      key={post?.id ?? "new"}
      accounts={accounts}
      post={post}
      timezone={user.timezone}
      aiEnabled={aiConfigured()}
      initialDate={typeof date === "string" ? date : undefined}
    />
  );
}
