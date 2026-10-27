import Link from "next/link";
import { ResponsibleGambling } from "@/components/public/PublicFooter";
import { POSTS, readingMinutes, zoneById } from "@/content/blog";
import { allSportStatus, type SportStatus } from "@/lib/seasonStatus";
import { priceLabel, site } from "@/site.config";

export const revalidate = 1800;
export const maxDuration = 60;

export const metadata = {
  title: { absolute: `Live Sports Stats & Betting Odds Tools NZ | ${site.name}` },
  description:
    "Live sports stats, detailed stats and betting odds tools for New Zealand & Australia. NRL, Super Rugby, ANZ Premiership, A-League, Super Smash, NBA, NBL and cricket — with an automated multi builder and boosted-odds checker. $9.99 NZD/month.",
  keywords: ["live sports", "betting odds", "live stats", "stat tracker", "detailed stats", "sports betting NZ", "multi builder", "boosted odds", "NRL stats", "Super Rugby stats", "netball stats", "A-League stats", "NBA player props", "same game multi"],
  alternates: { canonical: "/" },
  openGraph: {
    title: `${site.name} — live sports stats & betting tools for NZ`,
    description: "Every stat, every sport, one subscription. Automated multi builder, odds checker and live match centres for NZ & Australian sport.",
    url: site.url,
    images: [{ url: "/images/app-match.png", width: 1280, height: 800, alt: "Courtside match centre" }],
  },
};

const FEATURES: { title: string; body: string; tag: string }[] = [
  {
    tag: "Live stats",
    title: "Live scores & a real stat tracker",
    body: "Every game across eight competitions with live scores, running timelines and box scores that update as they happen. Times are shown in NZ time, so there's no converting from Sydney or US Eastern.",
  },
  {
    tag: "Detailed stats",
    title: "Detailed stats nobody else shows in NZ",
    body: "Official NRL and netball match data, with more than 50 stats per player: run metres, tackle breaks, line breaks, gains, intercepts, centre-pass receives and super shots. Each competition has its own ladder, power ratings and season leaders.",
  },
  {
    tag: "Automated multis",
    title: "Automated multi builder",
    body: "Scan a game and the builder simulates it 10,000 times to find the most likely combinations, then hunts for realistic longshots. For example, a player who averages 4 points but has hit 8 in recent games. You can build multis across a whole round in one tap.",
  },
  {
    tag: "Odds hunting",
    title: "Boosted odds & value checker",
    body: "Every upcoming game gets our own win chance and fair odds. Type in a bookie's price or a boosted price and see straight away whether it beats our number. You can also upload a screenshot of a props page and the app reads the lines for you.",
  },
  {
    tag: "Interactive",
    title: "Interactive match centres",
    body: "Sort any stat, compare players side by side, open shot charts and lineups, and tap any player to see their full game log. Every table works on your phone.",
  },
  {
    tag: "Projections",
    title: "Projections, margins & totals",
    body: "Projected scores, winning margin bands, line and total chances, both-teams-to-score and correct scores for football, plus an anytime try or goal scorer chance for every player.",
  },
  {
    tag: "Form",
    title: "Player form & hit rates",
    body: "See the last 5 and last 10 games, how often a player has cleared a line, season averages and league ranks. It's everything you'd want to know before backing a player prop.",
  },
  {
    tag: "Bet slip",
    title: "One bet slip across every game",
    body: "Add picks from any game into one slip that's saved on your device. You'll see the combined chance, the fair price and your return, then copy the slip straight into your betting app.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What do I get for $9.99 a month?",
    a: "Everything. You get every sport (NRL, Super Rugby, ANZ Premiership netball, A-League men's and women's, Super Smash, world cricket, NBA and NBL) and every tool: live stats, match centres, projections, the automated multi builder, the longshot finder, the odds and boost checker and the bet slip. There are no tiers and no add-ons.",
  },
  {
    q: "Is Courtside a betting site?",
    a: "No. We don't take bets, hold money or work for a bookmaker. Courtside is a stats and analysis service: it helps you research a bet before you place it wherever you normally bet.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel from your Membership page in two taps. You keep access until the end of the month you've paid for, and you won't be charged again.",
  },
  {
    q: "Which sports are covered right now?",
    a: "NBA, NBL, NRL, Super Rugby Pacific, the A-League (men's and women's), the ANZ Premiership, Super Smash and every international and domestic cricket match. When a competition is between seasons, the app tells you when it's back, and you can still explore the whole last season.",
  },
  {
    q: "How are the win chances and fair odds worked out?",
    a: "We rate every team's attack and defence from this season's results, allow for home advantage, and turn the projected margin into a chance. Early in a season we blend in last season so a couple of games can't swing everything. Player chances come from season rates, recent form and the projected score.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. It's built mobile-first: every table scrolls, every page works one-handed, and there's a light and dark mode in your settings.",
  },
  {
    q: "Is it for New Zealand or Australia?",
    a: "Both, with a Kiwi lean. Times are in NZ time, and the sports are the ones we actually watch here: the Warriors, the Breakers, Super Rugby, the ANZ Premiership and the Super Smash, plus the NBA.",
  },
  {
    q: "Do you guarantee winners?",
    a: "No one honestly can. Courtside gives you better information. It doesn't remove the risk. You must be 18 or over, and you should only bet what you can afford to lose.",
  },
];

