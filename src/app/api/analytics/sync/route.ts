import { route } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { syncMetrics } from "@/lib/publisher";

export const maxDuration = 60;

export const POST = route(async () => {
  const user = await apiUser();
  const synced = await syncMetrics(user.id);
  return Response.json({ synced });
});
