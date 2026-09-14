// Resolves database credentials. Accepts our names (DATABASE_URL / DATABASE_AUTH_TOKEN) and the names
// the Vercel Turso integration injects (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN). Trims whitespace/quotes.
const clean = (v) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();

export function dbEnv() {
  const url = clean(process.env.DATABASE_URL) || clean(process.env.TURSO_DATABASE_URL);
  const authToken = clean(process.env.DATABASE_AUTH_TOKEN) || clean(process.env.TURSO_AUTH_TOKEN);
  return { url, authToken: authToken || undefined };
}
