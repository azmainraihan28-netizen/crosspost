// Resolves database credentials. Accepts our names (DATABASE_URL / DATABASE_AUTH_TOKEN) and the names
// the Vercel Turso integration injects (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN). Trims whitespace/quotes.
// When both sets exist, the build (scripts/migrate.mjs) records which env var NAMES actually work in
// db-choice.generated.mjs, so runtime uses the same pair. No secret values are ever written to disk.
import { choice } from "./db-choice.generated.mjs";

export const clean = (v) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();

export const URL_VARS = ["DATABASE_URL", "TURSO_DATABASE_URL"];
export const TOKEN_VARS = ["DATABASE_AUTH_TOKEN", "TURSO_AUTH_TOKEN"];

export function dbEnv() {
  if (choice && clean(process.env[choice.urlVar])) {
    return { url: clean(process.env[choice.urlVar]), authToken: clean(process.env[choice.tokenVar]) || undefined };
  }
  const url = clean(process.env.DATABASE_URL) || clean(process.env.TURSO_DATABASE_URL);
  const authToken = clean(process.env.DATABASE_AUTH_TOKEN) || clean(process.env.TURSO_AUTH_TOKEN);
  return { url, authToken: authToken || undefined };
}
