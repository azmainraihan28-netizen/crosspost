"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { api } from "@/lib/fetcher";

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/account", { method: "DELETE", body: { password } });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <section className="card mt-6 border-danger/30 p-6">
      <h2 className="flex items-center gap-2 font-display text-2xl">
        <TriangleAlert className="size-5 text-danger" /> Delete account
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-2">
        Permanently deletes your account, connected accounts and their tokens, posts, drafts, uploaded images and analytics, and
        cancels any active subscription. Posts already published stay on the social networks. This can&apos;t be undone.
      </p>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-ghost mt-4 text-danger">
          Delete my account…
        </button>
      ) : (
        <form onSubmit={remove} className="mt-4 grid max-w-md gap-3">
          <div>
            <label className="label" htmlFor="del-pass">Current password</label>
            <input id="del-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete="current-password" />
          </div>
          <div>
            <label className="label" htmlFor="del-confirm">Type DELETE to confirm</label>
            <input id="del-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="input" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button disabled={loading || confirmText !== "DELETE" || !password} className="btn bg-danger text-white hover:bg-danger/90">
              {loading && <LoaderCircle className="size-4 animate-spin" />} Permanently delete
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
