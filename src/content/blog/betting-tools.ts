import type { Post } from "./types";

export const bettingTools: Post[] = [
  {
    slug: "best-betting-stats-tools-nz-2026",
    zone: "betting-tools",
    featured: true,
    title: "Best betting stats tools for NZ punters in 2026: features and prices compared",
    seoTitle: "Best Betting Stats Apps & Tools NZ 2026 | Prices Compared",
    description: "Props.Cash, Outlier, Action Network, MultiLab, Punters, WagerWise and Quick Read compared: what each betting research tool covers, what it costs, and which suits New Zealand punters.",
    date: "2026-10-30",
    keywords: ["best betting apps NZ", "betting stats app", "sports betting tools NZ", "MultiLab alternative", "Props.Cash alternative", "betting research tool"],
    body: `
Betting research tools have exploded, but most are built for American leagues or Australian bookmakers. Here's how the main options compare for someone betting from New Zealand.

> Prices are as listed by each provider in October 2026 and can change. US and Australian dollar prices need converting at the current exchange rate.

## At a glance

| Tool | Best for | Price |
|---|---|---|
| Props.Cash | US player props and hit rates | US$19.99/month or US$199.99/year |
| Outlier | US props, odds and +EV across several sports | US$19.99–79.99/month (tiers), 7-day trial |
| Action Network PRO | US betting news, odds and public betting data | US$29.99/month or US$119.99/year |
| MultiLab | AI multi builder for AFL, NRL, NBA and US sports | Free app; MultiLab+ US$34.99/month, Pro US$119.99/month |
| Punters (Punters+) | Australian racing form, speed maps, blackbook | AU$8.99/month |
| WagerWise | +EV, arbitrage and bonus-bet tools for Australian bookies | A$79.95/month |
| **Quick Read** | NZ & AU sport and NZ racing: stats, projections, multis | **NZ$9.99/month** |

## The US tools: Props.Cash, Outlier, Action Network

All three are polished and data-rich, but they're built around the NBA, NFL, MLB and NHL. You'll find little or nothing on the NRL, Super Rugby, netball or the Super Smash. If you mainly bet NBA player props, they're excellent. For Kiwi sport they don't cover much.

## MultiLab

An Australian app with an AI "Smart Bet Builder" that generates multis to a target price, plus player stats, live scores and odds comparison. It covers the AFL, NRL, NBA and US sports. Its paid tiers cost several times our price, and New Zealand competitions such as the ANZ Premiership and Super Smash aren't on its list.

## Punters

A strong racing app focused on Australia, with form guides, speed maps, sectional times and a blackbook for tracking horses, jockeys and trainers. It covers New Zealand thoroughbred meetings, but it isn't a team-sports tool.

## WagerWise

An "advantage betting" platform: +EV bets, arbitrage and bonus-bet conversions across Australian bookmakers. It's a different product. It's about exploiting bookmaker prices and promotions rather than understanding the sport, and it's priced accordingly.

## Quick Read

Our own product, so judge us on the details:

- **Covers:** the All Blacks, NRL, Super Rugby, ANZ Premiership, A-League men's and women's, Super Smash, world cricket, NBA, NBL, and NZ thoroughbred and harness racing.
- **Tools:** live match centres, projections and fair odds, an [automated multi builder](/features/multi-builder), [The Ultimate Bet](/features/ultimate-bet) cross-sport multi finder, an odds and boost checker, and [NZ racing form](/features/nz-horse-racing-form) with jockey and trainer stats.
- **Price:** NZ$9.99 a month, one plan, cancel anytime.
- **What we don't do:** we don't compare bookmaker odds across sites or offer arbitrage tools, and our racing form is built from results we've recorded rather than full career records.

## Which should you pick?

- **Mostly NBA props?** A US tool will go deeper.
- **Mostly Australian racing?** Punters is built for it.
- **Bet across NZ and Australian sport, and want one tool for all of it?** That's the gap Quick Read was built to fill.

You can try our free [betting odds calculator](/tools/betting-odds-calculator) without signing up.
`,
  },
  {
    slug: "how-to-build-a-cross-sport-multi",
    zone: "betting-tools",
    title: "How to build a cross-sport multi (and why one leg per sport helps)",
    seoTitle: "Cross-Sport Multi Guide | Build a Better Multi Bet NZ",
    description: "Why mixing sports in a multi reduces hidden correlation, how to work out a multi's real chance and fair price, and how The Ultimate Bet builds three options for the next 48 hours.",
    date: "2026-10-30",
    keywords: ["multi bet NZ", "cross sport multi", "multi builder", "how to build a multi", "multi tips", "ultimate bet"],
    body: `
Most multis fail for a simple reason: too many legs, priced too short, from the same game. A cross-sport multi takes a different approach.

## The maths of a multi

A multi only lands if every leg wins, so you multiply the chances:

- Three legs at 70%: 0.7 × 0.7 × 0.7 = **34%**, a fair price of about $2.92.
- Five legs at 70%: **17%**, about $5.95.

Every leg also carries the bookmaker's margin, and those margins multiply too. Five legs each with a 5% margin leave the combined price about 22% below fair. Fewer, stronger legs keep that in check.

## Why mix sports?

Legs from the same game are linked. If the favourite wins big, their star player probably scored, and the total probably went over. Bookmakers know this and price same game multis accordingly.

Legs from different sports and different games are close to independent. A result in Wellington tells you nothing about one in Mumbai. That makes the combined chance easier to judge.

## How The Ultimate Bet works

[The Ultimate Bet](/features/ultimate-bet) scans every game we cover in the next 48 hours: NBA, NBL, rugby league and union, football, netball, cricket and NZ racing. It rates each market with our models and builds three options, using one pick per sport:

1. **Banker:** the strongest pick in each sport. Highest chance, shortest price.
2. **Balanced:** solid favourites and lines from different games.
3. **Big Price:** lines, totals and closer calls where our numbers still lean one way.

Each leg shows our chance, the fair odds and a one-line reason, and you can add any option to your bet slip in one tap.

## Building your own

1. Pick one leg per sport or game.
2. Write down your chance for each leg, honestly.
3. Multiply the chances to get the multi's chance; 1 ÷ that is the fair price.
4. Only place it if the bookmaker's combined price is longer than fair.

Our free [odds calculator](/tools/betting-odds-calculator) has a multi calculator that does steps 3 and 4 for you.
`,
  },
  {
    slug: "implied-probability-fair-odds-explained",
    zone: "betting-tools",
    title: "Implied probability and fair odds: how to tell if a price is value",
    seoTitle: "Implied Probability & Fair Odds Explained | Value Betting NZ",
    description: "Turn any decimal price into a probability, remove the bookmaker's margin to find fair odds, and use expected value to tell a good bet from a bad one, with worked examples.",
    date: "2026-10-29",
    keywords: ["implied probability", "fair odds", "value betting", "expected value betting", "decimal odds explained"],
    body: `
Every price is a probability in disguise. Once you can read it, you can tell value from a trap.

## From odds to probability

For decimal odds, the implied probability is **1 ÷ odds**:

| Odds | Implied chance |
|---|---|
| $1.50 | 66.7% |
| $2.00 | 50.0% |
| $3.00 | 33.3% |
| $5.00 | 20.0% |
| $10.00 | 10.0% |

## The margin

Add up the implied chances of every outcome and you'll get more than 100%. In a two-way market at $1.90 / $1.90, it's 52.6% + 52.6% = 105.3%. That extra 5.3% is the bookmaker's margin, or overround.

To find the **fair** chance, divide each implied chance by the total: 52.6 ÷ 105.3 = 50%. The fair price is $2.00. More in our guide to the [bookmaker margin](/blog/bookmaker-margin-overround-explained).

## Expected value

Expected value (EV) is what a bet returns on average if your chance is right:

**EV = (your chance × odds) − 1**

If you rate a team a 55% chance and the price is $2.00: 0.55 × 2.00 − 1 = **+0.10**, or +10 cents per dollar. At $1.75: 0.55 × 1.75 − 1 = **−0.04**, a losing bet in the long run even if it wins today.

## Where does "your chance" come from?

That's the hard part. Quick Read's projections give you a starting point for every game we cover: win chances, margins, totals and anytime scorers, all with the margin taken out. Your own knowledge of team news and conditions adjusts from there.

## Try it

Our free [betting odds calculator](/tools/betting-odds-calculator) converts odds, removes the margin from a market and works out expected value, including for odds boosts.
`,
  },
  {
    slug: "odds-boosts-are-they-worth-it",
    zone: "betting-tools",
    title: "Odds boosts: how to check if a boost is actually worth it",
    seoTitle: "Are Odds Boosts Worth It? | How to Check a Boosted Price NZ",
    description: "Bookmakers push boosted prices every day. Here's how to compare a boost with the fair price, why most boosts on multis still lose, and a quick test you can use before you bet.",
    date: "2026-10-29",
    keywords: ["odds boost", "boosted odds", "price boost NZ", "are odds boosts worth it", "boost calculator"],
    body: `
A boost looks generous: $3.00 becomes $3.50. But a boost is only value if the new price is longer than the bet's real chance.

## The test

1. Work out the selection's fair chance (remove the margin, or use your own rating).
2. Turn it into a fair price: 1 ÷ chance.
3. If the boosted price is longer than the fair price, the boost has value. If not, it's marketing.

**Example:** a team rated 30% has a fair price of $3.33. The bookie's normal price is $2.90 (poor value); boosted to $3.60, it becomes worth taking. Boosted to $3.20, it still isn't.

## Why multi boosts often aren't worth it

Boosts are often applied to multis or same game multis. Each leg already carries a margin, and those margins multiply. A 20% boost on a five-leg same game multi can still leave you well below fair, especially when the legs are correlated and priced to account for it.

## Where boosts do help

- **Single selections** in liquid markets, where the margin is small and a boost can tip the price past fair.
- **Selections you already rate.** A boost on something you'd bet anyway is a bonus. A boost on something you wouldn't is a lure.

## Check in seconds

Our free [odds calculator](/tools/betting-odds-calculator) compares a normal price and a boosted price against your chance and shows the expected return of each. Inside Quick Read, every game already shows our chance and fair odds, so checking a boost takes one glance.
`,
  },
  {
    slug: "same-game-multi-vs-cross-sport-multi",
    zone: "betting-tools",
    title: "Same game multi vs cross-sport multi: which gives you a better chance?",
    seoTitle: "Same Game Multi vs Multi Bet | SGM Odds Explained NZ",
    description: "How same game multis are priced, why correlated legs cost you, and when a multi across different games or sports is the better bet.",
    date: "2026-10-28",
    keywords: ["same game multi", "SGM tips", "same game multi odds", "multi bet tips NZ", "SGM vs multi"],
    body: `
Same game multis (SGMs) are the most popular bet type in Australian and New Zealand sport. They're also among the most profitable for bookmakers. Here's why, and when a normal multi is the better option.

## Correlation

In a single game, outcomes are linked. If a team wins by 20, its main try scorer has probably scored and the total has probably gone over. An SGM prices those links in: you don't get the full product of the individual prices.

Bookmakers also add a margin on top, and SGM margins are typically higher than on single markets because they're harder for punters to price.

## The hidden cost

Say you combine three legs from one NRL game, each at about $1.80. Multiplied, that's $5.83, but the SGM might offer $4.50 because the legs are correlated. Some of that gap is fair correlation; some of it is extra margin. Without a model, you can't tell which.

## When an SGM makes sense

- When you have a specific view on **how** a game will play out, like a forward-dominated arm wrestle: under the total, plus a forward to score.
- When the legs are **negatively** correlated in the bookmaker's model but you think they'll happen together.

## When a cross-game multi is better

When your picks are independent, such as different games, sports or days, there's no correlation discount. You get closer to the full product of the prices, and you can judge each leg on its own.

That's the idea behind [The Ultimate Bet](/features/ultimate-bet): one pick per sport across the next 48 hours, each with our chance and fair price shown.

## A simple rule

For any multi, multiply your chances for each leg, take 1 ÷ that number as the fair price, and compare it with what's on offer. Our [odds calculator](/tools/betting-odds-calculator) does it in seconds.
`,
  },
  {
    slug: "bookmaker-margin-overround-explained",
    zone: "betting-tools",
    title: "Bookmaker margin (overround) explained: how much are you really paying?",
    seoTitle: "Bookmaker Margin & Overround Explained | Betting Maths NZ",
    description: "What a bookmaker's margin is, how to calculate it for any market, typical margins on head-to-head, racing and multis, and how to remove it to find fair odds.",
    date: "2026-10-28",
    keywords: ["bookmaker margin", "overround", "vig", "betting margin calculator", "fair odds calculator"],
    body: `
Every price includes the bookmaker's cut. Knowing how big it is tells you how much edge you need to make a bet worthwhile.

## How to calculate it

Add up 1 ÷ odds for every outcome in the market, then subtract 1.

**Head to head at $1.85 / $1.95:** 0.541 + 0.513 = 1.053, a **5.3%** margin.

**A ten-horse race** where the prices add up to 1.20 has a **20%** margin, shared across the field.

## Typical margins

- **Head to head in major sports:** usually a few per cent.
- **Totals and lines:** similar, sometimes a little higher.
- **Player props and try scorers:** higher. Many runners, harder to price.
- **Racing win markets:** commonly 15–25% across the field.
- **Same game multis:** the highest, because the margin applies on top of correlation.

## Removing it

Divide each outcome's implied chance by the market total. In the head-to-head above, the favourite's fair chance is 0.541 ÷ 1.053 = 51.3%, a fair price of $1.95 rather than $1.85.

Quick Read does this on every race card and match preview, showing each runner's or team's chance with the margin taken out.

## Why it matters

A 5% margin means you need to be right about 5% more often than a coin flip just to break even on even-money bets. A 20% racing margin means the average bet loses 20 cents per dollar. Picking your spots, and only betting when your price beats fair, is the only way around it.

Calculate any market's margin with our free [betting odds calculator](/tools/betting-odds-calculator).
`,
  },
];
