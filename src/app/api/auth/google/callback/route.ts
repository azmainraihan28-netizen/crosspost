import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { createSession } from "@/lib/session";
import { googleConfigured, googleExchange, type GoogleProfile } from "@/lib/google-auth";

type Saved = { state: string; verifier: string; next: string | null; plan: string | null; tz: string | null };

function validTimezone(tz: string | null) {
  if (!tz) return "UTC";
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = (msg: string) => redirect(`/login?error=${encodeURIComponent(msg)}`);
  if (!googleConfigured()) fail("Google sign-in is not configured");

  const jar = await cookies();
  const raw = jar.get("oauth_google")?.value;
  jar.delete({ name: "oauth_google", path: "/api/auth/google" });

  if (url.searchParams.get("error")) fail("Google sign-in was cancelled");
  const saved = raw ? (JSON.parse(raw) as Saved) : null;
  const code = url.searchParams.get("code");
  if (!code || !saved || saved.state !== url.searchParams.get("state")) fail("Sign-in expired. Please try again.");

  let profile: GoogleProfile | null = null;
  try {
    profile = await googleExchange(code!, saved!.verifier);
  } catch (err) {
    console.error("[auth:google]", err);
    fail(`Google sign-in failed: ${(err as Error).message}`);
  }
  if (!profile!.emailVerified) fail("Your Google email address isn't verified");

  // Existing Google-linked user → sign in. Same verified email → link Google. Otherwise create an account.
  let [user] = await db.select({ id: users.id }).from(users).where(eq(users.googleId, profile!.sub)).limit(1);
  let isNew = false;
  if (!user) {
    const [byEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, profile!.email)).limit(1);
    if (byEmail) {
      await db.update(users).set({ googleId: profile!.sub }).where(eq(users.id, byEmail.id));
      user = byEmail;
    } else {
      [user] = await db
        .insert(users)
        .values({
          email: profile!.email,
          name: profile!.name ?? null,
          passwordHash: "",
          googleId: profile!.sub,
          timezone: validTimezone(saved!.tz),
        })
        .returning({ id: users.id });
      isNew = true;
    }
  }

  await createSession(user.id);
  redirect(saved!.plan === "pro" ? "/app/billing" : (saved!.next ?? (isNew ? "/app/accounts?welcome=1" : "/app")));
}
