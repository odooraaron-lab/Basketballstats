// Brand and offer. Change the name/domain here; everything else reads from this file.
export const site = {
  name: "Courtside",
  tagline: "Live sports stats & betting tools for NZ and Australia",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://courtside.co.nz").replace(/\/$/, ""),
  supportEmail: process.env.SUPPORT_EMAIL || "hello@courtside.co.nz",
  price: { amount: 9.99, cents: 999, currency: "NZD", interval: "month" as const },
  trialDays: Number(process.env.STRIPE_TRIAL_DAYS ?? 0) || 0,
  /** Tag on every Stripe object — the Stripe account is shared with other sites. */
  stripeTag: "courtside",
};

export const priceLabel = `$${site.price.amount.toFixed(2)} ${site.price.currency}`;
