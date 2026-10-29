import Link from "next/link";
import { site } from "@/site.config";
import { ZONES } from "@/content/blog";
import { FEATURES } from "@/content/features";

export function ResponsibleGambling({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-ink-500 ${className}`}>
      <b className="text-ink-300">18+ only.</b> {site.name} provides sports statistics and analysis for information and entertainment. It does not take bets and
      no outcome is guaranteed. Only bet what you can afford to lose. Need to talk to someone? NZ: Gambling Helpline{" "}
      <a href="tel:0800654655" className="underline">0800 654 655</a> · AU: Gambling Help Online{" "}
      <a href="tel:1800858858" className="underline">1800 858 858</a>.
    </p>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-20 border-t border-ink-800 bg-ink-900">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="display text-xl font-extrabold">
            <span>Quick <span className="text-court">Read</span></span>
          </div>
          <p className="mt-2 text-sm text-ink-400">{site.tagline}. Made in Aotearoa.</p>
        </div>
        <div>
          <div className="display mb-2 text-sm font-semibold text-ink-300">Guides by sport</div>
          <ul className="space-y-1 text-sm text-ink-400">
            {ZONES.map((z) => (
              <li key={z.id}>
                <Link href={`/blog/sport/${z.id}`} className="hover:text-ink-100">
                  {z.id === "betting-tools" ? "Betting tools & maths" : `${z.label} betting stats`}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="display mb-2 text-sm font-semibold text-ink-300">{site.name}</div>
          <ul className="space-y-1 text-sm text-ink-400">
            {FEATURES.map((f) => (
              <li key={f.slug}><Link href={`/features/${f.slug}`} className="hover:text-ink-100">{f.nav}</Link></li>
            ))}
            <li><Link href="/tools/betting-odds-calculator" className="hover:text-ink-100">Free odds calculator</Link></li>
            <li><Link href="/#pricing" className="hover:text-ink-100">Pricing</Link></li>
            <li><Link href="/blog" className="hover:text-ink-100">Blog</Link></li>
            <li><Link href="/login" className="hover:text-ink-100">Log in</Link></li>
            <li><Link href="/signup" className="hover:text-ink-100">Join</Link></li>
          </ul>
        </div>
        <div>
          <div className="display mb-2 text-sm font-semibold text-ink-300">The fine print</div>
          <ul className="space-y-1 text-sm text-ink-400">
            <li><Link href="/terms" className="hover:text-ink-100">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-ink-100">Privacy</Link></li>
            <li><Link href="/responsible-gambling" className="hover:text-ink-100">Responsible gambling</Link></li>
            <li><a href={`mailto:${site.supportEmail}`} className="hover:text-ink-100">{site.supportEmail}</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-8">
        <ResponsibleGambling />
        <p className="mt-3 text-xs text-ink-600">© {new Date().getFullYear()} {site.name}. Not affiliated with any league, team or bookmaker. Prices in NZD incl. GST where applicable.</p>
      </div>
    </footer>
  );
}
