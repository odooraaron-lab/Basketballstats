import Link from "next/link";
import { after } from "next/server";
import { ResponsibleGambling } from "@/components/public/PublicFooter";
import { POSTS, readingMinutes, zoneById } from "@/content/blog";
import { allSportStatus } from "@/lib/seasonStatus";
import { listPosts, runNewsIngest } from "@/lib/news/store";
import { NewsImg } from "@/components/public/NewsImg";
import { SPORT_LABEL, type SportTag } from "@/lib/news/core";
import { Showcase, type ShowcaseItem } from "@/components/public/Showcase";
import { ValueCalc } from "@/components/public/ValueCalc";
import { priceLabel, site } from "@/site.config";
import { FixtureBoard } from "@/components/public/FixtureBoard";

export const revalidate = 1800;
export const maxDuration = 60;

export const metadata = {
  title: { absolute: `Live Sports Stats & Betting Odds Tools NZ | ${site.name}` },
  description:
    "Live sports stats, betting odds tools and NZ horse racing form for Kiwi punters. All Blacks, NRL, Super Rugby, netball, A-League, Super Smash, cricket, NBA and NBL, plus an automated multi builder, The Ultimate Bet cross-sport multi finder and a free odds calculator. $9.99 NZD/month.",
  keywords: ["live sports", "betting odds", "live stats", "stat tracker", "detailed stats", "sports betting NZ", "multi builder", "boosted odds", "All Blacks stats", "All Blacks try scorer", "NZ horse racing form", "jockey stats NZ", "trainer strike rate", "NRL stats", "Super Rugby stats", "netball stats", "A-League stats", "NBA player props", "same game multi", "multi tips NZ", "betting odds calculator", "racing form guide NZ", "best betting app NZ", "Melbourne Cup 2026"],
  alternates: { canonical: "/" },
  openGraph: {
    title: `${site.name} — live sports stats & betting tools for NZ`,
    description: "Every stat, every sport, one subscription: live match centres, NZ racing form, an automated multi builder and The Ultimate Bet. NZ$9.99/month.",
    url: site.url,
    images: [{ url: "/images/app-match.png", width: 1280, height: 800, alt: "Quick Read match centre" }],
  },
};

const FEATURES: { title: string; body: string; tag: string }[] = [
  {
    tag: "Live stats",
    title: "Live scores & a real stat tracker",
    body: "Every game across every competition we cover, with live scores, running timelines and box scores that update as they happen. Times are shown in NZ time, so there's no converting from Sydney or US Eastern.",
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
    tag: "Ultimate Bet",
    title: "The Ultimate Bet",
    body: "One tap scans every game and race in the next 48 hours across basketball, rugby, football, netball, cricket and NZ racing, then builds three cross-sport multis: a Banker, a Balanced and a Big Price option, each with our chance and fair price for every leg.",
  },
  {
    tag: "Racing",
    title: "NZ horse racing form",
    body: "Every New Zealand thoroughbred and harness meeting: fields, fixed odds and market moves, results and dividends. Track horses, jockeys, drivers and trainers, with strike rates, level-stakes profit and form by track, distance and going.",
  },
  {
    tag: "All Blacks",
    title: "All Blacks test tracker",
    body: "Every All Blacks test across the Nations Championship, Bledisloe Cup, Rugby Championship and tours: results, the record against every nation, try scorers, points and starts, plus our projection and anytime try scorer chances for the next test.",
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
    a: "Everything. You get every sport (the All Blacks, NRL, Super Rugby, ANZ Premiership netball, A-League men's and women's, Super Smash, world cricket, NBA, NBL, and NZ and Australian horse racing) and every tool: live stats, match centres, projections, the automated multi builder, The Ultimate Bet, racing form with jockey and trainer stats, the odds and boost checker and the bet slip. There are no tiers and no add-ons.",
  },
  {
    q: "Is Quick Read a betting site?",
    a: "No. We don't take bets, hold money or work for a bookmaker. Quick Read is a stats and analysis service: it helps you research a bet before you place it wherever you normally bet.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel from your Membership page in two taps. You keep access until the end of the month you've paid for, and you won't be charged again.",
  },
  {
    q: "Which sports are covered right now?",
    a: "Every All Blacks test (Nations Championship, Bledisloe Cup, Rugby Championship and tours), NBA, NBL, NRL, Super Rugby Pacific, the A-League (men's and women's), the ANZ Premiership, Super Smash, every international and domestic cricket match, and every NZ thoroughbred and harness meeting. When a competition is between seasons, the app tells you when it's back, and you can still explore the whole last season.",
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
    a: "Both, with a Kiwi lean. Times are in NZ time, and the sports are the ones we actually watch here: the All Blacks, the Warriors, the Breakers, Super Rugby, the ANZ Premiership and the Super Smash, plus the NBA.",
  },
  {
    q: "What is The Ultimate Bet?",
    a: "A one-tap multi finder. It scans every game and race in the next 48 hours, rates each market with our models and builds three multis (Banker, Balanced and Big Price) with one pick per sport, showing our chance and fair price for every leg.",
  },
  {
    q: "Do you cover horse racing?",
    a: "Yes. Every New Zealand thoroughbred and harness meeting, plus Australian meetings, with race cards, fixed odds and price moves, fair chances, results and dividends. Jockey, driver and trainer strike rates and a tracker for your blackbook are built from every New Zealand result we record.",
  },
  {
    q: "How does Quick Read compare with other betting apps?",
    a: "Most betting research tools are built for American sports or Australian bookmakers and cost US$20 to US$120 a month. Quick Read covers the sport New Zealanders bet on, including racing, for NZ$9.99. We've written an honest comparison of the main options in our guide to the best betting stats tools for NZ punters.",
  },
  {
    q: "Is anything free?",
    a: "Yes. Our betting odds calculator (fair odds, bookmaker margin, multi, boost and each-way) and all our betting guides are free, with no sign-up needed.",
  },
  {
    q: "Do you guarantee winners?",
    a: "No one honestly can. Quick Read gives you better information. It doesn't remove the risk. You must be 18 or over, and you should only bet what you can afford to lose.",
  },
];

