import { fetchJson, form, type PlatformAdapter } from "./types";
import type { PlatformId } from "./meta";

// Instagram (Instagram API with Instagram Login), Facebook Pages and Threads all use Meta's
// container-based Graph APIs, so they share helpers here.

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v23.0";

function qs(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

async function waitForContainer(platform: PlatformId, base: string, id: string, token: string) {
  const field = platform === "threads" ? "status" : "status_code";
  for (let i = 0; i < 10; i++) {
    const r = await fetchJson<Record<string, string>>(platform, `${base}/${id}?${qs({ fields: field, access_token: token })}`);
    if (r[field] === "FINISHED" || r[field] === "PUBLISHED") return;
    if (r[field] === "ERROR" || r[field] === "EXPIRED") throw new Error(`Media container ${r[field]}`);
    await new Promise((res) => setTimeout(res, 1500));
  }
}

/* ------------------------------ Instagram ------------------------------ */

const IG = `https://graph.instagram.com/${GRAPH_VERSION}`;

export const instagram: PlatformAdapter = {
  id: "instagram",
  usesPkce: false,
  isConfigured: () => Boolean(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET),

  authorizeUrl({ state, redirectUri }) {
    return `https://www.instagram.com/oauth/authorize?${qs({
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights",
      state,
    })}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const short = await fetchJson<{ access_token: string; user_id: string | number }>(
      "instagram",
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        body: form({
          client_id: process.env.INSTAGRAM_CLIENT_ID!,
          client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      },
    );
    const long = await fetchJson<{ access_token: string; expires_in: number }>(
      "instagram",
      `https://graph.instagram.com/access_token?${qs({
        grant_type: "ig_exchange_token",
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        access_token: short.access_token,
      })}`,
    );
    const me = await fetchJson<{ user_id: string; username: string; name?: string; profile_picture_url?: string }>(
      "instagram",
      `${IG}/me?${qs({ fields: "user_id,username,name,profile_picture_url", access_token: long.access_token })}`,
    );
    return [
      {
        externalId: String(me.user_id ?? short.user_id),
        username: me.username,
        displayName: me.name,
        avatarUrl: me.profile_picture_url,
        accessToken: long.access_token,
        expiresAt: new Date(Date.now() + long.expires_in * 1000),
      },
    ];
  },

  async refresh({ accessToken }) {
    const r = await fetchJson<{ access_token: string; expires_in: number }>(
      "instagram",
      `https://graph.instagram.com/refresh_access_token?${qs({ grant_type: "ig_refresh_token", access_token: accessToken })}`,
    );
    return { accessToken: r.access_token, expiresAt: new Date(Date.now() + r.expires_in * 1000) };
  },

  async publish(account, { text, media }) {
    if (!media.length) throw new Error("Instagram requires at least one image");
    const token = account.accessToken;
    const base = `${IG}/${account.externalId}`;
    let creationId: string;

    if (media.length === 1) {
      const c = await fetchJson<{ id: string }>("instagram", `${base}/media`, {
        method: "POST",
        body: form({ image_url: media[0], caption: text, access_token: token }),
      });
      creationId = c.id;
    } else {
      const children: string[] = [];
      for (const url of media.slice(0, 10)) {
        const c = await fetchJson<{ id: string }>("instagram", `${base}/media`, {
          method: "POST",
          body: form({ image_url: url, is_carousel_item: "true", access_token: token }),
        });
        children.push(c.id);
      }
      const c = await fetchJson<{ id: string }>("instagram", `${base}/media`, {
        method: "POST",
        body: form({ media_type: "CAROUSEL", children: children.join(","), caption: text, access_token: token }),
      });
      creationId = c.id;
    }

    await waitForContainer("instagram", IG, creationId, token);
    const pub = await fetchJson<{ id: string }>("instagram", `${base}/media_publish`, {
      method: "POST",
      body: form({ creation_id: creationId, access_token: token }),
    });
    const info = await fetchJson<{ permalink?: string }>(
      "instagram",
      `${IG}/${pub.id}?${qs({ fields: "permalink", access_token: token })}`,
    ).catch(() => ({ permalink: undefined }));
    return { id: pub.id, url: info.permalink };
  },

  async metrics(account, postId) {
    try {
      const r = await fetchJson<{ data: { name: string; values: { value: number }[] }[] }>(
        "instagram",
        `${IG}/${postId}/insights?${qs({ metric: "reach,likes,comments,shares", access_token: account.accessToken })}`,
      );
      const v = (n: string) => r.data.find((d) => d.name === n)?.values[0]?.value ?? 0;
      return { impressions: v("reach"), likes: v("likes"), comments: v("comments"), shares: v("shares") };
    } catch {
      return null;
    }
  },
};

/* ---------------------------- Facebook Pages ---------------------------- */

