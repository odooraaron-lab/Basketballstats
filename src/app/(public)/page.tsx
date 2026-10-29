import Link from "next/link";
import { ResponsibleGambling } from "@/components/public/PublicFooter";
import { POSTS, readingMinutes, zoneById } from "@/content/blog";
import { allSportStatus, type SportStatus } from "@/lib/seasonStatus";
import { Showcase, type ShowcaseItem } from "@/components/public/Showcase";
import { ValueCalc } from "@/components/public/ValueCalc";
import { priceLabel, site } from "@/site.config";

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

const STATE_STYLE: Record<SportStatus["state"], { label: string; cls: string }> = {
  live: { label: "LIVE", cls: "bg-loss/15 text-loss" },
  "in-season": { label: "In season", cls: "bg-win/15 text-win" },
  "off-season": { label: "Off-season", cls: "bg-ink-800 text-ink-400" },
};

export default async function Landing() {
  const status = await allSportStatus();
  const on = status.filter((s) => s.state !== "off-season").length;
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

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-800">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(242,107,29,0.2),transparent_60%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <div className="min-w-0">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-ink-700 px-3 py-1 text-xs text-ink-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-loss" /> {on} of {status.length} competitions in season right now
            </p>
            <h1 className="display text-4xl font-extrabold leading-[1.05] text-ink-100 sm:text-6xl">
              Sports stats &amp; betting odds software <span className="text-court">for Kiwi punters</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-300">
              Find value, build smarter multis and check every boost before the odds move. Live stats and detailed stats for the All Blacks, NRL, Super Rugby, netball, A-League, Super Smash, NBA, NBL, world cricket and NZ horse racing, all in NZ time.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup" className="display rounded-xl bg-court px-6 py-3.5 text-lg font-bold text-ink-950 shadow-lg shadow-court/20 hover:bg-court-soft">
                {site.trialDays ? `Start ${site.trialDays}-day free trial` : `Join for ${priceLabel}/month`}
              </Link>
              <Link href="#software" className="display rounded-xl border border-ink-700 px-6 py-3.5 text-lg font-bold text-ink-200 hover:border-ink-500">
                See the software
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-500">{priceLabel}/month · Cancel anytime · Secure Stripe checkout · 18+</p>
          </div>
          <div className="relative min-w-0 pb-8 lg:pb-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/app-match.png" alt="Quick Read live match centre on desktop" width={1280} height={800} className="w-full rounded-2xl border border-ink-700 shadow-2xl shadow-black/40" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/app-phone.png" alt="Quick Read on a phone" width={390} height={780} className="absolute -bottom-2 right-2 w-[28%] rounded-[1.4rem] border-4 border-ink-800 shadow-2xl shadow-black/60 sm:-right-4 lg:-bottom-10" />
          </div>
        </div>
      </section>

      {/* Numbers + coverage */}
      <section className="border-b border-ink-800 bg-ink-900/60">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[
              [String(status.length), "competitions covered"],
              ["10,000", "simulations per game for multis"],
              ["50+", "stats per player"],
              [String(POSTS.length), "free betting guides"],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="display text-4xl font-extrabold text-court sm:text-5xl">{v}</div>
                <div className="mt-1 text-sm text-ink-400">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {status.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 px-3 py-1 text-xs font-semibold text-ink-300">
                <span className="h-2 w-2 rounded-full" style={{ background: s.accent }} />
                {s.short}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Audience */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="display max-w-3xl text-3xl font-extrabold sm:text-4xl">Built for how you actually bet</h2>
        <p className="mt-1 max-w-2xl text-ink-400">The research you&apos;d spend an hour pulling from five websites, ready on your phone before the teams run out.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {AUDIENCE.map((a, i) => (
            <div key={a.title} className="card flex flex-col p-6">
              <span className="display grid h-10 w-10 place-items-center rounded-full bg-court text-lg font-extrabold text-ink-950">{i + 1}</span>
              <h3 className="display mt-4 text-2xl font-bold">{a.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-400">{a.body}</p>
              <Link href="/signup" className="display mt-5 text-sm font-bold text-court hover:text-court-soft">
                Get started →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Software tour */}
      <section id="software" className="scroll-mt-20 border-y border-ink-800 bg-ink-900/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="display text-3xl font-extrabold sm:text-4xl">Take a look at the software</h2>
          <p className="mb-8 mt-1 max-w-2xl text-ink-400">
            Every tool, every sport, one membership. <Link href="/features" className="text-court hover:underline">See all features →</Link>
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
              <img src={b.img} alt={b.alt} loading="lazy" className="w-full rounded-xl border border-ink-700 shadow-2xl shadow-black/30" />
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
            <Link href="/tools/betting-odds-calculator" className="text-court hover:underline">More calculators: margin, multi, each-way →</Link>
          </p>
          <ValueCalc />
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
                  <h3 className="display truncate text-lg font-bold" title={s.name}>{s.short}</h3>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${STATE_STYLE[s.state].cls}`}>{STATE_STYLE[s.state].label}</span>
                </div>
                <p className="text-xs text-ink-500">
                  {s.name} · {s.region}
                </p>
                <p className="mt-1.5 text-sm text-ink-300">{s.headline}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-500">Off-season? You still get the full archive: every result, ladder, player stat and game log from the season just finished.</p>
      </section>

      {/* Everything included */}
      <section id="features" className="scroll-mt-20 border-y border-ink-800 bg-ink-900/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="display text-3xl font-extrabold sm:text-4xl">Everything included</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.title} className="card p-5">
                <span className="display text-xs font-bold text-court">{f.tag}</span>
                <h3 className="display mt-1 text-xl font-bold leading-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">{f.body}</p>
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
            <Link href="/blog/best-betting-stats-tools-nz-2026" className="mt-3 inline-block text-sm font-semibold text-court hover:text-court-soft">
              How we compare with Props.Cash, MultiLab, Punters and others →
            </Link>
          </div>
          <div className="card self-start p-7 shadow-2xl shadow-black/30">
            <div className="display text-sm font-bold text-court">Quick Read membership</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="display text-6xl font-extrabold">${site.price.amount.toFixed(2)}</span>
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
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-court/30 bg-gradient-to-br from-court/20 via-ink-900 to-ink-900 px-6 py-12 text-center sm:px-12">
          <h2 className="display text-3xl font-extrabold sm:text-5xl">Stop betting on gut feel.</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-ink-300">Every stat, every sport and every tool for {priceLabel} a month. Instant access, cancel anytime.</p>
          <Link href="/signup" className="display mt-7 inline-block rounded-xl bg-court px-8 py-4 text-lg font-bold text-ink-950 shadow-lg shadow-court/30 hover:bg-court-soft">
            {site.trialDays ? `Start ${site.trialDays}-day free trial` : "Join Quick Read"}
          </Link>
        </div>
        <ResponsibleGambling className="mt-10" />
      </section>
    </main>
  );
}
