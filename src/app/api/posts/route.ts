import { route } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { savePost } from "@/lib/posts";
import { postInputSchema } from "@/lib/validation";

export const POST = route(async (req) => {
  const user = await apiUser();
  const input = postInputSchema.parse(await req.json());
  const post = await savePost(user, input);
  return Response.json({ post });
});
