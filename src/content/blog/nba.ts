import type { Post } from "./types";

export const nba: Post[] = [
  {
    slug: "nba-player-props-stats-guide",
    zone: "nba",
    featured: true,
    title: "NBA player props: the stats-first guide for NZ punters",
    seoTitle: "NBA Player Props Guide NZ | Points, Rebounds, Assists Stats",
    description: "How to bet NBA player props with stats: minutes, usage, pace, matchups, hit rates and recent form, plus how to build same-game multis that make sense.",
    date: "2026-10-26",
    keywords: ["NBA player props", "NBA props NZ", "NBA betting tips", "points rebounds assists", "NBA same game multi"],
    body: `
NBA player props (points, rebounds, assists, threes, blocks and combinations) are the most popular way New Zealanders bet on basketball. With 82 games a season and full box scores for every one, they're also some of the best-researched markets in sport. Here's a stats-first approach.

## 1. Minutes come first

Every counting stat depends on minutes. A player averaging 20 points in 34 minutes who's on a restriction, or in foul trouble, or in a blowout, won't get there in 26. Before anything else:

- check the injury report for minutes restrictions
- check whether the game projects as a blowout. Starters sit in fourth quarters of lopsided games
- look at the last five games' minutes, not the season average

## 2. Usage tells you who gets the shots

Usage rate estimates the share of a team's possessions a player uses while on the floor. When a high-usage teammate is out, the remaining players' usage, and their points, goes up. That's the single biggest edge in props. See our [usage rate guide](/blog/nba-usage-rate-props).

## 3. Pace and the game total

Faster games mean more possessions and more stats for everyone. A game projected for a 235 total offers more points, rebounds and assists than a 210 grind. See our [pace guide](/blog/nba-pace-and-totals).

## 4. Hit rates and recent form

How often has a player cleared this line in his last 10 games? A player who's gone over 22.5 points in 8 of his last 10 is a different bet from one who's done it 4 times, even if their averages are similar. Hit rates show how consistent a player is.

## 5. Matchup

Some defences give up points to guards and others to big men. Teams that play slow and switch everything suppress assists. Look at how opponents have done against the team you're betting on.

## How the app helps

- **Scan for stats:** scans any game (or a whole night) and flags players with standout projections in points, rebounds, assists, threes, steals and blocks, with recent hit rates.
- **Build combinations:** simulates the game 10,000 times to find the most likely multi-leg combinations.
- **Massive multi:** hunts realistic longshots, such as a role player who averages 4 points but has hit 8 or more in recent games.
- **Odds check:** upload a screenshot of a props page and the app reads the lines and grades each against the player's last 10 games and our projection.

Everything is in NZ time. NBA games mostly tip off between about 11am and 4pm here, which suits a lunchtime bet. Start in the [NBA section](/nba).
`,
  },
  {
    slug: "nba-pace-and-totals",
    zone: "nba",
    title: "NBA pace and game totals: how possessions drive every stat",
    description: "What pace means in the NBA, how it's measured, how it drives game totals and player props, and how to use pace mismatches in betting.",
    date: "2026-10-20",
    keywords: ["NBA pace", "NBA totals betting", "NBA over under", "possessions per game"],
    body: `
Pace is the number of possessions a team uses per 48 minutes. It's the hidden driver behind almost every NBA market: totals, team totals and every player prop.

## Why pace matters

More possessions mean more shots, more rebounds, more assists and more points. A game played at 104 possessions gives each team about six more trips down the floor than one at 98. That's roughly 6 to 7 more points per team, plus more counting stats for everyone.

## How pace is estimated

Possessions are estimated from the box score: field-goal attempts, free-throw attempts (weighted), offensive rebounds and turnovers. The app calculates pace for every team and every game, and shows league averages on the [NBA dashboard](/nba).

## Pace mismatches

When a fast team plays a slow one, the game usually lands in between, often a bit closer to the home team's preferred tempo. That makes mismatches useful:

- **Overs:** two fast teams. Totals can still be set too low early in the season.
- **Unders:** two slow, defensive teams. Points props on both teams' stars can be inflated.

## Pace and player props

If the projected game total is well above the league average, nudge every player's projection up. If it's a slow game, nudge down. Rebounds go up with pace too, because there are more missed shots to collect.

## Other things that change pace

- **Back-to-backs:** tired teams often play slower. See our [rest guide](/blog/nba-back-to-backs-rest).
- **Injuries:** losing a fast-break point guard slows a team down.
- **Blowouts:** garbage time can be fast and sloppy, but with bench players.

## In the app

Each NBA game page shows possessions and pace, offensive and defensive ratings, and the four factors. The dashboard shows league average pace and each team's numbers, and every upcoming game gets a projected score and total.
`,
  },
  {
    slug: "nba-usage-rate-props",
    zone: "nba",
    title: "Usage rate: the NBA prop edge when stars sit out",
    description: "What NBA usage rate measures, why it's the biggest edge in player props when stars are injured, and how to find the players who benefit.",
    date: "2026-10-14",
    keywords: ["NBA usage rate", "NBA injuries props", "NBA props value", "usage rate explained"],
    body: `
Usage rate estimates the share of a team's possessions a player uses (with a shot, free throws or a turnover) while he's on the court. It's the key to the most reliable edge in NBA props: what happens when a star doesn't play.

## The formula, roughly

Usage counts a player's shots, free-throw trips and turnovers against the team's total while he's on the floor. A star might sit at 30% or more, while a role player sits at 12 to 18%.

## When a star sits

If a 32% usage player is out, his team still has to use those possessions. They spread across the other players, mostly the next-highest-usage guards and wings. Their shot attempts, and their points, go up.

The market often adjusts the obvious replacement's line and misses the second and third beneficiaries.

## How to find the beneficiaries

1. **Look at past games without the star.** Game logs show how teammates performed when he missed games before.
2. **Positional overlap:** a missing point guard frees up ball-handling and assists for the next guard, while a missing big man frees up rebounds for the remaining bigs.
3. **Minutes increase:** the player who moves into the starting line-up gets more minutes as well as more usage.

## Watch the timing

NBA injury news often comes 30 to 90 minutes before tip-off, which in New Zealand is late morning or early afternoon. Lines move fast once a star is ruled out, so the edge goes to people who check close to tip-off.

## In the app

The [NBA section](/nba) shows each player's usage rate, per-36 stats and full game logs, and each team page has the current injury report. Scan for stats picks up injured players and leaves them out of projections, so the beneficiaries' projected minutes and stats rise to match.
`,
  },
  {
    slug: "nba-same-game-multi-correlation",
    zone: "nba",
    title: "NBA same-game multis: correlation, not coincidence",
    description: "How to build NBA same-game multis using correlated legs — team totals, player points, assists to scorers — and why most multis are priced against you.",
    date: "2026-10-08",
    keywords: ["NBA same game multi", "NBA SGM", "NBA multi tips", "correlated parlays"],
    body: `
NBA same-game multis are everywhere, but most punters build them from independent picks the bookie has priced with a margin on every leg. The way to build smarter ones is correlation: picking legs that tend to happen together.

## Positive correlation

- **Point guard assists + teammate points:** if the point guard racks up assists, someone is scoring off them.
- **Team total over + star points over:** a high-scoring game for the team is usually a big game for its best scorer.
- **Big man rebounds + opponent's poor shooting:** more misses mean more rebounds.

## Negative correlation

- **Two stars on the same team both going big:** there's only one ball. If one goes for 40, the other's shots often drop.
- **Game under + a role player's points over:** slow, low-scoring games limit everyone.

## Simulation beats multiplication

Multiplying individual chances only works for independent events. The app's **Build combinations** tool simulates the whole game 10,000 times with shared effects for game pace, team form and player variance, so it captures how legs move together. It shows each combination's joint chance and compares it with simply multiplying the legs.

## Avoid filler

Adding a near-certain leg (a star to score 10 or more, a favourite to win at $1.10) adds margin without adding value. If a leg doesn't change the story of your multi, leave it out.

## Size your expectations

A four-leg multi at 55% per leg comes in about 9% of the time if the legs are independent. Correlation might lift that to 11 or 12%. These are still longshots, so stake accordingly.

## The longshot approach

The app's **Massive multi** goes the other way: it hunts legs at 10 to 45%, where a player has shown he can reach a higher line in recent games, and combines them into big-priced multis. They won't land often, but when the legs are realistic, the price can be fair.

Start in the [NBA section](/nba): scan a game, build combinations, and add your picks to the [bet slip](/#features).
`,
  },
  {
    slug: "nba-back-to-backs-rest",
    zone: "nba",
    title: "Back-to-backs and rest days: how fatigue shows up in NBA stats",
    description: "How NBA back-to-backs, travel and rest affect results, totals and player minutes, and how to factor schedule spots into your bets.",
    date: "2026-10-02",
    keywords: ["NBA back to back", "NBA rest days", "NBA schedule betting", "load management"],
    body: `
The NBA schedule is brutal: 82 games in about five and a half months, with plenty of back-to-backs and cross-country travel. Fatigue shows up in the numbers.

## What changes on a back-to-back

- **Shooting dips,** especially from three, because tired legs shorten shots.
- **Pace can slow,** with less energy for transition.
- **Stars rest.** Load management means some stars sit one game of a back-to-back.
- **Defence slips,** so the rested opponent often scores more efficiently.

## Schedule spots to watch

1. **Second night of a back-to-back away from home,** especially after travel.
2. **Three games in four nights,** or four in six.
3. **Long road trips,** especially late in a trip.
4. **Rested team v tired team:** the classic mismatch.

## Prop implications

- **Stars on the second night:** check whether they're playing at all, then consider unders if they are, especially on threes.
- **Bench players:** when starters rest, bench minutes and usage go up. That's a prop angle the market often misses.
- **Rebounds:** tired shooters miss more, which means more rebound chances.

## Don't overdo it

Fatigue effects are real but modest, a point or two on a spread. They matter most when they stack up: a back-to-back after travel, against a rested team, with the star listed as questionable.

## In the app

The [NBA section](/nba) shows every team's schedule and results, so you can spot back-to-backs and road trips at a glance. Player game logs show minutes in each game, so you can see who gets rested and when. Times are in NZ time throughout.
`,
  },
  {
    slug: "nba-injury-reports-minutes",
    zone: "nba",
    title: "Reading the NBA injury report: questionable, doubtful and minutes limits",
    description: "How to read NBA injury designations, when news drops in NZ time, how minutes restrictions affect props, and who benefits when a starter sits.",
    date: "2026-09-26",
    keywords: ["NBA injury report", "NBA questionable", "minutes restriction", "NBA props injuries"],
    body: `
The NBA injury report is the most important document for prop bettors. Here's how to read it, and when to check it from New Zealand.

## The designations

- **Out:** won't play.
- **Doubtful:** very unlikely to play.
- **Questionable:** could go either way.
- **Probable:** very likely to play.
- **Available:** cleared to play, sometimes with a minutes restriction.

## Timing from New Zealand

Teams update their reports through the day before a game, and final decisions often come 30 to 90 minutes before tip-off. With most NBA games tipping off between about 11am and 4pm NZ time, check again in the hour before tip-off, when lines move fastest.

## Minutes restrictions

Players coming back from injury often have their minutes capped, sometimes officially and sometimes not. A star limited to 24 minutes can't hit his usual points line. Look at his last game or two for the pattern.

## Who benefits

When a starter is out:

1. **The replacement starter** gets the obvious bump in minutes.
2. **The next-highest-usage player** gets more shots. See our [usage guide](/blog/nba-usage-rate-props).
3. **Players in the same position** pick up rebounds or assists.

## Be wary of

- Players returning from long layoffs, who often start slowly
- "Probable" stars on a back-to-back, who are rest candidates
- Late scratches after you've placed a multi. Know how your bookie settles void legs.

## In the app

Each NBA team page includes the current injury report, and Scan for stats leaves out injured players and adjusts teammates' projections. Player game logs show recent minutes, so you can spot restrictions. Start at the [NBA section](/nba).
`,
  },
  {
    slug: "nba-threes-props",
    zone: "nba",
    title: "NBA three-pointers made: betting the most volatile prop",
    description: "How to bet NBA threes-made props: attempts vs percentage, variance, matchups, pace and why 'over 1.5' isn't as safe as it looks.",
    date: "2026-09-19",
    keywords: ["NBA threes props", "three pointers made betting", "NBA 3PM", "NBA props tips"],
    body: `
Threes-made props are hugely popular, and hugely volatile. A shooter who averages three makes can go 0-for-7 one night and 7-for-11 the next. Here's how to approach them with numbers.

## Attempts drive everything

A player's threes made is his attempts times his three-point percentage. Attempts are much more stable from game to game than percentage, so start there. A player who takes eight threes a night at 37% averages about three makes. One who takes four at 42% averages about 1.7.

## Variance is huge

Even for a 37% shooter on eight attempts, the chance of making two or more is about 86%, and the chance of four or more is about 33%. That's why:

- **Over 1.5** on a high-volume shooter is decent but not a lock
- **Over 3.5** is a genuine longshot, even for elite shooters
- props on low-volume shooters swing wildly

## Matchups

- **Defences that give up corner threes** create good looks for spot-up shooters.
- **Teams that switch and run shooters off the line** cut attempts.
- **Pace:** more possessions mean more attempts.

## Hit rates help

Look at how often a player has reached a line over his last 10 games. If a shooter's averages say three makes but he's reached three in only 4 of 10 games, the variance is working against you.

## Combining threes

Threes props for teammates are weakly linked: if the team is shooting well, it's often everyone. That can make a "both shooters over 1.5" multi a bit better than the multiplied price suggests, but variance still dominates.

## In the app

The [NBA section](/nba) shows threes made and attempted per game, three-point percentage, last-5 and last-10 hit rates and full game logs. Scan for stats flags shooters with standout projections for that night's games.
`,
  },
  {
    slug: "nba-rebounds-assists-props",
    zone: "nba",
    title: "Rebounds and assists props: the steadier NBA markets",
    description: "Why NBA rebounds and assists props are more predictable than points, what drives them (minutes, pace, matchups, team style), and how to find value.",
    date: "2026-09-12",
    keywords: ["NBA rebounds props", "NBA assists props", "PRA props", "NBA betting NZ"],
    body: `
Points props get the attention, but rebounds and assists are often steadier and better researched by the numbers. Here's why, and what to look for.

## Why they're steadier

- **Rebounds** depend on minutes, position and team style more than shooting luck.
- **Assists** depend on role. A primary ball-handler gets assist chances every possession.

Both still vary from game to game, but less than threes made and often less than points.

## What drives rebounds

- **Minutes and position:** centres and power forwards lead, obviously.
- **Opponent's shooting:** poor-shooting opponents create more defensive rebounds.
- **Pace:** more possessions mean more misses.
- **Team strategy:** some teams crash the offensive glass, while others send everyone back in transition.

## What drives assists

- **Ball-handling role:** the point guard or primary playmaker.
- **Teammates' shooting:** assists need made shots, so a cold-shooting night drags assists down.
- **Pace and style:** fast, ball-moving teams create more assists.
- **Injuries:** when a secondary ball-handler is out, the main playmaker's assist load goes up.

## Combination props

Points + rebounds + assists (PRA), points + rebounds, and rebounds + assists combine stats to smooth out the variance. A PRA line is often more predictable than any of its parts.

## Hit rates and form

Look at the last 10 games rather than the season average. A big man whose minutes have changed recently will have a very different rebounding profile from his season numbers.

## In the app

Each NBA player page in the [app](/nba) has rebounds (offensive and defensive), assists, per-36 stats and a full game log. Scan for stats highlights standout rebounders and playmakers in each game, and Build combinations lets you combine them sensibly.
`,
  },
  {
    slug: "nba-live-betting-stats",
    zone: "nba",
    title: "Live NBA betting: the stats that matter mid-game",
    description: "How to use live NBA stats — runs, foul trouble, pace, shooting variance and clutch situations — for in-play betting, from New Zealand time.",
    date: "2026-09-05",
    keywords: ["NBA live betting", "in-play basketball", "NBA live stats", "live scores NBA"],
    body: `
Live NBA betting moves fast. Lines change every possession. Live stats help you separate real changes in the game from noise.

## Runs aren't destiny

NBA games are full of runs. A 12–2 burst feels huge, but in a 48-minute game it often reverses. Ask why it happened:

- **Hot shooting** (several contested threes falling) tends to cool off.
- **A real change,** like a key player in foul trouble or a line-up change, is more likely to last.

## Foul trouble

A star with three fouls in the first half often sits until the third quarter, and his minutes and stats suffer. Live player props on players in foul trouble can be mispriced both ways.

## Pace in the moment

If the first quarter is played much faster or slower than expected, live totals adjust, sometimes too far. First-quarter pace often settles back toward each team's usual tempo.

## Shooting variance

A team shooting 60% from three in the first half is very likely to cool down. Live lines that assume the hot shooting continues can be value on the other side.

## Clutch time

The last five minutes of a close game (within 5 points) bring different patterns: intentional fouls, timeouts, stars playing every minute. Late totals can jump because of free throws in the final minute.

## In the app

Each live NBA game page shows the score and margin chart, runs (like a 12–2), lead changes, the box score, foul counts, and clutch stats for the last five minutes in a game within 5 points. Live games update every 20 seconds or so. Open any game from the [NBA section](/nba).
`,
  },
  {
    slug: "nba-from-new-zealand-guide",
    zone: "nba",
    title: "Following and betting the NBA from New Zealand: a practical guide",
    description: "NBA tip-off times in NZ time, when injury news drops, how the season is structured, and how to use stats tools to bet the NBA from Aotearoa.",
    date: "2026-08-29",
    keywords: ["NBA in NZ", "NBA times NZ", "NBA betting New Zealand", "watch NBA NZ time"],
    body: `
The NBA is huge in New Zealand. Following it, and betting on it, from the other side of the world has its own rhythm. Here's a practical guide.

## When games are on

Most NBA games tip off in the US evening, which is roughly late morning to mid-afternoon the next day in New Zealand, depending on daylight saving at both ends. A typical NBA night lands across your lunchtime. Weekend matinee games in the US fall in the early hours here.

The app shows every time in NZ time, and groups games by the New Zealand day, so you see your Tuesday's games, not America's Monday.

## The season

- **Pre-season:** early to mid-October
- **Regular season:** late October to mid-April, 82 games per team
- **Play-in and playoffs:** April to June, with the Finals in June

## When news drops

Injury reports update through the US day, which is our night. The most important updates come in the hour or two before tip-off: late morning in New Zealand. That's the time to finalise props.

## A simple routine

1. **Morning:** open the app, look at the day's games and scan them for standout player projections.
2. **About an hour before tip-off:** check injury updates, then re-scan if a key player is out.
3. **Before the first game:** build your multi in the [bet slip](/#features), compare with your bookie's prices, and place your bets.
4. **During the games:** follow live scores and box scores in the app.

## NZ connections

New Zealand has had NBA players in recent years, most notably Steven Adams, and the NBL's [NZ Breakers](/blog/nz-breakers-betting-guide) have sent players to the NBA. It's a good league to follow with a Kiwi eye.

## In the app

The [NBA section](/nba) has everything: dashboard, games by NZ day, team and player pages, Scan for stats, Build combinations, Massive multi, Odds check and official NBA.com tracking data.
`,
  },
];
