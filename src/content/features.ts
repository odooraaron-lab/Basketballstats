// Public, indexable landing pages for each product area (/features/[slug]).
import type { ZoneId } from "./blog/types";

export interface Feature {
  slug: string;
  nav: string; // short label for menus
  seoTitle: string;
  description: string;
  keywords: string[];
  kicker: string;
  h1: string;
  intro: string;
  img?: { src: string; alt: string; portrait?: boolean };
  points: { title: string; body: string }[];
  /** Markdown body (same format as the blog) */
  body: string;
  faqs: { q: string; a: string }[];
  zones: ZoneId[];
}

export const FEATURES: Feature[] = [
  {
    slug: "ultimate-bet",
    nav: "The Ultimate Bet",
    seoTitle: "The Ultimate Bet | Cross-Sport Multi Finder for NZ Punters",
    description: "One tap scans every game in the next 48 hours across basketball, rugby, football, netball, cricket and NZ racing, then builds three cross-sport multis with our chance and fair price for every leg.",
    keywords: ["multi tips NZ", "best multi bet today", "cross sport multi", "multi builder", "ultimate bet", "weekend multi tips"],
    kicker: "Multi finder",
    h1: "The Ultimate Bet: the best cross-sport multi for the next 48 hours",
    intro:
      "Stop scrolling five apps for multi legs. The Ultimate Bet scans every game and race we cover in the next two days, rates every market with our models, and hands you three ready-made multis, one pick per sport.",
    img: { src: "/images/app-ultimate.png", alt: "The Ultimate Bet popup with three multi options and our chance for each leg" },
    points: [
      { title: "Three options", body: "Banker (highest chance), Balanced (better price) and Big Price (lines, totals and closer calls)." },
      { title: "One leg per sport", body: "Basketball, rugby league, rugby union, football, netball, cricket and racing, so legs aren't tied to each other." },
      { title: "Fair price on every leg", body: "Our chance, fair odds and a one-line reason for each pick, plus the multi's combined chance." },
      { title: "One tap to your slip", body: "Add a whole option to your bet slip, then compare it with your bookie's price." },
    ],
    body: `
## How it picks the legs

- **NBA and NBL:** projected scores from each team's scoring and defence, blended with the betting line when there is one.
- **NRL, Super Rugby, All Blacks, A-League and netball:** attack and defence ratings with home advantage, the same models as our match previews, including lines, totals, double chance and both-teams-to-score.
- **Cricket:** each side's recent results in the same format, plus a strength rating for international sides.
- **Racing:** the favourite to win or place, with the bookmaker's margin removed and an adjustment for the jockey's and trainer's recent strike rates.

Each option takes the best qualifying pick from each sport. The Banker goes for the highest chance; the Balanced and Big Price options look for better prices from different games.

## Why one leg per sport?

Legs from the same game are linked, and bookmakers price that in. Legs from different sports are close to independent, so the combined chance is easier to judge. More in [same game multi vs cross-sport multi](/blog/same-game-multi-vs-cross-sport-multi).

## The honest bit

These are our model's chances, not a guarantee. A three-leg multi at 70% a leg still loses about two times in three. Only back an option when your bookmaker's price is longer than our fair price.
`,
    faqs: [
      { q: "How often does The Ultimate Bet update?", a: "It rescans every ten minutes when members open it, so prices, scratchings and new fixtures are picked up through the day." },
      { q: "Which sports does it cover?", a: "NBA, NBL, NRL, Super Rugby, All Blacks tests, A-League men's and women's, ANZ Premiership netball, T20 and one-day cricket worldwide, and New Zealand horse racing, whatever is on in the next 48 hours." },
      { q: "Does it place bets for me?", a: "No. Quick Read doesn't take bets. You add an option to your bet slip, see the combined chance and fair price, and place it with your own bookmaker if the price is right." },
    ],
    zones: ["betting-tools"],
  },
  {
    slug: "multi-builder",
    nav: "Multi builder",
    seoTitle: "Multi Builder & Same Game Multi Stats NZ | Quick Read",
    description: "Automated multi builder for NBA, NBL, NRL, Super Rugby, netball and more: scan a game, simulate it 10,000 times and get the most likely multis plus realistic longshots, with fair odds.",
    keywords: ["multi builder", "same game multi tips", "SGM builder", "NBA multi tips", "NRL multi tips", "bet builder NZ"],
    kicker: "Automated multis",
    h1: "Automated multi builder with real chances behind every leg",
    intro:
      "Scan any game and the builder simulates it 10,000 times to find the most likely combinations, then hunts for realistic longshots. Every multi shows its real chance and fair price before you bet.",
    img: { src: "/images/app-multi.png", alt: "Multi builder bet slip with combined chance and fair price", portrait: true },
    points: [
      { title: "10,000 simulations", body: "Each game is played out thousands of times using every player's recent form and minutes." },
      { title: "Most-likely and longshot", body: "Get the safest combinations, or find big-price legs that have actually been landing." },
      { title: "Player props with hit rates", body: "Last 5, last 10 and season averages next to every line." },
      { title: "One slip, every sport", body: "Add legs from any game into one bet slip with combined chance, fair price and return." },
    ],
    body: `
## What you can build

- **Basketball (NBA & NBL):** points, rebounds, assists, blocks and more, with combinations across a whole game or day.
- **Rugby league & union:** result, line, winning margin and anytime try scorers.
- **Football:** result, double chance, over/under 2.5 goals, both teams to score and correct score.
- **Netball:** result, line and margin bands.
- **Racing:** win and place on any New Zealand runner.

## Fair odds, not just picks

Every leg shows our chance with the bookmaker's margin removed, and the slip multiplies them for the combined chance. If the bookie's price is shorter than our fair price, you'll see it before you bet. Learn more in [implied probability and fair odds](/blog/implied-probability-fair-odds-explained).

## Same game multis

Legs from the same game are correlated. For basketball, the builder accounts for that, because every leg in a combination comes from the same simulated games. That's something a simple multiplication of prices can't do.
`,
    faqs: [
      { q: "Is the multi builder included in the membership?", a: "Yes. Every tool, including the multi builder, the longshot finder, The Ultimate Bet and the bet slip, is included in the NZ$9.99 monthly membership." },
      { q: "Can I build same game multis?", a: "Yes. For the NBA and NBL, scan a game and the builder finds the most likely same-game combinations from 10,000 simulations, so related legs are priced together. For other sports you can combine any of our match markets in the bet slip." },
      { q: "Does it work for NRL and Super Rugby?", a: "Yes. Every NRL, Super Rugby, All Blacks, A-League and ANZ Premiership match has a preview with result, line, margin, total and scorer markets, each with + Multi." },
    ],
    zones: ["betting-tools", "nba", "nrl"],
  },
  {
    slug: "nz-horse-racing-form",
    nav: "NZ racing form",
    seoTitle: "NZ Horse Racing Form Guide, Jockey & Trainer Stats | Quick Read",
    description: "Every New Zealand thoroughbred and harness meeting: fields, fixed odds and market moves, results and dividends, plus jockey, driver and trainer strike rates and a blackbook to track horses.",
    keywords: ["NZ horse racing form", "NZ form guide", "jockey stats NZ", "trainer strike rate", "harness racing form NZ", "racing blackbook"],
    kicker: "Horse racing",
    h1: "NZ horse racing form, jockey and trainer stats in one place",
    intro:
      "Every New Zealand gallops and harness meeting, with race cards that show what matters: barriers, weights, claims, price moves, fair chances, and how each jockey, driver and trainer is going right now.",
    points: [
      { title: "Race cards that do the maths", body: "Fixed win and place odds, firming and drifting, and each runner's chance with the margin removed." },
      { title: "Jockey, driver & trainer stats", body: "Strike rates, place rates and $1 level-stakes profit over 30, 90 and 365 days." },
      { title: "Horse profiles", body: "Every recorded start, with splits by track condition, distance and jockey." },
      { title: "Your blackbook", body: "Track horses, jockeys and trainers and see their next runs and latest results." },
    ],
    body: `
## What's on every race card

- Barrier, weight and apprentice claim
- Jockey or driver and trainer, with their win rate over the last 90 days
- Fixed win and place prices, opening and current price, and a firming or drifting flag
- Each runner's win and place chance with the bookmaker's margin removed
- Last start, form figures and form comments
- Results and tote dividends once the race is run

## Leaderboards that find value

Our jockey and trainer tables rank every rider and stable by wins, strike rate and **profit at level stakes**: what you'd have made betting $1 on every runner. Filter to gallops or harness and to 30 days, 90 days or 12 months.

## Australia too

Switch to Australian meetings for the big carnivals, including the [Melbourne Cup](/blog/melbourne-cup-2026-betting-guide-nz), with the same race cards, odds and fair chances.

## Learn the form

New to form? Start with [how to read a NZ form guide](/blog/how-to-read-nz-horse-racing-form-guide), then [jockey and trainer strike rates](/blog/jockey-trainer-strike-rates-nz-racing) and [track conditions](/blog/nz-track-conditions-good4-soft6-heavy9-explained).
`,
    faqs: [
      { q: "Does Quick Read cover harness racing?", a: "Yes. Every New Zealand harness meeting is covered alongside the gallops, with driver and trainer statistics and a harness-only filter on the leaderboards." },
      { q: "Where do the jockey and trainer stats come from?", a: "We record every New Zealand race card and result as it's published and build strike rates, place rates and level-stakes profit from those results, updated daily." },
      { q: "Can I track a horse?", a: "Yes. Tap + Track on any horse, jockey, driver or trainer. My tracking shows their upcoming runs as soon as fields are published, and their latest results." },
      { q: "Is racing included in the $9.99 membership?", a: "Yes. Racing is part of the same NZ$9.99 a month membership as every other sport and tool. There are no add-ons." },
    ],
    zones: ["racing"],
  },
  {
    slug: "all-blacks-stats",
    nav: "All Blacks stats",
    seoTitle: "All Blacks Stats, Results & Try Scorer Tracker | Quick Read",
    description: "Every All Blacks test across the Nations Championship, Bledisloe Cup, Rugby Championship and tours: the record against every nation, try and points leaders, and our projection for the next test.",
    keywords: ["All Blacks stats", "All Blacks results 2026", "All Blacks try scorers", "All Blacks record v every nation", "All Blacks next test"],
    kicker: "All Blacks",
    h1: "All Blacks stats: every test, every try scorer",
    intro:
      "Results and fixtures across every competition, the record against every nation over four years, try, points and starts leaders, and our projected score and anytime try scorer chances for the next test.",
    img: { src: "/images/app-allblacks.png", alt: "All Blacks tracker showing the 2026 record, next test and try scorers" },
    points: [
      { title: "Every test, one list", body: "Nations Championship, Rugby Championship, Bledisloe and tour tests together, each labelled." },
      { title: "Record v every nation", body: "Wins, losses, average scores and margins for the last four years." },
      { title: "Try scorer chances", body: "Our anytime try chance and fair odds for every player in the next test." },
      { title: "Player stats", body: "Tries, points, conversions, penalties, starts and bench appearances for every All Black." },
    ],
    body: `
## The numbers that matter

Since 2023 the All Blacks have won 35 of 48 tests. They are 8–0 against Australia and 3–8 against South Africa. Those splits matter far more for betting than the overall record. See the [All Blacks betting stats guide](/blog/all-blacks-betting-stats-guide).

## Next up

The November Nations Championship tests: Scotland (8 Nov NZ time), Wales (15 Nov) and England (22 Nov). Read the [November tour preview](/blog/all-blacks-november-tour-2026-scotland-wales-england).

## Every match centre

Each test has a full match centre: score by half, scoring timeline, player stats and, before kick-off, our markets for result, line, margin bands, total and anytime try scorers.
`,
    faqs: [
      { q: "Which All Blacks tests are covered?", a: "Every test: the Nations Championship, Rugby Championship, Bledisloe Cup, tours and the Rugby World Cup, for the last four years." },
      { q: "How are the win chances worked out?", a: "Every team is rated on attack and defence from all international results this year and last, with home advantage. That gives a projected score and a win chance for each test." },
      { q: "Do you show try scorer odds?", a: "We show our own anytime try chance and fair odds for each player, from tries per test adjusted to the projected score, so you can compare them with your bookmaker's prices." },
    ],
    zones: ["all-blacks", "super-rugby"],
  },
  {
    slug: "live-sports-stats",
    nav: "Live stats",
    seoTitle: "Live Sports Stats NZ: NRL, Super Rugby, Netball, Cricket, NBA | Quick Read",
    description: "Live scores and detailed stats in NZ time for the NRL, Super Rugby, All Blacks, ANZ Premiership, A-League, Super Smash, world cricket, NBA and NBL, with interactive match centres and player stats.",
    keywords: ["live sports stats NZ", "NRL stats", "Super Rugby stats", "netball stats", "cricket live scores NZ", "NBA stats NZ time", "detailed stats"],
    kicker: "Live stats",
    h1: "Live sports stats and match centres, in NZ time",
    intro:
      "Live scores, timelines and detailed player stats for the sport Kiwis actually watch and bet on, with every table sortable on your phone and every time in New Zealand time.",
    img: { src: "/images/app-match.png", alt: "Live NRL match centre with team stats and timeline" },
    points: [
      { title: "Official-grade data", body: "50+ stats per player for the NRL and netball: run metres, tackle breaks, gains, centre-pass receives and more." },
      { title: "Every competition", body: "NRL, Super Rugby, All Blacks, ANZ Premiership, A-League, Super Smash, world cricket, NBA, NBL and NZ racing." },
      { title: "Interactive", body: "Sort any column, compare players, open shot charts, lineups and full game logs." },
      { title: "Off-season archive", body: "Every result, ladder and player stat from the season just finished stays available." },
    ],
    body: `
## Competitions

- **Rugby league:** NRL, with official per-player stats.
- **Rugby union:** Super Rugby Pacific and every All Blacks test.
- **Netball:** ANZ Premiership, with shooting %, gains, intercepts and super shots.
- **Football:** A-League men's and women's.
- **Cricket:** every international and domestic match worldwide, plus the Super Smash.
- **Basketball:** NBA (with NBA.com tracking data) and NBL.
- **Racing:** New Zealand gallops and harness, plus Australian meetings.

## Guides for every sport

Each competition has its own betting stats guides. Start with [NRL](/blog/sport/nrl), [netball](/blog/sport/netball), [cricket](/blog/sport/cricket) or the [NBA](/blog/sport/nba).
`,
    faqs: [
      { q: "Are times shown in New Zealand time?", a: "Yes. Every fixture, kick-off and race time is shown in New Zealand time, so there's no converting from Sydney or US Eastern time." },
      { q: "Does it work on my phone?", a: "Yes. Quick Read is built mobile-first, with sortable tables that scroll and light and dark modes." },
      { q: "What happens in the off-season?", a: "Each competition shows when it's back, and the full archive of results, ladders and player stats from the last season stays available." },
    ],
    zones: ["nrl", "netball", "cricket"],
  },
  {
    slug: "odds-boost-checker",
    nav: "Odds & boost checker",
    seoTitle: "Odds & Boost Checker: Fair Odds for Every Game | Quick Read NZ",
    description: "See our win chance and fair odds for every upcoming game, check any bookmaker price or boosted price against it, and read props straight from a screenshot.",
    keywords: ["odds boost checker", "fair odds", "value bets NZ", "boosted odds NZ", "betting odds comparison NZ"],
    kicker: "Odds hunting",
    h1: "Know when a price, or a boost, is worth it",
    intro:
      "Every upcoming game gets our own chances and fair odds: result, line, margin bands, totals and anytime scorers. Compare any bookmaker price or boost in seconds, or upload a screenshot of a props page and let the app read it.",
    img: { src: "/images/app-preview.png", alt: "Pre-match markets with our chance and fair odds" },
    points: [
      { title: "Fair odds on every market", body: "The bookmaker's margin removed, so you see what a price is really worth." },
      { title: "Boost check", body: "Type a boosted price and see whether it beats our number." },
      { title: "Screenshot reader", body: "Upload an NBA or NBL props screenshot; lines and prices are read and checked against each player's form." },
      { title: "Strong / Lean / Pass", body: "Every basketball prop gets a clear verdict with our chance next to the bookmaker's." },
    ],
    body: `
## Why fair odds matter

Every bookmaker price includes a margin. A $1.90 / $1.90 market is really $2.00 / $2.00 with about 5% taken off. Over hundreds of bets, that margin is the difference between winning and losing. Read [bookmaker margin explained](/blog/bookmaker-margin-overround-explained).

## Boosts

Boosts look generous, but many still sit below the fair price. Our chances let you tell the real ones from the marketing. See [are odds boosts worth it?](/blog/odds-boosts-are-they-worth-it)

## Try the free calculator

No account needed: the [betting odds calculator](/tools/betting-odds-calculator) converts odds, removes the margin from a market and works out the expected value of any bet or boost.
`,
    faqs: [
      { q: "Do you compare bookmaker odds?", a: "We show our own chance and fair odds for each market, rather than listing every bookmaker's price. You compare our fair price with the price your bookmaker offers." },
      { q: "What is a fair price?", a: "It's 1 divided by the true chance of an outcome. If a team has a 40% chance, its fair price is $2.50. A bookmaker price longer than that is value." },
      { q: "Can it read screenshots?", a: "Yes, for the NBA and NBL. Upload a screenshot of a player props page and the app reads the names, lines and odds, then checks each one against the player's recent games." },
    ],
    zones: ["betting-tools"],
  },
];

export const featureBySlug = (slug: string) => FEATURES.find((f) => f.slug === slug);
