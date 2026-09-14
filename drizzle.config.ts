import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { dbEnv } from "./scripts/db-env.mjs";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const { url, authToken } = dbEnv();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: authToken ? { url: url || "file:local.db", authToken } : { url: url || "file:local.db" },
});
