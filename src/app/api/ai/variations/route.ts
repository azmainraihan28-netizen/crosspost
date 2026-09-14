import { db, aiUsage } from "@/db";
import { route } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { assertLimit } from "@/lib/plans";
import { generateVariations } from "@/lib/ai";
import { variationsSchema } from "@/lib/validation";

export const maxDuration = 120;

export const POST = route(async (req) => {
  const user = await apiUser();
  const input = variationsSchema.parse(await req.json());
  await assertLimit(user, "ai");
  const variations = await generateVariations(input);
  await db.insert(aiUsage).values({ userId: user.id, kind: "variations" });
  return Response.json({ variations });
});
