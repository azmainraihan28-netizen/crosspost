// Runs the scheduler inside the Node server when there's a long-lived process (local dev, `next start`,
// Railway/Render/Fly). On serverless hosts set INTERNAL_SCHEDULER=false and call /api/cron/publish instead.
export async function register() {
  // This exact conditional-import form lets the bundler drop Node-only code from the edge build.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./scheduler-node");
  }
}
