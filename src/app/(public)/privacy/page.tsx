import { Prose } from "@/components/public/Prose";
import { site } from "@/site.config";

export const metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <Prose title="Privacy policy" updated="27 October 2026">
      <p>{site.name} follows the New Zealand Privacy Act 2020 and, for Australian members, the Australian Privacy Principles. This page explains what we collect and why.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your email, first name and a scrambled (hashed) version of your password. We never see or store the password itself.</li>
        <li><strong>Membership:</strong> your Stripe customer and subscription reference, and your membership status. Card details are handled by Stripe and never reach us.</li>
        <li><strong>Settings:</strong> your theme, which sports you&apos;ve hidden, and your bet slip, which stays on your device.</li>
        <li><strong>Usage:</strong> the pages you view, the site you came from, your rough country and your device type. We use our own first-party analytics, with no advertising trackers.</li>
      </ul>
      <h2>Why</h2>
      <p>We use this to run your account and membership, keep the service secure, see which features and sports people use, and improve the site. We don&apos;t sell your information.</p>
      <h2>Who we share it with</h2>
      <p>Stripe (payments), our hosting and database providers, and our email provider (for password resets). They only receive what they need to provide their service.</p>
      <h2>Your rights</h2>
      <p>You can see and change your details in Settings, and you can delete your account at any time from Settings. Deleting your account cancels your membership and removes your account data. Payment records Stripe must keep by law stay with Stripe. To ask for a copy of your information or to make a privacy complaint, email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. You can also contact the NZ Office of the Privacy Commissioner.</p>
      <h2>Cookies</h2>
      <p>We use a few first-party cookies: one keeps you logged in, one remembers your theme and hidden sports, and an anonymous visitor ID counts unique visits. There are no third-party advertising cookies.</p>
    </Prose>
  );
}
