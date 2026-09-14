"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/fetcher";

export function SyncButton({ autoSync }: { autoSync: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didAuto = useRef(false);

  async function sync() {
    setLoading(true);
    setError(null);
    try {
      await api("/api/analytics/sync", { method: "POST" });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoSync && !didAuto.current) {
      didAuto.current = true;
      sync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync]);

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <button onClick={sync} disabled={loading} className="btn-primary">
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Sync now
      </button>
    </div>
  );
}
