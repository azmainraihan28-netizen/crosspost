import "server-only";
import { appUrl } from "./app-url";

// "Sign in with Google" via OpenID Connect (authorization code + PKCE).

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export const googleRedirectUri = () => `${appUrl()}/api/auth/google/callback`;

export function googleAuthorizeUrl(p: { state: string; codeChallenge: string }) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: p.state,
    code_challenge: p.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return u.toString();
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export async function googleExchange(code: string, codeVerifier: string): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const tokens = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error_description?: string; error?: string };
  if (!tokenRes.ok || !tokens.access_token) {
    throw new Error(tokens.error_description || tokens.error || `Google token exchange failed (${tokenRes.status})`);
  }

  // The userinfo endpoint is authoritative for the token we just received from Google over TLS.
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });
  const info = (await infoRes.json().catch(() => ({}))) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!infoRes.ok || !info.sub || !info.email) throw new Error("Couldn't read your Google profile");

  return { sub: info.sub, email: info.email.toLowerCase(), emailVerified: info.email_verified === true, name: info.name };
}
