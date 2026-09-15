import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomToken, sha256base64url } from "@/lib/crypto";
import { googleAuthorizeUrl, googleConfigured } from "@/lib/google-auth";

// Starts "Continue with Google". Carries the post-login destination and browser timezone through a short-lived cookie.
export async function GET(req: Request) {
  if (!googleConfigured()) redirect("/login?error=Google+sign-in+is+not+configured");

  const url = new URL(req.url);
  const next = url.searchParams.get("next");
  const tz = url.searchParams.get("tz");
  const state = randomToken(24);
  const verifier = randomToken(48);

  (await cookies()).set(
    "oauth_google",
    JSON.stringify({
      state,
      verifier,
      next: next?.startsWith("/app") ? next : null,
      plan: url.searchParams.get("plan") === "pro" ? "pro" : null,
      tz: tz && tz.length <= 64 ? tz : null,
    }),
    { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 600 },
  );

  redirect(googleAuthorizeUrl({ state, codeChallenge: sha256base64url(verifier) }));
}
