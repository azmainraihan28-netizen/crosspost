// Client-safe platform metadata (no secrets, no server imports).

export const PLATFORM_IDS = ["x", "linkedin", "instagram", "facebook", "threads"] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  charLimit: number;
  /** Instagram can't publish text-only posts. */
  requiresMedia: boolean;
  maxImages: number;
  color: string;
  analytics: string;
}

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  x: {
    id: "x",
    name: "X",
    charLimit: 280,
    requiresMedia: false,
    maxImages: 4,
    color: "#000000",
    analytics: "Impressions, likes, replies, reposts (requires X API Basic tier or higher)",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    charLimit: 3000,
    requiresMedia: false,
    maxImages: 1,
    color: "#0A66C2",
    analytics: "Likes and comments (requires r_member_social approval)",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    charLimit: 2200,
    requiresMedia: true,
    maxImages: 10,
    color: "#E1306C",
    analytics: "Reach, likes, comments, shares",
  },
  facebook: {
    id: "facebook",
    name: "Facebook Page",
    charLimit: 63206,
    requiresMedia: false,
    maxImages: 1,
    color: "#1877F2",
    analytics: "Reactions, comments, shares",
  },
  threads: {
    id: "threads",
    name: "Threads",
    charLimit: 500,
    requiresMedia: false,
    maxImages: 1,
    color: "#101010",
    analytics: "Views, likes, replies, reposts",
  },
};

export function isPlatformId(v: string): v is PlatformId {
  return (PLATFORM_IDS as readonly string[]).includes(v);
}
