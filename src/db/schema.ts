import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  /** Empty string for accounts created with Google sign-in (no password set). */
  passwordHash: text("password_hash").notNull(),
  googleId: text("google_id").unique(),
  name: text("name"),
  timezone: text("timezone").notNull().default("UTC"),
  plan: text("plan", { enum: ["free", "pro"] }).notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

/** A connected social account (one row per profile/page). Tokens are encrypted at rest. */
export const socialAccounts = sqliteTable(
  "social_accounts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    externalId: text("external_id").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    meta: text("meta", { mode: "json" }).$type<Record<string, string>>(),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("social_accounts_user_platform_ext").on(t.userId, t.platform, t.externalId)],
);

export const posts = sqliteTable(
  "posts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    media: text("media", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    status: text("status", {
      enum: ["draft", "scheduled", "publishing", "published", "partial", "failed"],
    })
      .notNull()
      .default("draft"),
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdateFn(() => new Date()),
  },
  (t) => [index("posts_user_idx").on(t.userId), index("posts_due_idx").on(t.status, t.scheduledAt)],
);

/** One row per (post, account). Holds the per-platform override and publish result. */
export const postTargets = sqliteTable(
  "post_targets",
  {
    id: id(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => socialAccounts.id, { onDelete: "cascade" }),
    contentOverride: text("content_override"),
    status: text("status", { enum: ["pending", "published", "failed"] })
      .notNull()
      .default("pending"),
    externalPostId: text("external_post_id"),
    externalUrl: text("external_url"),
    error: text("error"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("post_targets_post_idx").on(t.postId)],
);

/** Latest engagement snapshot per published target. */
export const metrics = sqliteTable("metrics", {
  targetId: text("target_id")
    .primaryKey()
    .references(() => postTargets.id, { onDelete: "cascade" }),
  impressions: integer("impressions").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  available: integer("available", { mode: "boolean" }).notNull().default(true),
  fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
});

/** Recurring weekly posting times, interpreted in the user's timezone. */
export const queueSlots = sqliteTable(
  "queue_slots",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday
    minuteOfDay: integer("minute_of_day").notNull(),
  },
  (t) => [uniqueIndex("queue_slots_unique").on(t.userId, t.dayOfWeek, t.minuteOfDay)],
);

export const aiUsage = sqliteTable(
  "ai_usage",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("ai_usage_user_idx").on(t.userId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostTarget = typeof postTargets.$inferSelect;
