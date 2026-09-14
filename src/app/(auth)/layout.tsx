import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { PlatformBadge } from "@/components/platform-badge";
import { PLATFORM_IDS } from "@/lib/platforms/meta";
import { getUser } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getUser()) redirect("/app");
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
      </div>
      <aside className="relative hidden overflow-hidden bg-ink text-paper lg:block">
        <div className="absolute -top-40 -right-40 size-[520px] rounded-full border-[60px] border-signal/90" />
        <div className="absolute right-20 bottom-24 size-40 rounded-full bg-signal/15" />
        <div className="relative flex h-full flex-col justify-end p-14">
          <div className="mb-8 flex gap-2">
            {PLATFORM_IDS.map((id) => (
              <PlatformBadge key={id} platform={id} size={34} className="ring-2 ring-ink" />
            ))}
          </div>
          <p className="max-w-md font-display text-5xl leading-[0.95]">
            One draft. Five audiences. <em className="text-signal">Zero copy-paste.</em>
          </p>
        </div>
      </aside>
    </div>
  );
}
