"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { api } from "@/lib/fetcher";

export function AuthForm({ mode, googleEnabled }: { mode: "login" | "signup"; googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("error"));
  const [loading, setLoading] = useState(false);

  const googleParams = new URLSearchParams();
  if (params.get("next")) googleParams.set("next", params.get("next")!);
  if (params.get("plan")) googleParams.set("plan", params.get("plan")!);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api(`/api/auth/${mode}`, {
        method: "POST",
        body: {
          email: fd.get("email"),
          password: fd.get("password"),
          ...(mode === "signup" && {
            name: fd.get("name") || undefined,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        },
      });
      const next = params.get("next");
      const dest =
        params.get("plan") === "pro" ? "/app/billing" : next?.startsWith("/app") ? next : mode === "signup" ? "/app/accounts?welcome=1" : "/app";
      router.replace(dest);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {googleEnabled && (
        <>
          <a
            href={`/api/auth/google?${googleParams}`}
            onClick={(e) => {
              // Pass the browser timezone so new Google accounts schedule in local time.
              const u = new URL(e.currentTarget.href);
              u.searchParams.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone);
              e.currentTarget.href = u.toString();
            }}
            className="btn-ghost w-full py-3"
          >
            <GoogleIcon /> Continue with Google
          </a>
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest text-muted uppercase">
            <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" className="input py-2.5" autoComplete="name" placeholder="Ada Lovelace" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input py-2.5" autoComplete="email" placeholder="you@company.com" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="input py-2.5"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
        />
      </div>
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
      <button disabled={loading} className="btn-primary w-full py-3">
        {loading && <LoaderCircle className="size-4 animate-spin" />}
        {mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>No account? <Link className="font-medium text-ink underline underline-offset-4" href="/signup">Sign up free</Link></>
        ) : (
          <>Already have an account? <Link className="font-medium text-ink underline underline-offset-4" href="/login">Log in</Link></>
        )}
      </p>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
