import type { Post } from "./types";

export const aLeague: Post[] = [
  {
    slug: "a-league-betting-stats-guide",
    zone: "a-league",
    featured: true,
    title: "A-League betting stats: draws, goals and both teams to score",
    seoTitle: "A-League Betting Stats Guide | Goals, Draws, BTTS (2025–26 Data)",
    description: "A stats-first guide to A-League betting: 2.82 goals a game, 27.6% draws, 59.5% both-teams-to-score and almost no home advantage, with real 2025–26 numbers.",
    date: "2026-10-24",
    keywords: ["A-League betting", "A-League stats", "A-League tips", "football betting NZ", "Auckland FC", "Wellington Phoenix"],
    body: `
The A-League is a league of fine margins and plenty of goals, and its numbers look different from Europe's big leagues. Here's the 2025–26 A-League Men season in numbers, from 163 matches including finals.

## The 2025–26 baseline

| Market | A-League Men 2025–26 |
| --- | --- |
| Goals per game | 2.82 |
| Draws | 27.6% |
| Home wins | 37.4% |
| Away wins | 35.0% |
| Over 2.5 goals | 55.8% |
| Both teams to score | 59.5% |
| 0–0 draws | 5.5% |

Three things stand out.

## 1. Home advantage barely exists

Home teams won 37.4% and away teams 35.0%, almost even. In most football leagues home sides win noticeably more often than away sides. The A-League's shared stadiums, relatively small crowds and short flights for most trips cut the edge. Don't add much for home advantage. Read [our home advantage guide](/blog/a-league-home-advantage).

## 2. Draws are common

More than a quarter of games (27.6%) ended level. When two evenly matched sides meet, the draw is often the most likely single result. See [our draws guide](/blog/a-league-draws-betting).

## 3. Goals at both ends

Both teams scored in almost 60% of games, and over 2.5 landed in about 56%. Goalless draws were rare at 5.5%. Defences in the A-League aren't as organised as in Europe's top leagues, and teams attack in transition.

## How the app projects games

For football, the app rates each team's goal-scoring and goal-conceding against the league average, then uses a Poisson model to turn the expected goals for each side into chances for every scoreline. From those it works out the home win, draw and away win chances, over and under 2.5 goals, both teams to score, and the most likely correct scores. Early in the season it blends in last season's results.

## Women's A-League

The A-League Women has its own patterns: fewer draws (19.7%), a stronger home edge (45.3% home wins) and a similar 2.76 goals a game. See our [A-League Women guide](/blog/a-league-women-betting-stats).

## In the app

The [A-League section](/sport/a-league) has the official table, fixtures by round, match centres with team stats (possession, shots, passes, crosses, tackles), player stats (goals, assists, shots, shots on target, cards, saves) and key events. Switch between Men and Women at the top.
`,
  },
  {
    slug: "a-league-draws-betting",
    zone: "a-league",
    title: "Betting on A-League draws: when the stalemate is the value",
    description: "A-League Men games ended level 27.6% of the time in 2025–26. When draws are value, how Poisson models price them, and how to combine the draw with other markets.",
    date: "2026-10-18",
    keywords: ["A-League draw", "draw betting football", "A-League tips", "football draw no bet"],
    body: `
Most punters avoid the draw. In the A-League, that's a mistake: **27.6%** of men's games finished level in 2025–26. That's more than one in four.

## Why so many draws

- **Evenly matched teams:** salary caps and squad rules keep the gap between top and bottom smaller than in most leagues.
- **Weak home advantage:** with home and away teams winning at almost the same rate, two similar sides cancel out.
- **Late equalisers:** open, transition-heavy games mean a trailing side often gets a late goal.

## When the draw is value

The draw is most likely when:

1. **The two teams are evenly rated.** The closer our projected goals for each side, the higher the draw chance. For two teams projected at around 1.3 goals each, the draw chance is about 26 to 28%.
2. **Both teams score at a modest rate.** Games projected at 2.2 to 2.5 total goals produce more draws than 3.5-goal games.
3. **Both sides have something to lose.** Late-season games where a point suits both teams.

At 27% the fair price of a draw is about $3.70. When the bookie offers $3.90 or more on an even game, take a look.

## Using correct scores

The 1–1 draw is usually the single most likely scoreline in an even A-League game. Our Poisson model lists the top correct scores and their chances for every match. If 1–1 sits at 12 to 13% and the bookie pays $9 or more, that's worth noting.

## Draw-no-bet and double chance

If you like a team but worry about the draw, draw-no-bet (your stake back if it's a draw) and double chance (win or draw) are useful. Check the price: double chance at $1.50 implies about 67%, so make sure your win-plus-draw chance is higher than that.

## In the app

Each A-League pre-match page in the [app](/sport/a-league) shows the home win, draw and away win chances with fair odds, plus the most likely correct scores, with **+ Multi** buttons for your slip.
`,
  },
  {
    slug: "a-league-both-teams-to-score",
    zone: "a-league",
    title: "Both teams to score in the A-League: why 'yes' lands 60% of the time",
    description: "Both teams scored in 59.5% of A-League Men games in 2025–26. How BTTS is priced, which matchups favour yes or no, and how to combine it with totals.",
    date: "2026-10-11",
    keywords: ["both teams to score", "BTTS A-League", "A-League goals betting", "BTTS tips"],
    body: `
Both teams to score (BTTS) is one of the simplest football markets, and in the A-League it leans heavily one way. In 2025–26, **59.5%** of A-League Men games ended with both teams on the scoresheet.

## Why BTTS 'yes' is so common

- **Open football:** teams commit numbers forward and leave space behind.
- **Inconsistent defences:** even the better defensive sides concede regularly.
- **Few shut-outs:** goalless draws happened in only 5.5% of games.

## How it's priced

The app gives each team an expected-goals number from its attack and the opponent's defence, and works out the chance of each team scoring at least once. Multiply the two and you have BTTS 'yes'. For two teams each expected to score about 1.4 goals, it comes out at roughly 57 to 58%, right in line with the season average.

## When 'no' is the value

- **One very strong defence** against a weak attack. If one side's expected goals are below 0.9, its chance of scoring falls fast.
- **Heavy favourites at home** against a side that struggles to score away.
- **Wet or windy nights,** which suit low-scoring, scrappy games.

## When 'yes' is the value

- **Two attacking teams with leaky defences:** the classic yes.
- **Late-season games with nothing at stake,** which often open up.
- **Matches with a big goals total line (3.5 or more):** the more goals expected, the more likely both sides score.

## BTTS + over 2.5

BTTS 'yes' and over 2.5 goals are strongly linked. If both teams score, you only need one more goal. Combining them in a same-game multi is popular, but don't treat the legs as independent. The real chance is higher than multiplying the two. The app's [bet slip](/#features) flags legs from the same game.

## In the app

Every A-League pre-match page in the [app](/sport/a-league) shows BTTS yes/no, over and under 2.5, and correct-score chances with fair odds.
`,
  },
  {
    slug: "a-league-over-under-goals",
    zone: "a-league",
    title: "A-League over/under goals: betting the 2.5 line",
    description: "A-League Men averaged 2.82 goals a game in 2025–26 and 55.8% of games went over 2.5. How to bet totals using expected goals, matchups and conditions.",
    date: "2026-10-04",
    keywords: ["A-League over under", "over 2.5 goals", "A-League totals", "football goals betting NZ"],
    body: `
The 2.5-goals line is the most popular A-League totals market. In 2025–26 the men's competition averaged **2.82 goals a game**, and **55.8%** of games went over 2.5.

## Expected goals for each side

The app's football model gives each team an expected goal count based on its attack and the opponent's defence, adjusted slightly for home ground. Add the two together for the expected total. A game projected at 3.0 goals has about a 58% chance of going over 2.5. One projected at 2.4 sits around 43%.

## What pushes totals up

- **Two attacking sides:** look at both teams' goals for and against on the [table](/sport/a-league/ladder).
- **Late in the season:** sides chasing finals throw players forward, and eliminated teams sometimes stop defending.
- **Dry, warm conditions:** a fast pitch suits transition football.

## What pulls totals down

- **Strong goalkeepers and defences:** save numbers in the match centre tell you who's keeping their side in games.
- **Wet nights** and heavy pitches.
- **Finals:** knockout games tend to be cagier, at least until someone scores.

## Beyond 2.5

- **Over 1.5** lands in most A-League games. It's often too short to be value by itself.
- **Over 3.5** is where the longer prices are. Back it only when both teams' expected goals are high.
- **Team totals:** if you expect one-way traffic, a team's own over 1.5 can be better value than the match total.

## Shots tell you who's due

Shots and shots on target are more stable from game to game than goals. A team generating plenty of shots on target but scoring few is likely to score more soon. The match centres and team stats in the app show shots, shots on target and saves for every game.

Every A-League pre-match page in the [app](/sport/a-league) shows the projected score, over and under 2.5 chances and fair odds.
`,
  },
  {
    slug: "auckland-fc-champions-stats",
    zone: "a-league",
    title: "Auckland FC: champions in season two, and what the numbers say",
    description: "How Auckland FC won the 2026 A-League Men Grand Final 1–0 against Sydney FC in only their second season, and how to bet on them in 2026–27.",
    date: "2026-09-26",
    keywords: ["Auckland FC", "Auckland FC grand final", "A-League champions 2026", "Auckland FC betting"],
    body: `
Auckland FC have gone from expansion club to champions in two seasons. On 23 May 2026 they beat **Sydney FC 1–0** in the A-League Men Grand Final in Auckland, settled by a deflected strike from Cameron Howieson.

## The season

Auckland finished third in the regular season on 42 points, behind premiers **Newcastle Jets** (48) and **Adelaide United** (43). Their finals run included a 3–0 win away to Adelaide United, and they then hosted the Grand Final after Sydney knocked out the premiers, Newcastle.

## Why they won

- **Defence first.** A 1–0 Grand Final was typical of Auckland's approach. They're well organised without the ball and hard to break down.
- **Home crowds.** Auckland's crowds are among the biggest in the league, and the club is one of the few that turns home ground into a real edge in a league where [home advantage is otherwise tiny](/blog/a-league-home-advantage).
- **Squad stability.** They kept their core together through their first two seasons.

## Betting on Auckland in 2026–27

**Expect shorter prices.** Champions always carry a premium, especially with strong New Zealand support behind them in the market. Our win chance will often say their price is a little short at home.

**Unders and BTTS 'no'.** A defensive side that wins low-scoring games is often better backed through unders, or BTTS 'no' when they're favourites, than at short head-to-head odds.

**Travel.** Auckland face the league's longest trips: every away game except against the Phoenix means crossing the Tasman. Watch their results on long away trips.

## Track them in the app

The [A-League section](/sport/a-league) has Auckland's results, home and away record, team stats and player stats. Every pre-match page shows our projected score, the home win, draw and away chances, and the most likely correct scores.
`,
  },
  {
    slug: "wellington-phoenix-betting-guide",
    zone: "a-league",
    title: "Betting on the Wellington Phoenix: a stats guide",
    description: "How to bet on the Wellington Phoenix men and women with stats: travel, home form, goals and draws, and the women's run to the 2026 Grand Final.",
    date: "2026-09-19",
    keywords: ["Wellington Phoenix", "Phoenix betting", "A-League NZ teams", "Wellington Phoenix women"],
    body: `
The Wellington Phoenix are the original New Zealand A-League club. Both their men's and women's teams give Kiwi punters reasons to watch, and some useful betting angles.

## Phoenix women: a breakthrough season

The 2025–26 A-League Women season was the Phoenix women's best yet. They finished second on the table (34 points) behind **Melbourne City** (40), beat Brisbane Roar in the finals and reached their first Grand Final, where they lost **3–1** to City on 16 May 2026. In a league where home sides win 45% of games, their home form is a big part of their success.

## Phoenix men

The men's side has more up-and-down history. Use the numbers rather than reputation: check the table, the home and away split and recent goals for and against before backing them.

## Angles for Phoenix games

**Travel.** Like Auckland FC, the Phoenix cross the Tasman for almost every away game. Results at the end of long trips are worth tracking.

**Wellington weather.** Wind and rain at home can make games scrappier and lower-scoring, so check the forecast before backing an over in Wellington.

**The New Zealand derby.** Phoenix v Auckland FC games draw big crowds and big emotion. Derbies tend to be tighter than the form suggests, so the draw and the unders deserve a look.

**Market bias.** Like any New Zealand team, the Phoenix attract loyal money, which can push their prices shorter than our numbers suggest, especially at home.

## In the app

The [A-League section](/sport/a-league) covers both the men's and women's competitions. Use the Men/Women switch at the top. Each match centre has key events, team stats and player stats, and every upcoming game has win/draw/loss chances and correct-score projections.
`,
  },
  {
    slug: "a-league-women-betting-stats",
    zone: "a-league",
    title: "A-League Women betting stats: home edge, goals and the 2026 finals",
    description: "A-League Women in numbers: 2.76 goals a game, 45% home wins, fewer draws than the men's league, and Melbourne City's 3–1 Grand Final win over the Phoenix.",
    date: "2026-09-12",
    keywords: ["A-League Women betting", "A-League Women stats", "women's football betting", "Melbourne City women"],
    body: `
The A-League Women gets far less betting attention than the men's competition, which can mean softer markets. Its numbers also look quite different. Here's 2025–26 from 117 matches.

## The baseline

| Market | A-League Women 2025–26 |
| --- | --- |
| Goals per game | 2.76 |
| Home wins | 45.3% |
| Draws | 19.7% |
| Away wins | 35.0% |
| Over 2.5 goals | 58.1% |
| Both teams to score | 56.4% |
| 0–0 draws | 8.5% |

## Differences from the men's league

- **A real home edge:** home sides won 45% of games compared with 37% in the men's league.
- **Fewer draws:** under 20%, compared with almost 28% for the men. Results are more decisive.
- **Bigger gaps between teams:** more games were one-sided, which suits double-chance and handicap bets on the stronger side.

## The 2025–26 season

**Melbourne City** topped the table (40 points) and won the Grand Final **3–1** against the **Wellington Phoenix** on 16 May 2026. The Phoenix (34 points) reached their first Grand Final after beating Brisbane Roar in the semi-finals. Canberra United and Brisbane were next on 31 points each.

## Betting angles

- **Back strong home sides:** with a 45% home win rate and fewer draws, home favourites have been more reliable than in the men's league.
- **Overs:** 58% of games went over 2.5 goals.
- **Watch team news:** squads are smaller and international duty matters, so a missing key player affects a women's team more than a men's team.

## In the app

Switch to **Women** at the top of the [A-League section](/sport/a-league-w) for the women's table, fixtures, match centres and player stats, with the same projections and fair odds as the men's league.
`,
  },
  {
    slug: "a-league-anytime-goalscorer",
    zone: "a-league",
    title: "A-League anytime goalscorer: finding value with shots and minutes",
    description: "How to bet A-League anytime goalscorer markets using goals, shots, shots on target, minutes, penalties and team expected goals.",
    date: "2026-09-05",
    keywords: ["anytime goalscorer", "A-League goalscorer tips", "football player props NZ", "first goalscorer"],
    body: `
Anytime goalscorer bets are fun, but they're priced with a big margin. With fewer than three goals a game in the A-League, even the best strikers fail to score more often than they score. Here's how to find the occasional value.

## Start with the team

A player can't score if his team doesn't. The app's football model projects each team's expected goals. A striker on a side expected to score 2.0 has a much better chance than the same striker on a side expected to score 0.9. Our anytime chances combine each player's season scoring rate with his team's projected goals for that match.

## Shots and shots on target

Goals vary a lot from game to game. Shots don't vary as much. A forward averaging three shots a game with one or more on target is getting into scoring positions, and the goals usually follow. The match centres and season stats in the app show shots and shots on target for every player.

## Minutes matter

A striker who's subbed off on 60 minutes most weeks has a third less time to score. Players who come off the bench score rarely. The app's player stats show appearances and sub appearances, so check who's actually starting.

## Penalties

Penalty takers get a bonus chance in every game. In the A-League, a team averages a penalty every few matches, which adds a few percentage points to the regular taker's anytime chance.

## Turn it into fair odds

If your chance is 30%, the fair price is $3.33. Strikers in good form are often priced at $2.50 to $3.00, which suggests a chance of 33 to 40%. That only makes sense for elite strikers on high-scoring teams.

## Don't stack them

Two anytime scorers at 30% each both come in only about 9% of the time. Scorers from the same team are slightly positively linked, but not enough to justify the prices on most goalscorer multis. Use the [bet slip](/#features) to check the combined chance.

Every A-League pre-match page in the [app](/sport/a-league) lists anytime-scorer chances for both teams, with each player's goals, games and last-five record.
`,
  },
  {
    slug: "a-league-home-advantage",
    zone: "a-league",
    title: "Is there home advantage in the A-League? Barely — here's why",
    description: "Home teams won only 37.4% of A-League Men games in 2025–26 versus 35% for away teams. Why the A-League's home edge is so small and how to bet accordingly.",
    date: "2026-08-29",
    keywords: ["A-League home advantage", "A-League home away record", "football home advantage"],
    body: `
In most football leagues, home sides win clearly more often than away sides. In the 2025–26 A-League Men, home teams won **37.4%** of games and away teams **35.0%**. That's almost no edge at all.

## Why it's so small

- **Shared and oversized stadiums:** several clubs play in big multi-sport venues that are rarely full, so they don't feel like home.
- **Short trips for most clubs:** many Australian away games are a short flight or a drive.
- **Similar conditions:** most venues have similar pitches and climates, unlike the extremes you find in some leagues.
- **Crowd size:** apart from a few clubs with big, loud crowds, the atmosphere doesn't differ much between home and away.

## Where it does matter

- **Auckland FC and the Wellington Phoenix:** visiting Australian teams cross the Tasman, and Auckland's crowds are among the biggest in the league.
- **Big derbies:** Sydney and Melbourne derbies can have a real home edge because of the crowd split.
- **The women's league:** the A-League Women had a much bigger home edge (45% home wins).

## Betting implications

1. **Don't over-back home favourites.** The market adds more home advantage than the results support.
2. **Away sides in even games can be value,** especially strong travelling teams.
3. **The draw benefits too.** With little home edge, two even teams produce a lot of draws (27.6% last season).

## In the app

The football model in the [A-League section](/sport/a-league) estimates home advantage from the season's results, which for the A-League means a small adjustment, and projects every game's win, draw and loss chances from there.
`,
  },
  {
    slug: "a-league-correct-score-betting",
    zone: "a-league",
    title: "Correct score betting in the A-League: how the Poisson model works",
    description: "How football correct-score chances are calculated with a Poisson model, the most common A-League scorelines, and when correct-score prices offer value.",
    date: "2026-08-22",
    keywords: ["correct score betting", "Poisson football model", "A-League correct score", "football betting maths"],
    body: `
Correct-score bets pay big prices, but even the most likely scoreline rarely comes up more than one game in eight. Here's how to price them properly.

## The Poisson model in plain English

Goals in football are rare and roughly random events. A Poisson distribution describes exactly that kind of event: given an average rate, it tells you the chance of 0, 1, 2, 3 and so on happening.

1. Work out each team's **expected goals** for the match from its attack and the opponent's defence.
2. Use Poisson to get the chance of each team scoring 0, 1, 2, 3 and more.
3. Multiply the two teams' chances for every combination to get each scoreline.

For a game where the home side is expected to score 1.5 and the away side 1.2:

| Score | Chance |
| --- | --- |
| 1–1 | ~12% |
| 1–0 | ~10% |
| 2–1 | ~9% |
| 0–1 | ~8% |
| 2–0 | ~7% |

## The A-League's common scorelines

With 2.82 goals a game, 1–1 is the most common single scoreline in even games, followed by 2–1 and 1–0. Goalless draws were rare (5.5% in 2025–26).

## Where value hides

- **Bookies pile margin onto correct scores.** Fair odds for a 12% scoreline are $8.33, and you'll often see $7.00 offered. Pass on those.
- **Higher-scoring results** like 2–2 and 3–1 sometimes drift too far in high-tempo matchups.
- **The model's limits:** Poisson slightly underestimates draws in tight leagues, which is part of why the A-League's real draw rate (27.6%) is so high. Add a little to draw scorelines in even games.

## In the app

Every A-League pre-match page in the [app](/sport/a-league) shows the three most likely correct scores with our chance and fair odds, alongside the home win, draw and away win, over and under 2.5 and both-teams-to-score markets.
`,
  },
];
