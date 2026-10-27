import { back } from "@/lib/http";
import { getViewer } from "@/lib/session";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { site } from "@/site.config";

export async function POST(req: Request) {
  const v = await getViewer();
  if (!v?.user?.stripe_customer_id || !stripeConfigured()) return back(req, "/account/billing");
  const origin = new URL(req.url).origin; // return to whichever domain they paid from
  try {
    const portal = await stripe().billingPortal.sessions.create({ customer: v.user.stripe_customer_id, return_url: `${origin}/account/billing` });
    return Response.redirect(portal.url, 303);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe portal]", msg);
    return back(req, "/account/billing", { error: "checkout", msg: msg.slice(0, 200) });
  }
}
