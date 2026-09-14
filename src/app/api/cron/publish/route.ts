import { publishDuePosts } from "@/lib/publisher";

export const maxDuration = 300;

// Hit this every minute from Vercel Cron, GitHub Actions, cron-job.org, etc.
// Authorization: Bearer $CRON_SECRET
async function handler(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const published = await publishDuePosts();
  return Response.json({ published, at: new Date().toISOString() });
}

export const GET = handler;
export const POST = handler;
