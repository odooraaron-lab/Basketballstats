import { Prose } from "@/components/public/Prose";
import { priceLabel, site } from "@/site.config";

export const metadata = { title: "Terms of use", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <Prose title="Terms of use" updated="27 October 2026">
      <p>These terms apply to {site.name} ({site.url}). By creating an account you agree to them. If you don&apos;t agree, please don&apos;t use the service.</p>
      <h2>1. Who can use {site.name}</h2>
      <p>You must be 18 or older. {site.name} is a sports statistics and analysis service. It is not a bookmaker, does not accept bets or hold funds, and is not affiliated with any league, club, governing body or betting operator.</p>
      <h2>2. Information, not advice</h2>
      <p>Stats, projections, chances, fair odds and multi suggestions are estimates for information and entertainment. They can be wrong, late or incomplete, and no result is guaranteed. Nothing on {site.name} is financial advice or a recommendation to bet. Any decision to bet is yours, and so is the risk.</p>
      <h2>3. Membership and payment</h2>
      <ul>
        <li>Membership costs {priceLabel} per month (GST included where applicable), billed in advance through Stripe until you cancel.</li>
        <li>You can cancel anytime from your Membership page. You keep access until the end of the period you&apos;ve paid for, and you won&apos;t be charged again.</li>
        <li>We don&apos;t give refunds for part-months, except where the law (including the Consumer Guarantees Act 1993 and the Australian Consumer Law) says we must.</li>
        <li>If we change the price, we&apos;ll tell you at least 30 days before your next payment, and you can cancel before it applies.</li>
      </ul>
      <h2>4. Your account</h2>
      <p>Keep your password private, and use your membership for yourself only. Don&apos;t share logins, resell access, scrape the site or copy our data or analysis in bulk. We may suspend accounts that break these terms.</p>
      <h2>5. Availability</h2>
      <p>We rely on third-party data feeds. Some data may sometimes be delayed or unavailable, or a competition may drop out of coverage. We&apos;ll do our best to keep things running, but we can&apos;t promise uninterrupted service.</p>
      <h2>6. Liability</h2>
      <p>As far as the law allows, {site.name} isn&apos;t liable for any loss, including betting losses, that comes from using the service or relying on its information. Nothing in these terms limits rights you have under consumer law that can&apos;t be excluded.</p>
      <h2>7. Changes and contact</h2>
      <p>We may update these terms and will post the new version here. Questions? Email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.</p>
    </Prose>
  );
}
