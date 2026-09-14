"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { api } from "@/lib/fetcher";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
