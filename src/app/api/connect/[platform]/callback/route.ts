import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, socialAccounts } from "@/db";
import { getUser } from "@/lib/session";
import { adapters, isPlatformId, PLATFORMS, type ConnectedProfile } from "@/lib/platforms";
import { encrypt } from "@/lib/crypto";
import { appUrl } from "@/lib/billing";

export async function GET(req: Request, ctx: RouteContext<"/api/connect/[platform]/callback">) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { platform } = await ctx.params;
  if (!isPlatformId(platform)) redirect("/app/accounts?error=Unknown+platform");

  const url = new URL(req.url);
  const fail = (msg: string) => redirect(`/app/accounts?error=${encodeURIComponent(msg)}`);

  const jar = await cookies();
  const raw = jar.get(`oauth_${platform}`)?.value;
  jar.delete({ name: `oauth_${platform}`, path: "/api/connect" });

  if (url.searchParams.get("error")) {
    fail(url.searchParams.get("error_description") ?? `${PLATFORMS[platform].name} authorization was cancelled`);
  }
  const code = url.searchParams.get("code");
  const saved = raw ? (JSON.parse(raw) as { state: string; verifier: string }) : null;
  if (!code || !saved || saved.state !== url.searchParams.get("state")) {
    fail("Authorization expired or state mismatch. Please try again.");
  }

  let profiles: ConnectedProfile[] = [];
  try {
    profiles = await adapters[platform].exchangeCode({
      // Instagram appends "#_" to the code.
      code: code!.replace(/#_$/, ""),
      redirectUri: `${appUrl()}/api/connect/${platform}/callback`,
      codeVerifier: saved!.verifier,
    });
  } catch (err) {
    console.error(`[connect:${platform}]`, err);
    fail(`Couldn't connect ${PLATFORMS[platform].name}: ${(err as Error).message}`);
  }

  for (const p of profiles) {
    const values = {
      username: p.username,
      displayName: p.displayName ?? null,
      avatarUrl: p.avatarUrl ?? null,
      accessToken: encrypt(p.accessToken),
      refreshToken: p.refreshToken ? encrypt(p.refreshToken) : null,
      expiresAt: p.expiresAt ?? null,
      meta: p.meta ?? null,
      isDemo: false,
    };
    await db
      .insert(socialAccounts)
      .values({ userId: user.id, platform, externalId: p.externalId, ...values })
      .onConflictDoUpdate({
        target: [socialAccounts.userId, socialAccounts.platform, socialAccounts.externalId],
        set: values,
      });
  }
  redirect(`/app/accounts?connected=${platform}`);
}
