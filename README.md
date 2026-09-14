# Crosspost

Compose once, publish everywhere. A lean, self-hostable social media scheduler:

- **Connect accounts via OAuth**: X, LinkedIn, Instagram (Business/Creator), Facebook Pages, Threads
- **Compose once**, customize per network, with **live per-platform previews** and character limits
- **Publish now, schedule, or add to a queue** of weekly posting times; **calendar** with drag-to-reschedule; **drafts**
- **AI** (OpenAI, or Anthropic Claude): platform-tuned **post variations** and a **week of content from a topic**
- **Analytics**: reach and engagement pulled from each network
- **Email/password auth** and a **Stripe** subscription (Starter free / Pro $19)
- **Demo mode**: try everything locally before registering any developer apps

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Drizzle ORM + libSQL (SQLite locally, Turso in production), Stripe, and the OpenAI SDK (Anthropic optional). Platform clients and prompts are adapted from [langchain-ai/social-media-agent](https://github.com/langchain-ai/social-media-agent) (MIT; see `THIRD_PARTY_NOTICES.md`).

---

## Quick start (local)

Requirements: Node.js 20.9+.

```bash
npm install
npm run setup      # creates .env.local with generated secrets + creates local.db
npm run dev        # http://localhost:3000
```

Sign up, open **Accounts**, and click **Connect** on any network. Networks without OAuth credentials connect as **demo accounts**: publishing is simulated and analytics show sample numbers, so you can click through the whole product.

To enable the rest, add keys to `.env.local` and restart `npm run dev`:

| Feature | What to set |
| --- | --- |
| AI variations & week planner | `OPENAI_API_KEY` |
| Upgrades / payments | `STRIPE_SECRET_KEY` (test mode), optionally `STRIPE_WEBHOOK_SECRET` |
| Real posting to a network | That network's `*_CLIENT_ID` / `*_CLIENT_SECRET` (see below) |

> **Note:** scripts use `--webpack`. Turbopack needs native binaries, which some locked-down Windows machines block. Webpack works everywhere.

### Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server (includes the in-process scheduler) |
| `npm run build` / `npm start` | Production build / server |
| `npm run db:push` | Apply `src/db/schema.ts` to the database |
| `npm run db:studio` | Browse the database |
| `npm run typecheck` / `npm run lint` | Checks |

---

## Environment variables

All variables are documented in [`.env.example`](.env.example).

| Variable | Required | Description |
| --- | --- | --- |
| `APP_URL` | yes | Public base URL, no trailing slash. Used for OAuth callbacks and Stripe redirects. |
| `AUTH_SECRET` | yes | Signs session cookies (32+ random bytes). |
| `ENCRYPTION_KEY` | recommended | Encrypts OAuth tokens at rest (AES-256-GCM). Falls back to `AUTH_SECRET`. **Changing it invalidates connected accounts.** |
| `DATABASE_URL` | yes | `file:local.db` locally; `libsql://…turso.io` in production. `TURSO_DATABASE_URL` (set by Vercel's Turso integration) also works. |
| `DATABASE_AUTH_TOKEN` | prod | Turso auth token. `TURSO_AUTH_TOKEN` also works. |
| `INTERNAL_SCHEDULER` | no | `true` (default) runs the publish loop every 30s inside the server. Set `false` on serverless. |
| `CRON_SECRET` | prod | Bearer token for `GET/POST /api/cron/publish`. |
| `DEMO_MODE` | no | `true` lets unconfigured networks connect as demo accounts. **Set `false` in production.** |
| `OPENAI_API_KEY` | for AI | OpenAI API key. Used whenever it is set. |
| `OPENAI_MODEL` | no | Defaults to `gpt-5.5`. |
| `ANTHROPIC_API_KEY` | no | Alternative AI provider, used only if `OPENAI_API_KEY` is empty. |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-5`. |
| `STRIPE_SECRET_KEY` | for billing | `sk_test_…` while testing. |
| `STRIPE_WEBHOOK_SECRET` | for billing | Signing secret of your webhook endpoint. |
| `STRIPE_PRICE_ID` | no | Recurring Price to sell. If empty, a $19/month price is created inline at checkout. |
| `BLOB_READ_WRITE_TOKEN` | prod | Vercel Blob token for image uploads. Without it, uploads go to `public/uploads` (dev only). |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | per network | X OAuth 2.0 app |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | per network | LinkedIn app |
| `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` | per network | Meta app (Instagram API with Instagram Login) |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | per network | Meta app (Facebook Login) |
| `THREADS_CLIENT_ID` / `THREADS_CLIENT_SECRET` | per network | Meta app (Threads API) |
| `META_GRAPH_VERSION` | no | Defaults to `v23.0`. |

---

## Connecting real social networks

Every network uses the callback URL **`{APP_URL}/api/connect/{platform}/callback`**, where `{platform}` is `x`, `linkedin`, `instagram`, `facebook` or `threads`. Register it exactly (including `http://localhost:3000` for local testing where the platform allows it).

### X
1. [developer.x.com](https://developer.x.com) → Project → App → **User authentication settings**.
2. Enable **OAuth 2.0**, type **Web App / Confidential client**, permissions **Read and write**.
3. Callback: `…/api/connect/x/callback`. Copy the **OAuth 2.0 Client ID and Secret**.
4. Scopes requested: `tweet.read tweet.write users.read offline.access media.write`.
5. Reading post metrics requires a paid API tier (Basic or higher). Without it, publishing still works and analytics show "not available".

### LinkedIn
1. [linkedin.com/developers](https://www.linkedin.com/developers/apps) → Create app (needs a Company Page).
2. **Products** → add **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn**.
3. **Auth** → add the redirect URL; copy Client ID/Secret.
4. Posts publish to the member's personal profile. Engagement metrics need `r_member_social`, which LinkedIn only grants to approved partners, so LinkedIn analytics show "not available" unless you're approved.

### Instagram
1. [developers.facebook.com](https://developers.facebook.com/apps) → Create app → add **Instagram** → **API setup with Instagram login**.
2. Add the redirect URL under *Business login settings*; copy the **Instagram app ID and secret**.
3. Requires an Instagram **Business or Creator** account. Instagram needs publicly reachable image URLs, so use `BLOB_READ_WRITE_TOKEN` (localhost URLs won't work).
4. Add testers in the dashboard until your app passes App Review for `instagram_business_content_publish`.

### Facebook Pages
1. Meta app → add **Facebook Login for Business** → valid OAuth redirect URI.
2. Permissions: `pages_show_list`, `pages_manage_posts`, `pages_read_engagement` (App Review is needed for public users).
3. Every Page the user manages is connected as its own account.

### Threads
1. Meta app → add the **Threads API** use case → set the redirect callback URL.
2. Copy the **Threads app ID and secret**. Add yourself as a Threads tester until the app is approved.

---

## Stripe (test mode)

1. In the Stripe Dashboard (**Test mode**), copy the secret key into `STRIPE_SECRET_KEY`.
2. Optional: create a Product with a recurring monthly Price and set `STRIPE_PRICE_ID`.
3. Enable the **Customer portal** (Settings → Billing → Customer portal) so users can cancel or update cards.
4. Webhook endpoint: `{APP_URL}/api/stripe/webhook` with events
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
   Locally, use the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Even without the webhook, the billing page syncs the subscription when Checkout redirects back.
5. Test card: `4242 4242 4242 4242`, any future expiry and CVC.

Plan limits live in `src/lib/plans.ts`.

---

## Deploying

The app needs three things in production: a database (Turso), something that runs `/api/cron/publish` every minute (or a long-running server), and public image storage.

### Option A: Vercel + Turso (recommended)

1. **Database.** Create a Turso database:
   ```bash
   turso db create crosspost
   turso db show crosspost --url
   turso db tokens create crosspost
   ```
   Then create the tables from your machine:
   ```bash
   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npx drizzle-kit push
   ```
2. **Push the code to GitHub** and import the repo in Vercel.
3. **Environment variables** (Project → Settings → Environment Variables): everything from `.env.example`, with
   `APP_URL=https://your-domain`, `INTERNAL_SCHEDULER=false`, `DEMO_MODE=false`, and new random `AUTH_SECRET`, `ENCRYPTION_KEY` and `CRON_SECRET` values.
4. **Storage.** Vercel → Storage → create a **Blob** store and connect it (this adds `BLOB_READ_WRITE_TOKEN`).
5. **Scheduler.** Posts need a ping every minute:
   - **Vercel Pro:** add a `vercel.json`:
     ```json
     { "crons": [{ "path": "/api/cron/publish", "schedule": "* * * * *" }] }
     ```
     Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
   - **Vercel Hobby** (cron limited to daily): this repo includes `.github/workflows/publish-scheduler.yml`, which calls the
     endpoint every 5 minutes. Add a repo secret `CRON_SECRET` (same value as Vercel) and a repo variable
     `CRON_URL=https://your-domain/api/cron/publish`. GitHub may delay scheduled runs by a few minutes, and on **private**
     repos every run uses billable Actions minutes (the 2,000 free minutes cover roughly every 30 minutes). For
     on-the-minute publishing, use cron-job.org (every minute) or Vercel Pro instead.
7. **Health check:** `curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/health` shows which settings
   are configured (never their values).
8. Update every OAuth app's callback URL and the Stripe webhook to the production domain.

### Option B: a single Node server (Railway, Render, Fly.io, VPS)

```bash
npm ci && npm run build && npm start
```
Keep `INTERNAL_SCHEDULER=true` and the server publishes on its own; no cron needed. Run only **one** instance (or disable the internal scheduler on extras and use the cron endpoint). Use Turso or a persistent volume for `DATABASE_URL=file:/data/app.db`. Set `BLOB_READ_WRITE_TOKEN`, because `next start` doesn't serve files added to `public/` after the build.

### Production checklist
- [ ] `DEMO_MODE=false`
- [ ] Strong, unique `AUTH_SECRET`, `ENCRYPTION_KEY` and `CRON_SECRET`
- [ ] `APP_URL` uses https and matches every OAuth callback
- [ ] Stripe webhook configured; switch to live keys when ready
- [ ] Meta/LinkedIn/X apps submitted for review where required
- [ ] Update the `APP_NAME` in `src/lib/brand.ts`, and add terms and privacy pages (Meta and LinkedIn review require a privacy policy URL)

---

## How it works

```
src/
  app/
    page.tsx                  Landing page
    (auth)/login, signup      Email/password auth
    app/                      Dashboard: overview, compose, calendar, queue, ai, analytics, accounts, billing
    api/
      auth/*                  signup / login / logout (bcrypt + signed JWT cookie)
      connect/[platform]      OAuth start (PKCE + state cookie) and callback
      posts, posts/[id]       Create/update/schedule/publish/retry/delete
      queue                   Weekly posting times
      ai/variations, ai/week  AI generation
      analytics/sync          Pull metrics from each network
      billing/*, stripe/webhook
      cron/publish            Publishes due posts (bearer-protected)
      uploads                 Image uploads (Vercel Blob or local)
  db/schema.ts                users, social_accounts, posts, post_targets, metrics, queue_slots, ai_usage
  lib/
    platforms/                One adapter per network: authorizeUrl, exchangeCode, refresh, publish, metrics
    publisher.ts              Publishing engine, token refresh, metrics sync
    queue.ts                  Timezone-aware slot calculation
    ai.ts, ai-providers.ts    Prompts + structured outputs (OpenAI or Anthropic)
    plans.ts                  Plan limits and usage
  scheduler-node.ts           In-process scheduler (started from instrumentation.ts)
```

- A **post** has shared text and media. Each **post target** is one connected account, with an optional per-network text override and its own publish status. Targets publish independently, so a post ends up `published`, `partial` or `failed`, and failed targets can be retried.
- Publishing claims the post atomically (`→ publishing`), so the scheduler and "Publish now" can't double-post. Posts stuck in `publishing` for 15 minutes are re-queued.
- OAuth access and refresh tokens are encrypted with AES-256-GCM. X, Instagram and Threads tokens refresh automatically before publishing.
- AI calls use structured outputs, so responses always parse. Over-limit variations get a second "condense" pass.

### Adding a network
Implement `PlatformAdapter` in `src/lib/platforms/`, add metadata in `meta.ts`, register it in `platforms/index.ts`, and add a badge in `components/platform-badge.tsx`.
