import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { route } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/session";
import { appUrl, getStripe } from "@/lib/billing";
import { PLANS, planOf } from "@/lib/plans";

export const POST = route(async () => {
  const user = await apiUser();
  if (planOf(user) === PLANS.pro) throw new HttpError(409, "You're already on Pro");
  const stripe = getStripe();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name ?? undefined, metadata: { userId: user.id } });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
  }

  // Use a pre-created Price if provided, otherwise define it inline (handy in test mode).
  const lineItem = process.env.STRIPE_PRICE_ID
    ? { price: process.env.STRIPE_PRICE_ID, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PLANS.pro.price * 100,
          recurring: { interval: "month" as const },
          product_data: { name: "Crosspost Pro" },
        },
      };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [lineItem],
    allow_promotion_codes: true,
    success_url: `${appUrl()}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/app/billing?checkout=cancelled`,
  });
  return Response.json({ url: session.url });
});
