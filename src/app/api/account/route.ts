import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { del } from "@vercel/blob";
import { db, posts, users } from "@/db";
import { route } from "@/lib/api";
import { apiUser, deleteSession, HttpError } from "@/lib/session";
import { billingConfigured, getStripe } from "@/lib/billing";

/** Permanently deletes the signed-in user's account and all their data. Requires the current password. */
export const DELETE = route(async (req) => {
  const user = await apiUser();
  const { password } = z.object({ password: z.string().min(1, "Enter your password") }).parse(await req.json());
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, "Incorrect password");

  // Cancel an active subscription so the user isn't billed again.
  if (user.stripeSubscriptionId && billingConfigured() && ["active", "trialing", "past_due"].includes(user.subscriptionStatus ?? "")) {
    try {
      await getStripe().subscriptions.cancel(user.stripeSubscriptionId);
    } catch (err) {
      console.error("[account] subscription cancel failed", err);
      throw new HttpError(502, "Couldn't cancel your subscription. Please try again or contact support.");
    }
  }

  // Best-effort removal of uploaded images stored in Vercel Blob.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const rows = await db.select({ media: posts.media }).from(posts).where(eq(posts.userId, user.id));
    const urls = rows.flatMap((r) => r.media).filter((u) => u.includes(".blob.vercel-storage.com/"));
    if (urls.length) await del(urls).catch((err) => console.error("[account] blob delete failed", err));
  }

  // Cascades to social accounts (tokens), posts, targets, metrics, queue slots and AI usage.
  await db.delete(users).where(eq(users.id, user.id));
  await deleteSession();
  return Response.json({ ok: true });
});
