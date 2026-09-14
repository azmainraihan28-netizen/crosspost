import { appUrl } from "../app-url";

/** Download a media URL into memory (used by platforms that need raw bytes: X, LinkedIn). */
export async function downloadMedia(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not download media (${res.status}): ${url}`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  return { buffer: Buffer.from(await res.arrayBuffer()), mimeType };
}

/** Resolve app-relative upload paths (e.g. /uploads/a.png) to absolute URLs. */
export function absoluteMediaUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return new URL(url, appUrl()).toString();
}
