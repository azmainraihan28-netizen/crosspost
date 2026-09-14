"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  CalendarDays,
  ChartColumn,
  CreditCard,
  LayoutDashboard,
  Link2,
  ListOrdered,
  LogOut,
  Menu,
  PenLine,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/compose", label: "Compose", icon: PenLine },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/queue", label: "Queue & drafts", icon: ListOrdered },
  { href: "/app/ai", label: "AI week planner", icon: Sparkles },
  { href: "/app/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/app/accounts", label: "Accounts", icon: Link2 },
  { href: "/app/billing", label: "Plan & billing", icon: CreditCard },
];

export function AppNav({ email, name, planName, isPro }: { email: string; name: string | null; planName: string; isPro: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const links = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
              active ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
            )}
          >
            <Icon className={clsx("size-4", active && "text-signal")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-3 border-t border-line pt-4">
      <div className="px-1">
        <p className="truncate text-sm font-medium">{name || email}</p>
        <p className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-muted">
          <span className={clsx("inline-block size-1.5 rounded-full", isPro ? "bg-signal" : "bg-muted")} />
          {planName} plan
        </p>
      </div>
      {!isPro && (
        <Link href="/app/billing" onClick={() => setOpen(false)} className="btn-signal w-full">
          Upgrade to Pro
        </Link>
      )}
      <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-paper-2 hover:text-ink">
        <LogOut className="size-4" /> Log out
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/app" />
        <div className="flex items-center gap-2">
          <Link href="/app/compose" className="btn-primary px-3 py-1.5">
            <PenLine className="size-4" /> New
          </Link>
          <button aria-label="Menu" onClick={() => setOpen(true)} className="btn-ghost px-2.5 py-1.5">
            <Menu className="size-4" />
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-paper p-4">
            <div className="flex items-center justify-between">
              <Logo href="/app" />
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="btn-ghost px-2.5 py-1.5">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1">{links}</div>
            {footer}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line bg-paper px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo href="/app" />
        </div>
        <Link href="/app/compose" className="btn-primary">
          <PenLine className="size-4" /> New post
        </Link>
        <div className="flex-1">{links}</div>
        {footer}
      </aside>
    </>
  );
}
