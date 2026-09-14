"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { api } from "@/lib/fetcher";

export function BillingButton({ kind }: { kind: "checkout" | "portal" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const { url } = await api<{ url: string }>(`/api/billing/${kind}`, { method: "POST" });
            window.location.href = url;
          } catch (e) {
            setError((e as Error).message);
            setLoading(false);
          }
        }}
        className={kind === "checkout" ? "btn-signal w-full py-3 text-base" : "btn-ghost"}
      >
        {loading && <LoaderCircle className="size-4 animate-spin" />}
        {kind === "checkout" ? "Upgrade to Pro" : "Manage subscription & invoices"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
