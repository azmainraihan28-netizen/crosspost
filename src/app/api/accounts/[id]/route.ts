import { and, eq } from "drizzle-orm";
import { db, socialAccounts } from "@/db";
import { route } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/session";

export const DELETE = route(async (_req, ctx: RouteContext<"/api/accounts/[id]">) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const deleted = await db
    .delete(socialAccounts)
    .where(and(eq(socialAccounts.id, id), eq(socialAccounts.userId, user.id)))
    .returning({ id: socialAccounts.id });
  if (!deleted.length) throw new HttpError(404, "Account not found");
  return Response.json({ ok: true });
});
