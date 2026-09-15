import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { route } from "@/lib/api";
import { createSession, HttpError } from "@/lib/session";
import { credentialsSchema } from "@/lib/validation";

// Constant-time-ish path for unknown emails so response timing doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 11);

export const POST = route(async (req) => {
  const input = credentialsSchema.parse(await req.json());
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  const ok = await bcrypt.compare(input.password, user?.passwordHash || DUMMY_HASH);
  if (user && !user.passwordHash && user.googleId) {
    throw new HttpError(401, "This account uses Google sign-in. Click “Continue with Google”.");
  }
  if (!user || !ok) throw new HttpError(401, "Incorrect email or password");
  await createSession(user.id);
  return Response.json({ ok: true });
});
