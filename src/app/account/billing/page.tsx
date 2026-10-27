import Link from "next/link";
import { Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { requireViewer } from "@/lib/session";
import { stripe, stripeConfigured, syncSubscription } from "@/lib/stripe";
import { accessLabel, getUser, hasAccess } from "@/lib/users";
import { priceLabel, site } from "@/site.config";

export const dynamic = "force-dynamic";

const INCLUDED = [
  "Live scores & detailed stats for NBA, NBL, NRL, Super Rugby, A-League (men & women), ANZ Premiership, Super Smash and world cricket",
  "Match centres: player stats, team stats, timelines, shot charts and lineups",
  "Projections & win chances for every upcoming game, with fair odds",
  "Automated multi builder: most-likely combinations and longshot “massive multi” finder",
  "Odds & boost checker: see if a price (or a boosted price) beats our fair odds",
  "Bet slip that remembers picks across games, with combined price and returns",
  "Player form, hit rates, game logs and season leaderboards",
];

export default async function Billing({ searchParams }: { searchParams: Promise<{ success?: string; session_id?: string; canceled?: string; need?: string; welcome?: string; error?: string }> }) {
  const v = await requireViewer("/account/billing");
  const sp = await searchParams;
  let user = v.user;

  // Back from Stripe Checkout: sync straight away rather than waiting for the webhook
  if (user && sp.session_id && stripeConfigured()) {
    try {
      const cs = await stripe().checkout.sessions.retrieve(sp.session_id);
      if (cs.client_reference_id === String(user.id) && cs.subscription) {
        await syncSubscription(await stripe().subscriptions.retrieve(typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id));
        user = await getUser(user.id);
      }
    } catch {
      /* webhook will catch up */
    }
  }
  const active = user ? hasAccess(user) : v.isAdmin;

  return (
    <div className="space-y-5">
      <h1 className="display text-3xl font-extrabold">Membership</h1>
      {sp.welcome && <p className="rounded-md border border-court-dim bg-court/10 px-3 py-2 text-sm text-court-soft">Account created — one last step: start your membership below.</p>}
      {sp.need && !active && <p className="rounded-md border border-court-dim bg-court/10 px-3 py-2 text-sm text-court-soft">The stats and tools are for members. Start your membership to get in.</p>}
      {sp.success && active && <p className="rounded-md border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">You&apos;re in! Welcome to {site.name}. <Link href="/app" className="underline">Open the app →</Link></p>}
      {sp.success && !active && <p className="rounded-md border border-court-dim bg-court/10 px-3 py-2 text-sm text-court-soft">Payment received — activating your membership. Refresh in a few seconds.</p>}
      {sp.canceled && <p className="rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-300">Checkout cancelled — nothing was charged.</p>}
      {sp.error === "stripe" && <p className="rounded-md border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">Payments aren&apos;t configured yet (STRIPE_SECRET_KEY).</p>}

      {!user ? (
        <Card title="Owner account">
          <p className="text-sm text-ink-300">You&apos;re signed in with the owner login, which always has full access. Members manage their membership here.</p>
        </Card>
      ) : active ? (
        <Card title="Your membership" right={accessLabel(user)}>
          <div className="space-y-2 text-sm">
            <p>
              <b>{priceLabel} / month</b> — all sports, all tools.
            </p>
            {user.comp_until && Date.parse(user.comp_until) > Date.now() && <p className="text-ink-300">Complimentary access until {fmtDate(user.comp_until, { day: "numeric", month: "long", year: "numeric" })}.</p>}
            {user.current_period_end && (
              <p className="text-ink-300">
                {user.cancel_at_period_end ? "Ends" : user.sub_status === "trialing" ? "Trial ends" : "Renews"} on{" "}
                {fmtDate(user.current_period_end, { day: "numeric", month: "long", year: "numeric" })}.
              </p>
            )}
            {user.sub_status === "past_due" && <p className="text-loss">Your last payment failed — update your card to keep access.</p>}
          </div>
          {user.stripe_customer_id && (
            <form action="/api/stripe/portal" method="post" className="mt-4">
              <button className="rounded-lg border border-ink-700 px-4 py-2 text-sm hover:border-court">Manage billing, card or cancel</button>
            </form>
          )}
        </Card>
      ) : (
        <Card title="Start your membership">
          <div className="flex flex-wrap items-end gap-2">
            <span className="display text-5xl font-extrabold text-ink-100">${site.price.amount.toFixed(2)}</span>
            <span className="pb-2 text-sm text-ink-400">NZD / month · about 33c a day · cancel anytime</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-ink-200">
            {INCLUDED.map((x) => (
              <li key={x} className="flex gap-2">
                <span className="text-win">✓</span> {x}
              </li>
            ))}
          </ul>
          <form action="/api/stripe/checkout" method="post" className="mt-5">
            <button className="display w-full rounded-lg bg-court py-3 text-lg font-bold text-ink-950 hover:bg-court-soft">
              {site.trialDays ? `Start ${site.trialDays}-day free trial` : `Join for ${priceLabel}/month`}
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-ink-500">Secure checkout by Stripe. Apple Pay, Google Pay and cards accepted. Cancel anytime from this page.</p>
        </Card>
      )}
    </div>
  );
}
