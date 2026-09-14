import { downloadMedia } from "./media";
import { fetchJson, form, PlatformError, type PlatformAdapter } from "./types";

// LinkedIn personal profile posting via "Sign In with LinkedIn using OpenID Connect" + "Share on LinkedIn".
// The ugcPosts + registerUpload image flow is adapted from langchain-ai/social-media-agent's LinkedInClient.

const API = "https://api.linkedin.com/v2";
const SCOPES = ["openid", "profile", "w_member_social"];

function headers(token: string, extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    ...extra,
  };
}

async function uploadImage(token: string, author: string, imageUrl: string): Promise<string> {
  const reg = await fetchJson<{
    value: {
      asset: string;
      uploadMechanism: Record<string, { uploadUrl: string }>;
    };
  }>("linkedin", `${API}/assets?action=registerUpload`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: author,
        serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
      },
    }),
  });
  const uploadUrl =
    reg.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const { buffer } = await downloadMedia(imageUrl);
  const up = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
    body: new Uint8Array(buffer),
  });
  if (!up.ok) throw new PlatformError("linkedin", `Image upload failed: ${up.statusText}`, up.status);
  return reg.value.asset;
}

export const linkedin: PlatformAdapter = {
  id: "linkedin",
  usesPkce: false,
  isConfigured: () => Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),

  authorizeUrl({ state, redirectUri }) {
    const u = new URL("https://www.linkedin.com/oauth/v2/authorization");
    u.search = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      redirect_uri: redirectUri,
      state,
      scope: SCOPES.join(" "),
    }).toString();
    return u.toString();
  },

  async exchangeCode({ code, redirectUri }) {
    const tok = await fetchJson<{ access_token: string; expires_in: number; refresh_token?: string }>(
      "linkedin",
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      },
    );
    const me = await fetchJson<{ sub: string; name?: string; picture?: string; email?: string }>(
      "linkedin",
      `${API}/userinfo`,
      { headers: { Authorization: `Bearer ${tok.access_token}` } },
    );
    return [
      {
        externalId: me.sub,
        username: me.name ?? me.email ?? me.sub,
        displayName: me.name,
        avatarUrl: me.picture,
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt: new Date(Date.now() + tok.expires_in * 1000),
      },
    ];
  },

  async publish(account, { text, media }) {
    const author = `urn:li:person:${account.externalId}`;
    const share: Record<string, unknown> = {
      shareCommentary: { text },
      shareMediaCategory: "NONE",
    };
    if (media[0]) {
      const asset = await uploadImage(account.accessToken, author, media[0]);
      share.shareMediaCategory = "IMAGE";
      share.media = [{ status: "READY", media: asset }];
    }
    const res = await fetch(`${API}/ugcPosts`, {
      method: "POST",
      headers: headers(account.accessToken),
      body: JSON.stringify({
        author,
        lifecycleState: "PUBLISHED",
        specificContent: { "com.linkedin.ugc.ShareContent": share },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new PlatformError("linkedin", body.slice(0, 300) || res.statusText, res.status);
    }
    const id = res.headers.get("x-restli-id") ?? ((await res.json()) as { id: string }).id;
    return { id, url: `https://www.linkedin.com/feed/update/${id}` };
  },

  async metrics(account, postId) {
    try {
      const data = await fetchJson<{
        likesSummary?: { totalLikes: number };
        commentsSummary?: { aggregatedTotalComments: number };
      }>("linkedin", `${API}/socialActions/${encodeURIComponent(postId)}`, {
        headers: headers(account.accessToken),
      });
      return {
        impressions: 0,
        likes: data.likesSummary?.totalLikes ?? 0,
        comments: data.commentsSummary?.aggregatedTotalComments ?? 0,
        shares: 0,
      };
    } catch {
      return null; // Needs r_member_social, which LinkedIn grants to approved partners.
    }
  },
};
