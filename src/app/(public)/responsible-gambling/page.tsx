import { Prose } from "@/components/public/Prose";
import { site } from "@/site.config";

export const metadata = { title: "Responsible gambling", description: "Gambling help in New Zealand and Australia, and how to keep betting fun.", alternates: { canonical: "/responsible-gambling" } };

export default function ResponsibleGamblingPage() {
  return (
    <Prose title="Responsible gambling">
      <p>{site.name} is built for people who enjoy sport and like to bet for fun. Better information helps, but no stat, model or multi removes the risk of losing. Betting should never be a way to make money you need.</p>
      <h2>Keep it fun</h2>
      <ul>
        <li>Set a budget for the week before you look at a single game, and stick to it.</li>
        <li>Never chase losses. A big longshot multi to &ldquo;win it back&rdquo; usually makes things worse.</li>
        <li>Use the deposit limits, time-outs and self-exclusion tools your betting provider offers.</li>
        <li>Take breaks. If betting stops being fun, stop.</li>
      </ul>
      <h2>Signs it might be a problem</h2>
      <ul>
        <li>Betting more than you planned, or more than you can afford</li>
        <li>Borrowing money or using bill money to bet</li>
        <li>Hiding your betting from people close to you</li>
        <li>Feeling anxious or irritable when you&apos;re not betting</li>
      </ul>
      <h2>Free, confidential help</h2>
      <p><strong>New Zealand:</strong> Gambling Helpline <a href="tel:0800654655">0800 654 655</a> (24/7), or text 8006. Visit <a href="https://www.gamblinghelpline.co.nz" rel="noopener">gamblinghelpline.co.nz</a>.</p>
      <p><strong>Australia:</strong> Gambling Help Online <a href="tel:1800858858">1800 858 858</a> (24/7), or visit <a href="https://www.gamblinghelponline.org.au" rel="noopener">gamblinghelponline.org.au</a>. You can also self-exclude from all licensed Australian online wagering through <a href="https://www.betstop.gov.au" rel="noopener">BetStop</a>.</p>
      <h2>Your membership</h2>
      <p>If you want a break from {site.name} too, you can cancel your membership any time from the Membership page, or delete your account in Settings. You must be 18 or older to use {site.name}.</p>
    </Prose>
  );
}
