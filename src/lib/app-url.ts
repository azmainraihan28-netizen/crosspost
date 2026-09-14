/** Public base URL: APP_URL, else Vercel's production domain, else localhost. No trailing slash. */
export function appUrl() {
  const url =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}
