import { sql } from "drizzle-orm";
import { db } from "@/db";
import { appUrl } from "@/lib/app-url";
import { choice } from "../../../../scripts/db-choice.generated.mjs";
import { configuredMap, demoAllowed } from "@/lib/platforms";

export const dynamic = "force-dynamic";

const shape = (v: string | undefined, prefixes: string[]) => {
  const s = v?.trim();
  if (!s) return "missing";
  const hit = prefixes.find((p) => s.startsWith(p));
  if (s.includes("...")) return "placeholder";
  return hit ? `ok (${hit}…)` : "set (unexpected format)";
};

// Operational config check. Reports presence/format only, never secret values. Requires Bearer CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let database = "ok";
  try {
    await db.run(sql`select 1`);
  } catch (err) {
    database = `error: ${(err as Error).message.slice(0, 120)}`;
  }

  return Response.json({
    appUrl: appUrl(),
    appUrlSource: process.env.APP_URL?.trim() ? "APP_URL" : process.env.VERCEL_PROJECT_PRODUCTION_URL ? "vercel" : "default",
    database,
    databasePair: choice ?? "default order",
    demoMode: demoAllowed(),
    internalScheduler: process.env.INTERNAL_SCHEDULER !== "false",
    authSecret: (process.env.AUTH_SECRET?.length ?? 0) >= 32 ? "ok" : "missing or short",
    encryptionKey: process.env.ENCRYPTION_KEY?.trim() ? "set" : "falls back to AUTH_SECRET",
    anthropicKey: shape(process.env.ANTHROPIC_API_KEY, ["sk-ant-"]),
    anthropicModel: process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5 (default)",
    stripeSecretKey: shape(process.env.STRIPE_SECRET_KEY, ["sk_test_", "sk_live_", "rk_test_", "rk_live_"]),
    stripeWebhookSecret: shape(process.env.STRIPE_WEBHOOK_SECRET, ["whsec_"]),
    stripePriceId: shape(process.env.STRIPE_PRICE_ID, ["price_"]),
    blobToken: shape(process.env.BLOB_READ_WRITE_TOKEN, ["vercel_blob_rw_"]),
    oauthConfigured: configuredMap(),
  });
}
