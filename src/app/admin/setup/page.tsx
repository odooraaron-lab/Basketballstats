import { Card } from "@/components/ui";
import { dbConfigured, q } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { stripeConfigured } from "@/lib/stripe";
import { priceLabel, site } from "@/site.config";
import { setupDbAction } from "../actions";

export default async function Setup() {
  let dbOk = false;
  let dbErr = "";
  if (dbConfigured()) {
    try {
      await q(`SELECT 1`);
      dbOk = true;
    } catch (e) {
      dbErr = (e as Error).message;
    }
  }
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const checks: [string, boolean, string][] = [
    ["AUTH_SECRET", Boolean(process.env.AUTH_SECRET), "Long random string that signs logins (openssl rand -hex 32)."],
    ["APP_USERNAME / APP_PASSWORD", Boolean(process.env.APP_USERNAME && process.env.APP_PASSWORD), "Your owner login — always admin, works without the database."],
    ["DATABASE_URL", dbOk, dbConfigured() ? (dbOk ? "Connected; tables created automatically." : `Can't connect: ${dbErr}`) : "Neon Postgres connection string (Vercel → Storage → Neon, or neon.tech)."],
    ["STRIPE_SECRET_KEY", stripeConfigured(), key ? (key.startsWith("sk_live") ? "Live mode." : "Test mode — switch to the live key to take real payments.") : "From Stripe → Developers → API keys."],
    ["STRIPE_WEBHOOK_SECRET", Boolean(process.env.STRIPE_WEBHOOK_SECRET), `Add an endpoint ${site.url}/api/stripe/webhook with events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed — then paste its signing secret.`],
    ["STRIPE_PRICE_ID (optional)", true, process.env.STRIPE_PRICE_ID ? `Using ${process.env.STRIPE_PRICE_ID}.` : `Not set — checkout uses ${priceLabel}/month built in. Set a Price ID to manage the price in Stripe instead.`],
    ["STRIPE_TRIAL_DAYS (optional)", true, site.trialDays ? `${site.trialDays}-day free trial.` : "No free trial. Set e.g. 7 to offer one."],
    ["NEXT_PUBLIC_SITE_URL", Boolean(process.env.NEXT_PUBLIC_SITE_URL), `Currently ${site.url} — used for SEO links, Stripe returns and emails.`],
    ["RESEND_API_KEY / EMAIL_FROM", emailConfigured(), "Sends password-reset emails (resend.com). Without it, reset links can't be emailed."],
    ["ANTHROPIC_API_KEY (optional)", Boolean(process.env.ANTHROPIC_API_KEY), "Better screenshot reading in Odds check."],
  ];
  return (
    <div className="space-y-5">
      <Card title="Configuration">
        <ul className="space-y-3">
          {checks.map(([k, ok, note]) => (
            <li key={k} className="flex gap-3 text-sm">
              <span className={ok ? "text-win" : "text-loss"}>{ok ? "✓" : "✗"}</span>
              <span>
                <code className="text-ink-100">{k}</code>
                <span className="block text-xs text-ink-400">{note}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      {dbConfigured() && (
        <Card title="Database">
          <form action={setupDbAction}>
            <button className="rounded-lg border border-ink-700 px-4 py-2 text-sm hover:border-court">Create / upgrade tables now</button>
          </form>
          <p className="mt-2 text-xs text-ink-500">Tables are also created automatically on first use.</p>
        </Card>
      )}
      <Card title="Shared Stripe account">
        <p className="text-sm text-ink-300">
          Every customer, subscription and checkout is tagged <code>site={site.stripeTag}</code>, so payments for your other sites on the same Stripe account are ignored here. In the Stripe Billing portal settings, allow customers to cancel and update their card.
        </p>
      </Card>
    </div>
  );
}