const FB = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const facebook: PlatformAdapter = {
  id: "facebook",
  usesPkce: false,
  isConfigured: () => Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),

  authorizeUrl({ state, redirectUri }) {
    // Facebook Login for Business apps can use a Configuration ID (recommended by Meta) instead of scope.
    const configId = process.env.FACEBOOK_CONFIG_ID?.trim();
    return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${qs({
      client_id: process.env.FACEBOOK_CLIENT_ID!.trim(),
      redirect_uri: redirectUri,
      state,
      ...(configId
        ? { config_id: configId, response_type: "code", override_default_response_type: "true" }
        : { scope: "pages_show_list,pages_manage_posts,pages_read_engagement" }),
    })}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const tok = await fetchJson<{ access_token: string }>(
      "facebook",
      `${FB}/oauth/access_token?${qs({
        client_id: process.env.FACEBOOK_CLIENT_ID!,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code,
      })}`,
    );
    // Exchange for a long-lived user token so the derived page tokens don't expire.
    const long = await fetchJson<{ access_token: string }>(
      "facebook",
      `${FB}/oauth/access_token?${qs({
        grant_type: "fb_exchange_token",
        client_id: process.env.FACEBOOK_CLIENT_ID!,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
        fb_exchange_token: tok.access_token,
      })}`,
    );
    const pages = await fetchJson<{ data: { id: string; name: string; access_token: string }[] }>(
      "facebook",
      `${FB}/me/accounts?${qs({ fields: "id,name,access_token", access_token: long.access_token })}`,
    );
    if (!pages.data.length) throw new Error("No Facebook Pages found on this account");
    return pages.data.map((p) => ({
      externalId: p.id,
      username: p.name,
      displayName: p.name,
      avatarUrl: `${FB}/${p.id}/picture`,
      accessToken: p.access_token,
    }));
  },

  async publish(account, { text, media }) {
    const base = `${FB}/${account.externalId}`;
    const r: { id: string; post_id?: string } = media[0]
      ? await fetchJson("facebook", `${base}/photos`, {
          method: "POST",
          body: form({ url: media[0], caption: text, access_token: account.accessToken }),
        })
      : await fetchJson("facebook", `${base}/feed`, {
          method: "POST",
          body: form({ message: text, access_token: account.accessToken }),
        });
    const id = r.post_id ?? r.id;
    return { id, url: `https://www.facebook.com/${id}` };
  },

  async metrics(account, postId) {
    try {
      const r = await fetchJson<{
        reactions?: { summary: { total_count: number } };
        comments?: { summary: { total_count: number } };
        shares?: { count: number };
      }>(
        "facebook",
        `${FB}/${postId}?${qs({
          fields: "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares",
          access_token: account.accessToken,
        })}`,
      );
      return {
        impressions: 0,
        likes: r.reactions?.summary.total_count ?? 0,
        comments: r.comments?.summary.total_count ?? 0,
        shares: r.shares?.count ?? 0,
      };
    } catch {
      return null;
    }
  },
};

/* -------------------------------- Threads ------------------------------- */

const TH = "https://graph.threads.net/v1.0";

export const threads: PlatformAdapter = {
  id: "threads",
  usesPkce: false,
  isConfigured: () => Boolean(process.env.THREADS_CLIENT_ID && process.env.THREADS_CLIENT_SECRET),

  authorizeUrl({ state, redirectUri }) {
    return `https://threads.net/oauth/authorize?${qs({
      client_id: process.env.THREADS_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: "threads_basic,threads_content_publish,threads_manage_insights",
      response_type: "code",
      state,
    })}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const short = await fetchJson<{ access_token: string; user_id: string | number }>(
      "threads",
      "https://graph.threads.net/oauth/access_token",
      {
        method: "POST",
        body: form({
          client_id: process.env.THREADS_CLIENT_ID!,
          client_secret: process.env.THREADS_CLIENT_SECRET!,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      },
    );
    const long = await fetchJson<{ access_token: string; expires_in: number }>(
      "threads",
      `https://graph.threads.net/access_token?${qs({
        grant_type: "th_exchange_token",
        client_secret: process.env.THREADS_CLIENT_SECRET!,
        access_token: short.access_token,
      })}`,
    );
    const me = await fetchJson<{ id: string; username: string; name?: string; threads_profile_picture_url?: string }>(
      "threads",
      `${TH}/me?${qs({ fields: "id,username,name,threads_profile_picture_url", access_token: long.access_token })}`,
    );
    return [
      {
        externalId: me.id,
        username: me.username,
        displayName: me.name,
        avatarUrl: me.threads_profile_picture_url,
        accessToken: long.access_token,
        expiresAt: new Date(Date.now() + long.expires_in * 1000),
      },
    ];
  },

  async refresh({ accessToken }) {
    const r = await fetchJson<{ access_token: string; expires_in: number }>(
      "threads",
      `https://graph.threads.net/refresh_access_token?${qs({ grant_type: "th_refresh_token", access_token: accessToken })}`,
    );
    return { accessToken: r.access_token, expiresAt: new Date(Date.now() + r.expires_in * 1000) };
  },

  async publish(account, { text, media }) {
    const base = `${TH}/${account.externalId}`;
    const params: Record<string, string> = { text, access_token: account.accessToken };
    if (media[0]) Object.assign(params, { media_type: "IMAGE", image_url: media[0] });
    else params.media_type = "TEXT";
    const c = await fetchJson<{ id: string }>("threads", `${base}/threads`, { method: "POST", body: form(params) });
    await waitForContainer("threads", TH, c.id, account.accessToken);
    const pub = await fetchJson<{ id: string }>("threads", `${base}/threads_publish`, {
      method: "POST",
      body: form({ creation_id: c.id, access_token: account.accessToken }),
    });
    const info = await fetchJson<{ permalink?: string }>(
      "threads",
      `${TH}/${pub.id}?${qs({ fields: "permalink", access_token: account.accessToken })}`,
    ).catch(() => ({ permalink: undefined }));
    return { id: pub.id, url: info.permalink };
  },

  async metrics(account, postId) {
    try {
      const r = await fetchJson<{ data: { name: string; values: { value: number }[] }[] }>(
        "threads",
        `${TH}/${postId}/insights?${qs({ metric: "views,likes,replies,reposts,quotes", access_token: account.accessToken })}`,
      );
      const v = (n: string) => r.data.find((d) => d.name === n)?.values[0]?.value ?? 0;
      return { impressions: v("views"), likes: v("likes"), comments: v("replies"), shares: v("reposts") + v("quotes") };
    } catch {
      return null;
    }
  },
};
