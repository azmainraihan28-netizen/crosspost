import { publishDuePosts } from "./lib/publisher";

const g = globalThis as unknown as { __schedulerStarted?: boolean };

if (process.env.INTERNAL_SCHEDULER !== "false" && !g.__schedulerStarted) {
  g.__schedulerStarted = true;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const n = await publishDuePosts();
      if (n) console.log(`[scheduler] published ${n} due post(s)`);
    } catch (err) {
      console.error("[scheduler]", err);
    } finally {
      running = false;
    }
  };
  setInterval(tick, 30_000);
  setTimeout(tick, 5_000);
  console.log("[scheduler] internal scheduler started (every 30s)");
}
