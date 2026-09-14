import "server-only";
import type { PlatformId } from "./meta";
import type { PlatformAdapter } from "./types";
import { x } from "./x";
import { linkedin } from "./linkedin";
import { instagram, facebook, threads } from "./meta-graph";

export const adapters: Record<PlatformId, PlatformAdapter> = { x, linkedin, instagram, facebook, threads };

export function configuredMap(): Record<PlatformId, boolean> {
  return Object.fromEntries(Object.values(adapters).map((a) => [a.id, a.isConfigured()])) as Record<
    PlatformId,
    boolean
  >;
}

/** Demo mode lets people try the product without registering developer apps. Disabled if DEMO_MODE=false. */
export function demoAllowed() {
  return process.env.DEMO_MODE !== "false";
}

export * from "./meta";
export * from "./types";
