// Applies SQL migrations from ./drizzle with readable errors. Runs before every Vercel build.
import { config } from "dotenv";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { dbEnv } from "./db-env.mjs";

config({ path: ".env.local", quiet: true });

const { url, authToken } = dbEnv();

if (!url) {
  if (process.env.VERCEL) {
    console.error(
      "✖ No database configured. Set DATABASE_URL and DATABASE_AUTH_TOKEN (or TURSO_DATABASE_URL and TURSO_AUTH_TOKEN) " +
        "in Vercel → Settings → Environment Variables for this environment, then redeploy.",
    );
    process.exit(1);
  }
  console.log("No DATABASE_URL set; skipping migrations (local dev uses `npm run db:push`).");
  process.exit(0);
}

const target = url.startsWith("file:") ? url : new URL(url.replace(/^libsql:/, "https:")).host;
console.log(`→ Migrating ${target} (auth token: ${authToken ? "set" : "NOT set"})`);

const client = createClient({ url, authToken });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("✓ Migrations applied");
} catch (err) {
  const msg = [err?.message, err?.cause?.message].filter(Boolean).join(" | ");
  console.error(`✖ Migration failed: ${msg}`);
  if (/401|unauthori[sz]ed|token/i.test(msg)) console.error("  Hint: the auth token is missing, expired, or belongs to a different database.");
  if (/ENOTFOUND|404|not found|getaddrinfo/i.test(msg)) console.error("  Hint: check the database URL (libsql://<db>-<org>.turso.io).");
  if (/URL_INVALID|Invalid URL/i.test(msg)) console.error("  Hint: DATABASE_URL must look like libsql://<db>-<org>.turso.io");
  process.exit(1);
} finally {
  client.close();
}
