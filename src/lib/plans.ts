import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { db, aiUsage, posts, socialAccounts, type User } from "@/db";
import { HttpError } from "./session";

export const PLANS = {
  free: {
    name: "Starter",
    price: 0,
    accounts: 3,
    postsPerMonth: 15,
    aiPerMonth: 10,
  },
  pro: {
    name: "Pro",
    price: 19,
    accounts: Infinity,
    postsPerMonth: Infinity,
    aiPerMonth: 300,
  },
} as const;

export function planOf(user: User) {
  const active = user.plan === "pro" && ["active", "trialing"].includes(user.subscriptionStatus ?? "");
  return active ? PLANS.pro : PLANS.free;
}

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function usageFor(user: User) {
  const since = monthStart();
  const [[a], [p], [ai]] = await Promise.all([
    db.select({ n: count() }).from(socialAccounts).where(eq(socialAccounts.userId, user.id)),
    db
      .select({ n: count() })
      .from(posts)
      .where(and(eq(posts.userId, user.id), gte(posts.createdAt, since))),
    db
      .select({ n: count() })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, user.id), gte(aiUsage.createdAt, since))),
  ]);
  return { accounts: a.n, posts: p.n, ai: ai.n };
}

export async function assertLimit(user: User, kind: "accounts" | "posts" | "ai", adding = 1) {
  const plan = planOf(user);
  const usage = await usageFor(user);
  const limit = { accounts: plan.accounts, posts: plan.postsPerMonth, ai: plan.aiPerMonth }[kind];
  if (usage[kind] + adding > limit) {
    const label = { accounts: "connected accounts", posts: "posts this month", ai: "AI generations this month" }[kind];
    throw new HttpError(402, `Your ${plan.name} plan allows ${limit} ${label}. Upgrade to Pro for more.`, "limit");
  }
}
