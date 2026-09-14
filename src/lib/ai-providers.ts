import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { HttpError } from "./session";

// Structured-output generation with either OpenAI or Anthropic.
// OpenAI is used when OPENAI_API_KEY is set; otherwise Anthropic when ANTHROPIC_API_KEY is set.

export type AiProvider = "openai" | "anthropic";

export function aiProvider(): AiProvider | null {
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  return null;
}

export function aiModel(provider = aiProvider()) {
  if (provider === "openai") return process.env.OPENAI_MODEL?.trim() || "gpt-5.5";
  if (provider === "anthropic") return process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5";
  return null;
}

const DECLINED = "The AI declined this request. Try rephrasing the topic.";
const UNEXPECTED = "The AI returned an unexpected response. Please try again.";

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

async function generateOpenAI<T extends z.ZodType>(schema: T, system: string, user: string): Promise<z.infer<T>> {
  openaiClient ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim() });
  try {
    const res = await openaiClient.responses.parse({
      model: aiModel("openai")!,
      instructions: system,
      input: user,
      reasoning: { effort: "low" },
      text: { format: zodTextFormat(schema, "result") },
    });
    const refused = res.output.some(
      (item) => item.type === "message" && item.content.some((c) => c.type === "refusal"),
    );
    if (refused) throw new HttpError(422, DECLINED);
    if (!res.output_parsed) throw new HttpError(502, UNEXPECTED);
    return res.output_parsed as z.infer<T>;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof OpenAI.RateLimitError) throw new HttpError(429, "AI rate limit or quota reached. Check your OpenAI billing, then try again.");
    if (err instanceof OpenAI.AuthenticationError) throw new HttpError(503, "OPENAI_API_KEY is invalid.");
    if (err instanceof OpenAI.NotFoundError) throw new HttpError(503, `OpenAI model "${aiModel("openai")}" isn't available to this key. Set OPENAI_MODEL.`);
    if (err instanceof OpenAI.APIError) throw new HttpError(502, `AI error: ${err.message}`);
    throw err;
  }
}

async function generateAnthropic<T extends z.ZodType>(schema: T, system: string, user: string): Promise<z.infer<T>> {
  anthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim() });
  try {
    const msg = await anthropicClient.beta.messages.parse({
      model: aiModel("anthropic")!,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { format: betaZodOutputFormat(schema), effort: "medium" },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (msg.stop_reason === "refusal") throw new HttpError(422, DECLINED);
    if (!msg.parsed_output) throw new HttpError(502, UNEXPECTED);
    return msg.parsed_output;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Anthropic.RateLimitError) throw new HttpError(429, "AI rate limit reached. Try again in a minute.");
    if (err instanceof Anthropic.AuthenticationError) throw new HttpError(503, "ANTHROPIC_API_KEY is invalid.");
    if (err instanceof Anthropic.APIError) throw new HttpError(502, `AI error: ${err.message}`);
    throw err;
  }
}

export function generateStructured<T extends z.ZodType>(schema: T, system: string, user: string): Promise<z.infer<T>> {
  const provider = aiProvider();
  if (provider === "openai") return generateOpenAI(schema, system, user);
  if (provider === "anthropic") return generateAnthropic(schema, system, user);
  throw new HttpError(503, "AI is not configured. Set OPENAI_API_KEY in your environment variables.");
}
