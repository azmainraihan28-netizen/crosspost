import { eq } from "drizzle-orm";
import { Check } from "lucide-react";
import { db, users } from "@/db";
import { requireUser } from "@/lib/session";
import { PLANS, planOf, usageFor } from "@/lib/plans";
import { applySubscription, billingConfigured, getStripe } from "@/lib/billing";
import { PageHeader } from "@/components/page-header";
import { fmt } from "@/components/format";
import { BillingButton } from "./billing-button";

export const metadata = { title: "Plan & billing" };

export default async function BillingPage({ searchParams }: PageProps<"/app/billing">) {
  let user = await requireUser();
  const { checkout, session_id } = await searchParams;

  // Sync immediately after Checkout so the upgrade shows even before the webhook arrives (e.g. local dev without Stripe CLI).
  if (checkout === "success" && typeof session_id === "string" && billingConfigured()) {
    try {
      const s = await getStripe().checkout.sessions.retrieve(session_id, { expand: ["subscription"] });
      const customer = typeof s.customer === "string" ? s.customer : s.customer?.id;
      if (customer && customer === user.stripeCustomerId && s.subscription && typeof s.subscription !== "string") {
        await applySubscription(s.subscription);
        [user] = await db.select().from(users).where(eq(users.id, user.id));
      }
    } catch (err) {
      console.error("[billing] checkout sync failed", err);
    }
  }

  const plan = planOf(user);
  const usage = await usageFor(user);
  const isPro = plan === PLANS.pro;
  const configured = billingConfigured();

  return (
    <>
      <PageHeader eyebrow="Billing" title="Plan & billing" />

      {checkout === "success" && (
        <p className="mb-6 rounded-xl bg-moss/10 px-4 py-3 text-sm text-moss">
          {isPro ? "You're on Pro. Thanks for supporting the product!" : "Payment received. Your plan will update in a moment."}
        </p>
      )}
      {checkout === "cancelled" && <p className="mb-6 rounded-xl bg-paper-2 px-4 py-3 text-sm text-ink-2">Checkout cancelled. No charge was made.</p>}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className={`card p-8 ${isPro ? "border-ink" : ""}`}>
          <p className="eyebrow">Current plan</p>
          <p className="mt-3 font-display text-6xl leading-none">
            {plan.name}
            {isPro && <span className="ml-3 align-middle text-base text-signal">●</span>}
          </p>
          {isPro && user.currentPeriodEnd && (
            <p className="mt-3 text-sm text-ink-2">
              {user.subscriptionStatus === "active" ? "Renews" : "Status: " + user.subscriptionStatus + " · Period ends"}{" "}
              {fmt(user.currentPeriodEnd, "MMMM d, yyyy", user.timezone)}
            </p>
          )}
          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6">
            {[
              ["Accounts", usage.accounts, plan.accounts],
              ["Posts / mo", usage.posts, plan.postsPerMonth],
              ["AI / mo", usage.ai, plan.aiPerMonth],
            ].map(([label, used, max]) => (
              <div key={label as string}>
                <dt className="font-mono text-[10px] tracking-widest text-muted uppercase">{label}</dt>
                <dd className="mt-1 font-display text-3xl">
                  {used}
                  <span className="text-lg text-muted"> / {Number.isFinite(max as number) ? max : "∞"}</span>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-8">
            {!configured ? (
              <p className="rounded-xl bg-amber/10 px-4 py-3 text-sm text-amber">
                Stripe isn&apos;t configured. Add STRIPE_SECRET_KEY (test mode) to enable upgrades.
              </p>
            ) : isPro || user.stripeCustomerId ? (
              <BillingButton kind="portal" />
            ) : null}
          </div>
        </section>

        {!isPro && (
          <section className="relative overflow-hidden rounded-2xl bg-ink p-8 text-paper shadow-lift">
            <div className="absolute -top-16 -right-16 size-48 rounded-full border-[26px] border-signal/80" />
            <p className="eyebrow !text-paper/50">Upgrade</p>
            <p className="relative mt-3 font-display text-6xl leading-none">
              Pro <span className="text-2xl text-paper/60">${PLANS.pro.price}/mo</span>
            </p>
            <ul className="relative mt-6 space-y-2.5 text-sm">
              {["Unlimited connected accounts", "Unlimited posts and scheduling", `${PLANS.pro.aiPerMonth} AI generations per month`, "Cancel anytime"].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check className="size-4 text-signal" /> {f}
                </li>
              ))}
            </ul>
            {configured && (
              <div className="relative mt-8">
                <BillingButton kind="checkout" />
                {process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") && (
                  <p className="mt-3 font-mono text-[11px] text-paper/50">Test mode · use card 4242 4242 4242 4242, any future date and CVC</p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
