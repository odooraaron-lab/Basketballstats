import { logEvent } from "@/lib/db";
import { back } from "@/lib/http";
import { getViewer } from "@/lib/session";
import { customerFor, lineItem, stripe, stripeConfigured } from "@/lib/stripe";
import { site } from "@/site.config";

export async function POST(req: Request) {
  const v = await getViewer();
  if (!v) return back(req, "/login", { next: "/account/billing" });
  if (!v.user) return back(req, "/account/billing", { error: "owner" }); // the env owner login can't subscribe
  if (!stripeConfigured()) return back(req, "/account/billing", { error: "stripe" });
  if (v.hasAccess && v.user.sub_status !== "none") return back(req, "/account/billing");

  const customer = await customerFor(v.user);
  const origin = site.url.startsWith("http://localhost") ? new URL(req.url).origin : site.url;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: String(v.user.id),
    line_items: [lineItem()],
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { site: site.stripeTag, user_id: String(v.user.id) },
      ...(site.trialDays ? { trial_period_days: site.trialDays } : {}),
    },
    metadata: { site: site.stripeTag, user_id: String(v.user.id) },
    success_url: `${origin}/account/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/account/billing?canceled=1`,
  });
  await logEvent("checkout_started", v.user.id);
  return Response.redirect(session.url!, 303);
}
