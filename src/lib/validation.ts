import { z } from "zod";
import { PLATFORM_IDS } from "./platforms/meta";

export const credentialsSchema = z.object({
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const signupSchema = credentialsSchema.extend({
  name: z.string().trim().max(80).optional(),
  timezone: z.string().max(64).optional(),
});

export const postInputSchema = z.object({
  content: z.string().max(63206).default(""),
  media: z.array(z.string().max(2048)).max(10).default([]),
  targets: z
    .array(
      z.object({
        accountId: z.string(),
        contentOverride: z.string().max(63206).nullable().optional(),
      }),
    )
    .default([]),
  /** draft: save only. schedule: at scheduledAt. queue: next free slot. now: publish immediately. */
  action: z.enum(["draft", "schedule", "queue", "now"]),
  scheduledAt: z.coerce.date().optional(),
});

export const variationsSchema = z.object({
  draft: z.string().min(3, "Write a draft or topic first").max(5000),
  platforms: z.array(z.enum(PLATFORM_IDS)).min(1, "Pick at least one platform"),
  count: z.number().int().min(1).max(3).default(2),
  tone: z.string().max(100).optional(),
});

export const weekSchema = z.object({
  topic: z.string().min(3, "Describe a topic").max(1000),
  audience: z.string().max(300).optional(),
  goal: z.string().max(300).optional(),
  tone: z.string().max(100).optional(),
  postsPerDay: z.number().int().min(1).max(2).default(1),
});

export const slotsSchema = z.object({
  slots: z
    .array(z.object({ dayOfWeek: z.number().int().min(0).max(6), minuteOfDay: z.number().int().min(0).max(1439) }))
    .max(100),
  timezone: z.string().max(64).optional(),
});
