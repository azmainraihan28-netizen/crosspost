import { route } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/session";
import { appUrl, getStripe } from "@/lib/billing";

export const POST = route(async () => {
  const user = await apiUser();
  if (!user.stripeCustomerId) throw new HttpError(400, "No billing account yet");
  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl()}/app/billing`,
  });
  return Response.json({ url: session.url });
});
