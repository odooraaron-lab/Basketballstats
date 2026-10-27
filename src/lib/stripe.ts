import "server-only";
import Stripe from "stripe";
import { logEvent, q, q1 } from "./db";
import type { User } from "./users";
import { site } from "@/site.config";

let client: Stripe | null = null;
export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export function stripe(): Stripe {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

/** The monthly price: a Price you created in Stripe (STRIPE_PRICE_ID), or NZD 9.99/month built inline. */
export function lineItem(): Stripe.Checkout.SessionCreateParams.LineItem {
  if (process.env.STRIPE_PRICE_ID) return { price: process.env.STRIPE_PRICE_ID, quantity: 1 };
  return {
    quantity: 1,
    price_data: {
      currency: site.price.currency.toLowerCase(),
      unit_amount: site.price.cents,
      recurring: { interval: site.price.interval },
      product_data: { name: `${site.name} membership`, metadata: { site: site.stripeTag } },
    },
  };
}

/** Find or create the user's Stripe customer (tagged, since the Stripe account is shared). */
export async function customerFor(user: User): Promise<string> {
  if (user.stripe_customer_id) return user.stripe_customer_id;
  const c = await stripe().customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { site: site.stripeTag, user_id: String(user.id) },
  });
  await q(`UPDATE users SET stripe_customer_id = $2 WHERE id = $1`, [user.id, c.id]);
  return c.id;
}

const periodEnd = (s: Stripe.Subscription): number | null => {
  // Newer API versions moved the period onto subscription items.
  const top = (s as unknown as { current_period_end?: number }).current_period_end;
  const item = s.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  return top ?? item?.current_period_end ?? null;
};

/** Write a subscription's state onto its user. Returns the user id (or null if not ours). */
export async function syncSubscription(s: Stripe.Subscription): Promise<number | null> {
  const customer = typeof s.customer === "string" ? s.customer : s.customer.id;
  let userId = Number(s.metadata?.user_id) || null;
  if (s.metadata?.site && s.metadata.site !== site.stripeTag) return null; // another site's subscription
  if (!userId) userId = (await q1<{ id: number }>(`SELECT id FROM users WHERE stripe_customer_id = $1`, [customer]))?.id ?? null;
  if (!userId) return null;
  const end = periodEnd(s);
  const before = await q1<{ sub_status: string }>(`SELECT sub_status FROM users WHERE id = $1`, [userId]);
  await q(
    `UPDATE users SET stripe_customer_id = $2, subscription_id = $3, sub_status = $4, current_period_end = $5, cancel_at_period_end = $6 WHERE id = $1`,
    [userId, customer, s.id, s.status, end ? new Date(end * 1000).toISOString() : null, s.cancel_at_period_end || Boolean(s.cancel_at)],
  );
  if (before && before.sub_status !== s.status) {
    const type = s.status === "active" || s.status === "trialing" ? (before.sub_status === "none" || before.sub_status === "incomplete" ? "subscribed" : "reactivated") : s.status === "canceled" ? "cancelled" : `status_${s.status}`;
    await logEvent(type, userId, { status: s.status, from: before.sub_status });
  }
  return userId;
}
