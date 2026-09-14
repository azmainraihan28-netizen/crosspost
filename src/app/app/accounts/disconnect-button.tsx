"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { api } from "@/lib/fetcher";

export function DisconnectButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      aria-label="Disconnect"
      title="Disconnect"
      disabled={loading}
      onClick={async () => {
        if (!confirm("Disconnect this account? Scheduled posts to it will be removed from those posts.")) return;
        setLoading(true);
        try {
          await api(`/api/accounts/${id}`, { method: "DELETE" });
          router.refresh();
        } catch (e) {
          alert((e as Error).message);
          setLoading(false);
        }
      }}
      className="grid size-7 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
    >
      {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
    </button>
  );
}
