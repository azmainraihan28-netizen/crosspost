import { requireUser } from "@/lib/session";
import { planOf } from "@/lib/plans";
import { AppNav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const plan = planOf(user);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <AppNav email={user.email} name={user.name} planName={plan.name} isPro={plan.name === "Pro"} />
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
