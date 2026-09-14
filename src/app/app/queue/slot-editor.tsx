"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";
import { api } from "@/lib/fetcher";
import { fmt } from "@/components/format";

type Slot = { dayOfWeek: number; minuteOfDay: number };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function label(min: number) {
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, "0");
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? "AM" : "PM"}`;
}

export function SlotEditor({ initialSlots, timezone, next }: { initialSlots: Slot[]; timezone: string; next: string[] }) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [tz, setTz] = useState(timezone);
  const [time, setTime] = useState("10:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const zones = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("timeZone");
    } catch {
      return [timezone];
    }
  }, [timezone]);

  function add() {
    const [h, m] = time.split(":").map(Number);
    const minuteOfDay = h * 60 + m;
    setSlots((s) => {
      const merged = [...s];
      for (const d of days) if (!merged.some((x) => x.dayOfWeek === d && x.minuteOfDay === minuteOfDay)) merged.push({ dayOfWeek: d, minuteOfDay });
      return merged;
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/queue", { method: "PUT", body: { slots, timezone: tz } });
      setMsg({ ok: true, text: "Posting times saved" });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section className="card p-6">
        <h2 className="font-display text-2xl">Weekly posting times</h2>
        <p className="mt-1 text-sm text-ink-2">
          “Add to queue” puts a post into the next open time below. Each time holds one post.
        </p>

        <div className="mt-5 grid grid-cols-7 gap-2">
          {DAYS.map((d, i) => (
            <div key={d}>
              <p className="mb-2 text-center font-mono text-[10px] tracking-widest text-muted uppercase">{d}</p>
              <ul className="space-y-1.5">
                {slots
                  .filter((s) => s.dayOfWeek === i)
                  .sort((a, b) => a.minuteOfDay - b.minuteOfDay)
                  .map((s) => (
                    <li key={s.minuteOfDay} className="group relative rounded-lg border border-line bg-paper px-1 py-1.5 text-center font-mono text-[10px] sm:text-[11px]">
                      {label(s.minuteOfDay)}
                      <button
                        aria-label="Remove time"
                        onClick={() => setSlots((x) => x.filter((y) => !(y.dayOfWeek === i && y.minuteOfDay === s.minuteOfDay)))}
                        className="absolute -top-1.5 -right-1.5 hidden size-4 place-items-center rounded-full bg-ink text-paper group-hover:grid"
                      >
                        <X className="size-2.5" />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-line pt-5">
          <div>
            <label className="label" htmlFor="slot-time">Time</label>
            <input id="slot-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input w-32" />
          </div>
          <div>
            <p className="label">Days</p>
            <div className="flex gap-1">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setDays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))}
                  className={`size-8 rounded-full text-xs ${days.includes(i) ? "bg-ink text-paper" : "border border-line bg-card text-muted"}`}
                >
                  {d[0]}
                </button>
              ))}
            </div>
          </div>
          <button onClick={add} className="btn-ghost">
            <Plus className="size-4" /> Add time
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-56">
            <label className="label" htmlFor="tz">Timezone</label>
            <select id="tz" value={tz} onChange={(e) => setTz(e.target.value)} className="input">
              {zones.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            {msg && <span className={`text-sm ${msg.ok ? "text-moss" : "text-danger"}`}>{msg.text}</span>}
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving && <LoaderCircle className="size-4 animate-spin" />} Save times
            </button>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Next open slots</h2>
        {next.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No open slots. Add some posting times.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {next.map((n, i) => (
              <li key={n} className="flex items-center gap-3 text-sm">
                <span className="grid size-6 place-items-center rounded-full bg-paper-2 font-mono text-[10px]">{i + 1}</span>
                {fmt(n, "EEE, MMM d · h:mm a", timezone)}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
