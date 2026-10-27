import type Stripe from "stripe";
import { logEvent, q1 } from "@/lib/db";
import { stripe, syncSubscription } from "@/lib/stripe";
import { site } from "@/site.config";

// Stripe → us. Endpoint: https://<your-domain>/api/stripe/webhook
// Events: checkout.session.completed, customer.subscription.created/updated/deleted, invoice.payment_failed
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return new Response("not configured", { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(body, sig, secret);
  } catch {
    return new Response("bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.metadata?.site !== site.stripeTag || !s.subscription) break;
        const sub = await stripe().subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
        await syncSubscription(sub);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customer = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        const u = customer ? await q1<{ id: number }>(`SELECT id FROM users WHERE stripe_customer_id = $1`, [customer]) : null;
        if (u) await logEvent("payment_failed", u.id, { amount: inv.amount_due });
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const customer = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        const u = customer ? await q1<{ id: number }>(`SELECT id FROM users WHERE stripe_customer_id = $1`, [customer]) : null;
        if (u && inv.amount_paid > 0) await logEvent("payment", u.id, { amount: inv.amount_paid, currency: inv.currency });
        break;
      }
    }
  } catch (e) {
    // Let Stripe retry
    return new Response(`error: ${(e as Error).message}`, { status: 500 });
  }
  return new Response("ok");
}
