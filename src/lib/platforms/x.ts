import { TwitterApi, type EUploadMimeType, type SendTweetV2Params } from "twitter-api-v2";
import { downloadMedia } from "./media";
import { PlatformError, type PlatformAdapter } from "./types";

// X (Twitter) via OAuth 2.0 Authorization Code + PKCE.
// Posting and media upload use twitter-api-v2, as in langchain-ai/social-media-agent's TwitterClient.

const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access", "media.write"];

function appClient() {
  return new TwitterApi({
    clientId: process.env.X_CLIENT_ID!,
    clientSecret: process.env.X_CLIENT_SECRET,
  });
}

export const x: PlatformAdapter = {
  id: "x",
  usesPkce: true,
  isConfigured: () => Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET),

  authorizeUrl({ state, redirectUri, codeChallenge }) {
    const u = new URL("https://x.com/i/oauth2/authorize");
    u.search = new URLSearchParams({
      response_type: "code",
      client_id: process.env.X_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }).toString();
    return u.toString();
  },

  async exchangeCode({ code, redirectUri, codeVerifier }) {
    const { client, accessToken, refreshToken, expiresIn } = await appClient().loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri,
    });
    const { data: me } = await client.v2.me({ "user.fields": ["profile_image_url", "name"] });
    return [
      {
        externalId: me.id,
        username: me.username,
        displayName: me.name,
        avatarUrl: me.profile_image_url,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    ];
  },

  async refresh({ refreshToken }) {
    if (!refreshToken) return null;
    const r = await appClient().refreshOAuth2Token(refreshToken);
    return {
      accessToken: r.accessToken,
      refreshToken: r.refreshToken,
      expiresAt: new Date(Date.now() + r.expiresIn * 1000),
    };
  },

  async publish(account, { text, media }) {
    const client = new TwitterApi(account.accessToken);
    try {
      const mediaIds: string[] = [];
      for (const url of media.slice(0, 4)) {
        const { buffer, mimeType } = await downloadMedia(url);
        mediaIds.push(await client.v2.uploadMedia(buffer, { media_type: mimeType as EUploadMimeType }));
      }
      const payload: SendTweetV2Params = { text };
      if (mediaIds.length) payload.media = { media_ids: mediaIds as [string] };
      const { data } = await client.v2.tweet(payload);
      return { id: data.id, url: `https://x.com/i/web/status/${data.id}` };
    } catch (err) {
      throw new PlatformError("x", describe(err));
    }
  },

  async metrics(account, postId) {
    const client = new TwitterApi(account.accessToken);
    try {
      const { data } = await client.v2.singleTweet(postId, { "tweet.fields": ["public_metrics"] });
      const m = data.public_metrics;
      if (!m) return null;
      return {
        impressions: m.impression_count ?? 0,
        likes: m.like_count,
        comments: m.reply_count,
        shares: m.retweet_count + (m.quote_count ?? 0),
      };
    } catch {
      return null; // Read access requires a paid X API tier.
    }
  },
};

function describe(err: unknown): string {
  const e = err as { data?: { detail?: string; title?: string }; message?: string };
  return e?.data?.detail ?? e?.data?.title ?? e?.message ?? "X API error";
}
