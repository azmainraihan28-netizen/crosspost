import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { route } from "@/lib/api";
import { createSession, HttpError } from "@/lib/session";
import { signupSchema } from "@/lib/validation";

export const POST = route(async (req) => {
  const input = signupSchema.parse(await req.json());
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email));
  if (existing) throw new HttpError(409, "An account with this email already exists");

  let timezone = "UTC";
  try {
    if (input.timezone) {
      Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
      timezone = input.timezone;
    }
  } catch {}

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name || null,
      passwordHash: await bcrypt.hash(input.password, 11),
      timezone,
    })
    .returning({ id: users.id });
  await createSession(user.id);
  return Response.json({ ok: true });
});
