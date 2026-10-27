import { back } from "@/lib/http";
import { getViewer } from "@/lib/session";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { site } from "@/site.config";

export async function POST(req: Request) {
  const v = await getViewer();
  if (!v?.user?.stripe_customer_id || !stripeConfigured()) return back(req, "/account/billing");
  const origin = site.url.startsWith("http://localhost") ? new URL(req.url).origin : site.url;
  const portal = await stripe().billingPortal.sessions.create({ customer: v.user.stripe_customer_id, return_url: `${origin}/account/billing` });
  return Response.redirect(portal.url, 303);
}