export default async function Landing() {
  const [status, news] = await Promise.all([allSportStatus(), listPosts({ limit: 6, maxAgeDays: 4 }).catch(() => [])]);
  const on = status.filter((s) => s.state !== "off-season").length;
  // The homepage shows the latest news too, so it also kicks off a news run when one is due
  after(() => runNewsIngest({ reason: "home" }).catch(() => null));
  // Newest featured guides first (timely posts like the Melbourne Cup lead), then the rest
  const guides = [...POSTS.filter((p) => p.featured).sort((a, b) => (a.date < b.date ? 1 : -1)), ...POSTS.filter((p) => !p.featured)].slice(0, 6);

  const jsonLd = [
    { "@context": "https://schema.org", "@type": "Organization", name: site.name, url: site.url, email: site.supportEmail, areaServed: ["NZ", "AU"] },
    { "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.url, potentialAction: { "@type": "ReadAction", target: `${site.url}/blog` } },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: site.name,
      applicationCategory: "SportsApplication",
      operatingSystem: "Web, iOS, Android",
      description: "Live sports stats, detailed stats, NZ horse racing form and betting odds tools for NZ and Australian sport.",
      featureList: ["Live scores and match centres", "Automated multi builder", "The Ultimate Bet cross-sport multi finder", "Odds and boost checker", "NZ horse racing form, jockey and trainer stats", "All Blacks test tracker", "Player props hit rates", "Bet slip with fair odds"],
      offers: { "@type": "Offer", price: site.price.amount.toFixed(2), priceCurrency: site.price.currency, category: "subscription", url: `${site.url}/signup` },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  const SHOWCASE: ShowcaseItem[] = [
    {
      id: "match",
      tab: "Match centres",
      title: "Live match centres with the stats that matter",
      body: "Every game has a live score, timeline, period scores, team stat bars and full player tables. NRL and netball use official match data, with more than 50 stats per player.",
      points: ["Live scores in NZ time", "Tap any player for their full game log", "Sortable stat tables that work on your phone"],
      img: "/images/app-match.png",
      alt: "Live NRL match centre with team stats and timeline",
    },
    {
      id: "ultimate",
      tab: "Ultimate Bet",
      title: "The Ultimate Bet: three cross-sport multis in one tap",
      body: "Scans every game and race in the next 48 hours, rates each market with our models and builds a Banker, a Balanced and a Big Price multi, one pick per sport.",
      points: ["Basketball, rugby, football, netball, cricket and racing", "Our chance, fair price and a reason for every leg", "Add a whole option to your slip in one tap"],
      img: "/images/app-ultimate.png",
      alt: "The Ultimate Bet popup with three multi options",
    },
    {
      id: "racing",
      tab: "NZ racing",
      title: "NZ horse racing form, jockey and trainer stats",
      body: "Every NZ gallops and harness meeting, plus Australian carnivals. Race cards show barriers, weights, claims, price moves and each runner's fair chance, with jockey and trainer strike rates alongside.",
      points: ["Jockey, driver & trainer strike rates and level-stakes profit", "Horse profiles by track condition and distance", "A blackbook: track horses, jockeys and trainers"],
      visual: "racing",
      alt: "Example race card layout",
    },
    {
      id: "multi",
      tab: "Multi builder",
      title: "Automated multis, built from 10,000 simulations",
      body: "Scan a game and the builder simulates it 10,000 times, then ranks the most likely combinations. The longshot finder hunts for realistic big-price legs, like a role player in form.",
      points: ["Most-likely and longshot multis in one tap", "Combined chance, fair price and return on every slip", "One bet slip across every sport, saved on your device"],
      img: "/images/app-multi.png",
      alt: "Multi builder bet slip showing combined chance and fair price",
      portrait: true,
    },
    {
      id: "value",
      tab: "Odds & boosts",
      title: "Know when a price, or a boost, is worth it",
      body: "Every upcoming game gets our own chances and fair odds: result, line, margin bands, totals and anytime try or goal scorers. Compare a bookie's price or a boosted price in seconds.",
      points: ["Fair odds on every market", "Boosted-price check against our chance", "Read a props screenshot and check every line"],
      img: "/images/app-preview.png",
      alt: "Pre-match markets with our chance and fair odds",
    },
    {
      id: "ab",
      tab: "All Blacks",
      title: "Every All Blacks test, every try scorer",
      body: "Results and fixtures across the Nations Championship, Bledisloe Cup, Rugby Championship and tours. See the record against every nation and our anytime try scorer chances for the next test.",
      points: ["Record v every nation, last four years", "Try, points and starts leaders", "Projected score and fair odds for the next test"],
      img: "/images/app-allblacks.png",
      alt: "All Blacks test tracker with record, next test and try scorers",
    },
    {
      id: "stats",
      tab: "Player stats",
      title: "Detailed stats for every player",
      body: "Season totals or per-game averages for every player in every competition, sortable by any column. Last 5 and last 10 form, hit rates and league ranks on every player page.",
      points: ["Every stat the feed publishes", "Per game or season totals", "Filter by team or search by name"],
      img: "/images/app-stats.png",
      alt: "Sortable season player stats table",
    },
  ];

  const AUDIENCE = [
    { title: "The weekend multi punter", body: "Thirty minutes on a Saturday morning: open the round, see who's in form, build a multi with real chances behind every leg." },
    { title: "The stats nerd", body: "Run metres, tackle breaks, centre-pass receives, true shooting and shot charts. Detailed stats for every player, in NZ time." },
    { title: "The boost hunter", body: "Bookies push boosts every day. Check each one against a fair price in seconds and only take the ones that are actually worth it." },
  ];

  const BLOCKS = [
    {
      title: "Pays for itself if it saves you one bad multi",
      body: `${priceLabel} a month is less than one $10 multi. If our numbers talk you out of a single bad leg, or into the right boost, the membership has done its job. No tiers, no upsells, cancel anytime.`,
      img: "/images/app-preview.png",
      alt: "Our markets with fair odds",
    },
    {
      title: "From gut feel to numbers",
      body: "Every win chance comes from team attack and defence ratings with home advantage, and every player chance from season rates, recent form and the projected score. You see the working, not just a tip.",
      img: "/images/app-allblacks.png",
      alt: "All Blacks next test projection",
    },
    {
      title: "Every stat, tracked",
      body: `Results, ladders, player logs and form for ${status.length} competitions, plus every NZ race result we record. Off-season? The whole archive is still there, and each section tells you when it's back.`,
      img: "/images/app-stats.png",
      alt: "Season stats table",
    },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero: the headline, and the fixture board built from live season data */}
      <section className="border-b border-ink-800">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.12fr_1fr] lg:gap-12 lg:py-16">
          <div className="min-w-0 lg:pt-4">
            <h1 className="display text-[2.6rem] font-extrabold leading-[1.02] text-ink-100 sm:text-6xl">Sports stats and betting tools for Kiwi punters</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-300">
              Find value, build smarter multis and check every boost before the odds move. Stats for the All Blacks, NRL, Super Rugby, netball, A-League, Super Smash, NBA, NBL, world cricket and NZ horse racing, all in NZ time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="display rounded-md bg-court px-5 py-3 text-base font-bold text-ink-950 hover:bg-court-soft sm:text-lg">
                {site.trialDays ? `Start ${site.trialDays}-day free trial` : `Join for ${priceLabel} a month`}
              </Link>
              <Link href="#software" className="display rounded-md border border-ink-600 px-5 py-3 text-base font-bold text-ink-100 hover:border-ink-400 sm:text-lg">
                See the software
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-500">One price, cancel anytime. Paid securely through Stripe. 18+ only.</p>
          </div>
          <FixtureBoard status={status} on={on} />
        </div>
      </section>

      {/* Audience */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="display max-w-3xl text-3xl font-extrabold sm:text-4xl">Built for how you actually bet</h2>
        <p className="mt-2 max-w-2xl text-ink-400">The research you&apos;d spend an hour pulling from five websites, ready on your phone before the teams run out.</p>
        <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
          {AUDIENCE.map((a) => (
            <div key={a.title} className="border-t-2 border-court pt-4">
              <h3 className="display text-2xl font-bold">{a.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-300">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Software tour */}
      <section id="software" className="scroll-mt-20 border-y border-ink-800 bg-ink-900/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="display text-3xl font-extrabold sm:text-4xl">Take a look at the software</h2>
          <p className="mb-8 mt-1 max-w-2xl text-ink-400">
            Every tool, every sport, one membership. <Link href="/features" className="text-court hover:underline">See all features</Link>
          </p>
          <Showcase items={SHOWCASE} />
        </div>
      </section>

      {/* Claim blocks */}
      <section className="mx-auto max-w-6xl space-y-16 px-4 py-16">
        {BLOCKS.map((b, i) => (
          <div key={b.title} className="grid items-center gap-8 lg:grid-cols-2">
            <div className={`min-w-0 ${i % 2 ? "lg:order-2" : ""}`}>
              <h2 className="display text-3xl font-extrabold sm:text-4xl">{b.title}</h2>
              <p className="mt-3 text-lg text-ink-300">{b.body}</p>
            </div>
            <div className="min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.img} alt={b.alt} loading="lazy" className="w-full rounded-lg border border-ink-700" />
            </div>
          </div>
        ))}
      </section>

      {/* Calculator */}
      <section id="calculator" className="scroll-mt-20 border-y border-ink-800 bg-ink-900/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="display text-3xl font-extrabold sm:text-4xl">Is that price actually worth it?</h2>
          <p className="mb-8 mt-1 max-w-2xl text-ink-400">
            Free betting odds calculator. Type the bookie&apos;s odds, a boosted price and the chance you rate it, and see the fair price and expected return.{" "}
            <Link href="/tools/betting-odds-calculator" className="text-court hover:underline">More calculators: margin, multi, each-way</Link>
          </p>
          <ValueCalc />
        </div>
      </section>

      {/* Everything included */}
      <section id="features" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="display text-3xl font-extrabold sm:text-4xl">Everything included</h2>
          <p className="mt-2 max-w-2xl text-ink-400">One membership, no tiers. This is the whole list.</p>
          <div className="mt-8 grid gap-x-12 md:grid-cols-2">
            {FEATURES.map((f) => (
              <article key={f.title} className="border-t border-ink-700 py-5">
                <h3 className="display text-xl font-bold leading-tight">{f.title}</h3>
                <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-300">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Value + pricing */}
      <section id="pricing" className="scroll-mt-20 border-y border-ink-800 bg-ink-900/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div>
            <h2 className="display text-3xl font-extrabold sm:text-4xl">Serious value for 33 cents a day</h2>
            <p className="mt-2 text-ink-400">
              Most overseas betting research tools charge US$20 to US$80 a month, about NZ$35 to $140, and they barely cover the NRL, never mind netball or the Super Smash. Quick Read covers the sport
              we actually bet on here, for less than a single $10 multi.
            </p>
            <table className="mt-6 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-500">
                  <th className="pb-2 font-medium" />
                  <th className="pb-2 font-medium">Quick Read</th>
                  <th className="pb-2 font-medium">Typical overseas tools</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-t [&_td]:border-ink-800 [&_td]:py-2">
                {[
                  ["Monthly price", `${priceLabel}`, "US$20–120 a month"],
                  ["All Blacks, NRL, Super Rugby, netball, Super Smash", "✓ all included", "Rarely"],
                  ["NBA & NBL", "✓", "NBA only"],
                  ["Automated multi builder", "✓", "Top tiers only"],
                  ["Boosted odds / value checker", "✓", "Top tiers only"],
                  ["Cross-sport multi finder (The Ultimate Bet)", "✓", "Rarely"],
                  ["NZ horse racing form, jockey & trainer stats", "✓", "Separate subscription"],
                  ["NZ time zone & NZ teams first", "✓", "✗"],
                  ["Tiers & upsells", "None, one price", "3–4 tiers"],
                ].map(([k, a, b]) => (
                  <tr key={k}>
                    <td className="pr-2 text-ink-300">{k}</td>
                    <td className="font-semibold text-win">{a}</td>
                    <td className="text-ink-500">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link href="/blog/best-betting-stats-tools-nz-2026" className="mt-3 inline-block text-sm font-semibold text-court hover:text-court-soft">
              How we compare with Props.Cash, MultiLab, Punters and others
            </Link>
          </div>
          <div className="card self-start border-ink-600 p-7">
            <div className="display text-base font-bold text-ink-100">Quick Read membership</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="display num text-6xl font-extrabold">${site.price.amount.toFixed(2)}</span>
              <span className="pb-2 text-ink-400">NZD / month</span>
            </div>
            <p className="text-sm text-ink-500">GST included where applicable. Cancel anytime.</p>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                `All ${status.length} competitions, live and archived`,
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
            <Link href="/signup" className="display mt-6 block rounded-md bg-court py-3.5 text-center text-lg font-bold text-ink-950 hover:bg-court-soft">
              {site.trialDays ? `Start ${site.trialDays}-day free trial` : "Join now"}
            </Link>
            <p className="mt-2 text-center text-xs text-ink-500">Pay with Apple Pay, Google Pay, Visa or Mastercard through Stripe.</p>
          </div>
        </div>
      </section>

      {/* Latest news */}
      {news.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="display text-3xl font-extrabold sm:text-4xl">Latest sports news</h2>
            <Link href="/news" className="text-sm font-semibold text-court">All news</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((p) => (
              <a key={String(p.id)} href={p.url} target="_blank" rel="noopener nofollow" className="card flex min-w-0 gap-3 p-3 hover:border-ink-600">
                {p.image && <NewsImg src={p.image} className="h-16 w-20 shrink-0 rounded-md object-cover" />}
                <div className="min-w-0">
                  <div className="text-[11px] text-ink-500">
                    <span className="font-semibold text-ink-300">{p.source}</span>, {p.sports.slice(0, 2).map((x) => SPORT_LABEL[x as SportTag] ?? x).join(" and ")}
                  </div>
                  <div className="line-clamp-2 text-sm font-semibold leading-snug">{p.title}</div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Guides */}
      {guides.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="display text-3xl font-extrabold sm:text-4xl">Betting stats guides</h2>
            <Link href="/blog" className="text-sm font-semibold text-court">All guides</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="card block p-5 hover:border-ink-600">
                <h3 className="display text-xl font-bold leading-tight">{p.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-ink-400">{p.description}</p>
                <p className="mt-3 text-xs text-ink-500">
                  {zoneById(p.zone)?.label}, {readingMinutes(p)} min read
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-8 pt-4">
        <h2 className="display text-3xl font-extrabold sm:text-4xl">Questions</h2>
        <div className="mt-6 divide-y divide-ink-800 border-y border-ink-800">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <span className="text-court transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col gap-6 border-t-2 border-court pt-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="display text-3xl font-extrabold sm:text-5xl">Stop betting on gut feel.</h2>
            <p className="mt-3 max-w-xl text-lg text-ink-300">Every stat, every sport and every tool for {priceLabel} a month. Instant access, cancel anytime.</p>
          </div>
          <Link href="/signup" className="display shrink-0 self-start rounded-md bg-court px-8 py-4 text-lg font-bold text-ink-950 hover:bg-court-soft md:self-auto">
            {site.trialDays ? `Start ${site.trialDays}-day free trial` : "Join Quick Read"}
          </Link>
        </div>
        <ResponsibleGambling className="mt-10" />
      </section>
    </main>
  );
}
