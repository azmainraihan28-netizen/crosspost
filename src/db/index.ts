import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { dbEnv } from "../../scripts/db-env.mjs";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { libsql?: ReturnType<typeof createClient> };

function makeClient() {
  const { url, authToken } = dbEnv();
  if (!url && process.env.VERCEL) {
    throw new Error("DATABASE_URL (or TURSO_DATABASE_URL) is not set in Vercel environment variables");
  }
  return createClient({ url: url || "file:local.db", authToken });
}

const client = globalForDb.libsql ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForDb.libsql = client;

export const db = drizzle(client, { schema });
export * from "./schema";
