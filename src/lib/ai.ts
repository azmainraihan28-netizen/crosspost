import "server-only";
import { z } from "zod";
import { PLATFORMS, type PlatformId } from "./platforms/meta";
import { aiProvider, generateStructured } from "./ai-providers";

export function aiConfigured() {
  return aiProvider() !== null;
}

// Post structure and content rules adapted from langchain-ai/social-media-agent
// (src/agents/generate-post/prompts), generalized for any brand and any platform.
const POST_STRUCTURE = `<structure>
1. Hook: a short opening line (ideally under 10 words) that stops the scroll. An emoji is fine for announcements, but don't force one.
2. Body: a concise, high-level explanation of the idea, product, or lesson. Focus on what it does, shows, or the problem it solves. At most 3 short sentences, or a few tight bullet points if the content is dense.
3. Call to action: a few words that invite the reader to click, reply, or follow.
</structure>`;

const CONTENT_RULES = `<rules>
- Keep posts short, concise and engaging. Shorter almost always wins.
- Don't be overly technical; write for a smart but general audience unless told otherwise.
- Use present tense so announcements feel immediate.
- You're a human posting for other humans. Keep the tone natural and varied, never robotic or salesy.
- Limit emojis to the hook and optionally the call to action.
- Only use hashtags where the platform culture expects them (Instagram, sometimes LinkedIn), and use at most 3.
- If the user supplied a link, keep it exactly as written.
- Never invent facts, statistics, quotes, or customer names that weren't provided.
</rules>`;

function platformGuide(ids: PlatformId[]) {
  const notes: Record<PlatformId, string> = {
    x: "punchy, conversational, line breaks welcome, no hashtags",
    linkedin: "professional but personal, short paragraphs, a takeaway or question at the end",
    instagram: "caption that complements an image, warm tone, up to 3 relevant hashtags at the end",
    facebook: "friendly and community-oriented, can be slightly longer",
    threads: "casual and conversational, like talking to friends",
  };
  return ids
    .map((id) => `- ${PLATFORMS[id].name} (id "${id}"): max ${PLATFORMS[id].charLimit} characters; ${notes[id]}`)
    .join("\n");
}

function system(brandVoice?: string) {
  return `You are a senior social media copywriter who writes high-performing posts for creators and small businesses.

${POST_STRUCTURE}

${CONTENT_RULES}
${brandVoice ? `\n<brand-voice>\n${brandVoice}\n</brand-voice>` : ""}

Character limits are hard limits: count carefully and stay comfortably under them.`;
}

const generate = generateStructured;

/* ------------------------------ Variations ------------------------------ */

const VariationsSchema = z.object({
  variations: z.array(
    z.object({
      platform: z.string(),
      options: z.array(z.string()),
    }),
  ),
});

export async function generateVariations(input: {
  draft: string;
  platforms: PlatformId[];
  count: number;
  tone?: string;
  brandVoice?: string;
}) {
  const out = await generate(
    VariationsSchema,
    system(input.brandVoice),
    `Rewrite the draft below into ${input.count} distinct variation(s) for EACH of these platforms:
${platformGuide(input.platforms)}
${input.tone ? `\nTone: ${input.tone}` : ""}

Each variation should take a different angle or hook, not just reword the same sentence.
Return one entry per platform using the platform id exactly as given.

<draft>
${input.draft}
</draft>`,
  );

  // Keep only requested platforms; condense anything that still breaks a hard limit.
  const result: Partial<Record<PlatformId, string[]>> = {};
  for (const id of input.platforms) {
    const found = out.variations.find((v) => v.platform === id);
    const options = await Promise.all(
      (found?.options ?? []).map((text) => (text.length > PLATFORMS[id].charLimit ? condense(text, id) : text)),
    );
    result[id] = options;
  }
  return result;
}

const CondenseSchema = z.object({ post: z.string() });

/** Mirrors social-media-agent's condense-post step: shorten while keeping structure. */
async function condense(text: string, platform: PlatformId) {
  const limit = PLATFORMS[platform].charLimit;
  const r = await generate(
    CondenseSchema,
    system(),
    `This ${PLATFORMS[platform].name} post is ${text.length} characters but the hard limit is ${limit}.
Condense it to roughly ${Math.floor(limit * 0.9)} characters. Keep the same structure (hook, body, call to action), keep any links, and don't drop the core message.

<post>
${text}
</post>`,
  );
  return r.post.length > limit ? r.post.slice(0, limit - 1) + "…" : r.post;
}

/* ------------------------------ Week planner ----------------------------- */

const WeekSchema = z.object({
  posts: z.array(
    z.object({
      day: z.number().int(),
      theme: z.string(),
      content: z.string(),
      shortVersion: z.string(),
    }),
  ),
});

export type WeekPlanPost = z.infer<typeof WeekSchema>["posts"][number];

export async function generateWeek(input: {
  topic: string;
  audience?: string;
  goal?: string;
  tone?: string;
  postsPerDay: number;
  brandVoice?: string;
}) {
  const total = input.postsPerDay * 7;
  const out = await generate(
    WeekSchema,
    system(input.brandVoice),
    `Plan a full week of social media content about the topic below: ${total} posts in total, ${input.postsPerDay} per day, days numbered 1 to 7.

<topic>${input.topic}</topic>
${input.audience ? `<audience>${input.audience}</audience>` : ""}
${input.goal ? `<goal>${input.goal}</goal>` : ""}
${input.tone ? `<tone>${input.tone}</tone>` : ""}

Mix formats across the week so it doesn't feel repetitive: tips, a personal story or lesson, a myth vs. fact, a question to spark replies, a quick how-to, a behind-the-scenes angle, and a soft promotional post.

For each post return:
- day: 1-7
- theme: 2-5 word label for the calendar
- content: the full post (under 1200 characters), suitable for LinkedIn/Facebook/Instagram
- shortVersion: a version under 260 characters for X and Threads`,
  );
  return out.posts
    .filter((p) => p.day >= 1 && p.day <= 7)
    .slice(0, total)
    .map((p) => ({ ...p, shortVersion: p.shortVersion.slice(0, 280) }));
}
