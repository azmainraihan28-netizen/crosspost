// Creates .env.local from .env.example with freshly generated secrets (only if it doesn't exist yet).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const target = ".env.local";
if (existsSync(target)) {
  console.log(`${target} already exists, leaving it untouched.`);
  process.exit(0);
}

const secret = () => randomBytes(32).toString("base64url");
const env = readFileSync(".env.example", "utf8")
  .replace(/^AUTH_SECRET=$/m, `AUTH_SECRET=${secret()}`)
  .replace(/^ENCRYPTION_KEY=$/m, `ENCRYPTION_KEY=${secret()}`)
  .replace(/^CRON_SECRET=$/m, `CRON_SECRET=${secret()}`)
  .replace(/^STRIPE_SECRET_KEY=sk_test_\.\.\.$/m, "STRIPE_SECRET_KEY=")
  .replace(/^STRIPE_WEBHOOK_SECRET=whsec_\.\.\.$/m, "STRIPE_WEBHOOK_SECRET=");

writeFileSync(target, env);
console.log(`Created ${target} with generated AUTH_SECRET, ENCRYPTION_KEY and CRON_SECRET.`);
