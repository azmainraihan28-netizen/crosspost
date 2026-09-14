import "server-only";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { HttpError } from "./session";

let stripe: Stripe | null = null;

export function billingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new HttpError(503, "Billing is not configured. Set STRIPE_SECRET_KEY.");
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export { appUrl } from "./app-url";

/** Sync a Stripe subscription onto the user row. Called from the webhook and after checkout. */
export async function applySubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const periodEndS =
    sub.items.data[0]?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  const active = ["active", "trialing"].includes(sub.status);
  await db
    .update(users)
    .set({
      plan: active ? "pro" : "free",
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: periodEndS ? new Date(periodEndS * 1000) : null,
    })
    .where(eq(users.stripeCustomerId, customerId));
}