const STATE_STYLE: Record<SportStatus["state"], { label: string; cls: string }> = {
  live: { label: "LIVE", cls: "bg-loss/15 text-loss" },
  "in-season": { label: "In season", cls: "bg-win/15 text-win" },
  "off-season": { label: "Off-season", cls: "bg-ink-800 text-ink-400" },
};

export default async function Landing() {
  const status = await allSportStatus();
  const on = status.filter((s) => s.state !== "off-season").length;
  const guides = POSTS.filter((p) => p.featured).slice(0, 3).concat(POSTS.filter((p) => !p.featured)).slice(0, 6);

  const jsonLd = [
    { "@context": "https://schema.org", "@type": "Organization", name: site.name, url: site.url, email: site.supportEmail, areaServed: ["NZ", "AU"] },
    { "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.url },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: site.name,
      applicationCategory: "SportsApplication",
      operatingSystem: "Web, iOS, Android",
      description: "Live sports stats, detailed stats and betting odds tools for NZ and Australian sport.",
      offers: { "@type": "Offer", price: site.price.amount.toFixed(2), priceCurrency: site.price.currency, category: "subscription", url: `${site.url}/signup` },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-800">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(242,107,29,0.18),transparent_60%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-ink-700 px-3 py-1 text-xs text-ink-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-loss" /> {on} of {status.length} competitions in season right now
            </p>
            <h1 className="display text-4xl font-extrabold leading-[1.05] text-ink-100 sm:text-6xl">
              Live sports stats &amp; betting odds tools <span className="text-court">built for Kiwi punters</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-300">
              Detailed stats, live scores and interactive match centres for the NRL, Super Rugby, ANZ Premiership, A-League, Super Smash, NBA, NBL and world cricket. They come with an
              automated multi builder and an odds checker that tells you when a price, or a boost, is actually worth it.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup" className="display rounded-xl bg-court px-6 py-3.5 text-lg font-bold text-ink-950 shadow-lg shadow-court/20 hover:bg-court-soft">
                Join for {priceLabel}/month
              </Link>
              <Link href="#features" className="display rounded-xl border border-ink-700 px-6 py-3.5 text-lg font-bold text-ink-200 hover:border-ink-500">
                See what&apos;s inside
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-500">Cancel anytime · Secure Stripe checkout · NZ time, NZ sports · 18+</p>
          </div>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/app-match.png" alt="Courtside match centre showing team stats, timeline and player stats" width={1280} height={800} className="w-full rounded-2xl border border-ink-700 shadow-2xl shadow-black/40" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/app-multi.png" alt="Automated multi builder and bet slip" width={420} height={640} className="absolute -bottom-8 -left-4 hidden w-40 rounded-xl border border-ink-700 shadow-2xl shadow-black/50 sm:block lg:w-48" />
          </div>
        </div>
      </section>

      {/* Live sports board */}
      <section id="sports" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="display text-3xl font-extrabold sm:text-4xl">Every sport you bet on, one membership</h2>
            <p className="mt-1 text-ink-400">Live status from our feeds, updated through the day.</p>
          </div>
          <Link href="/signup" className="text-sm font-semibold text-court hover:text-court-soft">
            Get access to all {status.length} →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {status.map((s) => (
            <div key={s.id} className="card flex min-w-0 items-start gap-3 p-4">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: s.accent }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="display truncate text-lg font-bold">{s.name}</h3>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${STATE_STYLE[s.state].cls}`}>{STATE_STYLE[s.state].label}</span>
                </div>
                <p className="text-xs text-ink-500">
                  {s.sport} · {s.region}
                </p>
                <p className="mt-1.5 text-sm text-ink-300">{s.headline}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-500">Off-season? You still get the full archive: every result, ladder, player stat and game log from the season just finished.</p>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-y border-ink-800 bg-ink-900/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="display text-3xl font-extrabold sm:text-4xl">Stats in, smarter bets out</h2>
          <p className="mt-1 max-w-2xl text-ink-400">The research you&apos;d spend an hour pulling together from five websites, already done and ready on your phone before the teams run out.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <article key={f.title} className="card p-5">
                <span className="display text-xs font-bold text-court">{f.tag}</span>
                <h3 className="display mt-1 text-xl font-bold leading-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">{f.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/app-preview.png" alt="Pre-match projections, fair odds and anytime try scorer chances" loading="lazy" className="w-full rounded-xl border border-ink-700" />
              <figcaption className="mt-2 text-xs text-ink-500">Pre-match: projected score, our win chance and fair odds for every market, with + Multi on each pick.</figcaption>
            </figure>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/app-stats.png" alt="Season player stats table with sortable columns" loading="lazy" className="w-full rounded-xl border border-ink-700" />
              <figcaption className="mt-2 text-xs text-ink-500">Detailed stats: every player, every stat, totals or per game, sortable on your phone.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="display text-3xl font-extrabold sm:text-4xl">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["Pick a game", "Open any competition and pick a fixture. You'll see form, head-to-head, ladder spots and our projected score."],
            ["Let the tools work", "Scan the game for standout players, build the most likely multi, or hunt longshots, and check any price or boost against our fair odds."],
            ["Bet with a plan", "Add picks to your slip, see the combined chance and return, then copy it into your betting app. Track the result live."],
          ].map(([t, b], i) => (
            <li key={t} className="card p-5">
              <span className="display grid h-9 w-9 place-items-center rounded-full bg-court text-lg font-extrabold text-ink-950">{i + 1}</span>
              <h3 className="display mt-3 text-xl font-bold">{t}</h3>
              <p className="mt-1 text-sm text-ink-400">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Value + pricing */}
      <section id="pricing" className="scroll-mt-20 border-y border-ink-800 bg-ink-900/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <h2 className="display text-3xl font-extrabold sm:text-4xl">Serious value for 33 cents a day</h2>
            <p className="mt-2 text-ink-400">
              Most overseas betting research tools charge US$20 to US$80 a month, about NZ$35 to $140, and they barely cover the NRL, never mind netball or the Super Smash. Courtside covers the sport
              we actually bet on here, for less than a single $10 multi.
            </p>
            <table className="mt-6 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-500">
                  <th className="pb-2 font-medium" />
                  <th className="pb-2 font-medium">Courtside</th>
                  <th className="pb-2 font-medium">Typical overseas tools</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-t [&_td]:border-ink-800 [&_td]:py-2">
                {[
                  ["Monthly price", `${priceLabel}`, "US$20–80 (≈NZ$35–140)"],
                  ["NRL, Super Rugby, netball, Super Smash", "✓ all included", "Rarely"],
                  ["NBA & NBL", "✓", "NBA only"],
                  ["Automated multi builder", "✓", "Top tiers only"],
                  ["Boosted odds / value checker", "✓", "Top tiers only"],
                  ["NZ time zone & NZ teams first", "✓", "✗"],
                  ["Tiers & upsells", "None — one price", "3–4 tiers"],
                ].map(([k, a, b]) => (
                  <tr key={k}>
                    <td className="pr-2 text-ink-300">{k}</td>
                    <td className="font-semibold text-win">{a}</td>
                    <td className="text-ink-500">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card self-start p-7 shadow-2xl shadow-black/30">
            <div className="display text-sm font-bold text-court">Courtside membership</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="display text-6xl font-extrabold">${site.price.amount.toFixed(2)}</span>
              <span className="pb-2 text-ink-400">NZD / month</span>
            </div>
            <p className="text-sm text-ink-500">GST included where applicable. Cancel anytime.</p>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                "All 8 competitions, live and archived",
                "Live scores, timelines & detailed stats",
                "Automated multi builder & longshot finder",
                "Boosted odds & value checker, screenshot reader",
                "Projections, fair odds & anytime scorers",
                "Player form, hit rates & game logs",
                "Light & dark mode, hide the sports you don't follow",
              ].map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="text-win">✓</span>
                  {x}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="display mt-6 block rounded-xl bg-court py-3.5 text-center text-lg font-bold text-ink-950 hover:bg-court-soft">
              {site.trialDays ? `Start ${site.trialDays}-day free trial` : "Join now"}
            </Link>
            <p className="mt-2 text-center text-xs text-ink-500">Apple Pay · Google Pay · Visa · Mastercard — via Stripe</p>
          </div>
        </div>
      </section>

      {/* Guides */}
      {guides.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="display text-3xl font-extrabold sm:text-4xl">Betting stats guides</h2>
            <Link href="/blog" className="text-sm font-semibold text-court">All guides →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="card block p-5 hover:border-ink-600">
                <span className="display text-xs font-bold text-court">{zoneById(p.zone)?.label}</span>
                <h3 className="display mt-1 text-xl font-bold leading-tight">{p.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-ink-400">{p.description}</p>
                <p className="mt-3 text-xs text-ink-500">{readingMinutes(p)} min read</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-8 pt-4">
        <h2 className="display text-3xl font-extrabold sm:text-4xl">Questions</h2>
        <div className="mt-6 divide-y divide-ink-800 rounded-xl border border-ink-800">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <span className="text-court transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{f.a}</p>
            </details>
          ))}
        </div>
        <ResponsibleGambling className="mt-8" />
      </section>
    </main>
  );
}
