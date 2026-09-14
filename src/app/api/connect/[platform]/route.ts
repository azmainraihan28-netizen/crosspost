import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, socialAccounts } from "@/db";
import { getUser } from "@/lib/session";
import { adapters, demoAllowed, isPlatformId, PLATFORMS } from "@/lib/platforms";
import { encrypt, randomToken, sha256base64url } from "@/lib/crypto";
import { appUrl } from "@/lib/billing";
import { assertLimit } from "@/lib/plans";

// Starts the OAuth flow. If the platform has no credentials configured, creates a demo account instead.
export async function GET(_req: Request, ctx: RouteContext<"/api/connect/[platform]">) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { platform } = await ctx.params;
  if (!isPlatformId(platform)) redirect("/app/accounts?error=Unknown+platform");

  try {
    await assertLimit(user, "accounts");
  } catch (e) {
    redirect(`/app/accounts?error=${encodeURIComponent((e as Error).message)}`);
  }

  const adapter = adapters[platform];
  if (!adapter.isConfigured()) {
    if (!demoAllowed()) redirect(`/app/accounts?error=${encodeURIComponent(`${PLATFORMS[platform].name} is not configured`)}`);
    const n = Math.floor(Math.random() * 9000 + 1000);
    await db
      .insert(socialAccounts)
      .values({
        userId: user.id,
        platform,
        externalId: `demo-${platform}-${n}`,
        username: `demo_${platform}_${n}`,
        displayName: `${PLATFORMS[platform].name} Demo`,
        accessToken: encrypt("demo"),
        isDemo: true,
      })
      .onConflictDoNothing();
    redirect(`/app/accounts?connected=${platform}&demo=1`);
  }

  const state = randomToken(24);
  const verifier = randomToken(48);
  const redirectUri = `${appUrl()}/api/connect/${platform}/callback`;
  (await cookies()).set(`oauth_${platform}`, JSON.stringify({ state, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/connect",
    maxAge: 600,
  });
  redirect(adapter.authorizeUrl({ state, redirectUri, codeChallenge: sha256base64url(verifier) }));
}
