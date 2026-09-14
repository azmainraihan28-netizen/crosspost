import type { PlatformId } from "./meta";

export interface ConnectedProfile {
  externalId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  meta?: Record<string, string>;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/** Decrypted account data passed to adapters. */
export interface AccountCtx {
  externalId: string;
  accessToken: string;
  meta: Record<string, string>;
}

export interface PublishInput {
  text: string;
  /** Publicly reachable image URLs. */
  media: string[];
}

export interface PublishResult {
  id: string;
  url?: string;
}

export interface MetricsResult {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface PlatformAdapter {
  id: PlatformId;
  /** True when client id/secret env vars are present. Otherwise the platform runs in demo mode. */
  isConfigured(): boolean;
  usesPkce: boolean;
  authorizeUrl(p: { state: string; redirectUri: string; codeChallenge: string }): string;
  exchangeCode(p: { code: string; redirectUri: string; codeVerifier: string }): Promise<ConnectedProfile[]>;
  /** Refresh when expiresAt is near. Return null if the platform has no refresh flow. */
  refresh?(p: { refreshToken?: string; accessToken: string }): Promise<TokenSet | null>;
  publish(account: AccountCtx, input: PublishInput): Promise<PublishResult>;
  /** Null means the platform didn't expose metrics for this post (e.g. missing permission). */
  metrics(account: AccountCtx, postId: string): Promise<MetricsResult | null>;
}

export class PlatformError extends Error {
  constructor(
    public platform: PlatformId,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

/** fetch + JSON with platform-specific error surfacing. */
export async function fetchJson<T = unknown>(
  platform: PlatformId,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const text = await res.text();
  let body: unknown = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const b = body as Record<string, unknown> | undefined;
    const errObj = b?.error as Record<string, unknown> | string | undefined;
    const msg =
      (typeof errObj === "object" && (errObj?.message as string)) ||
      (typeof errObj === "string" && ((b?.error_description as string) || errObj)) ||
      (b?.detail as string) ||
      (b?.message as string) ||
      (typeof body === "string" ? body.slice(0, 200) : `HTTP ${res.status}`);
    throw new PlatformError(platform, String(msg), res.status);
  }
  return body as T;
}

export function form(data: Record<string, string>) {
  return new URLSearchParams(data);
}
