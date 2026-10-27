import type { Post } from "./types";

export const cricket: Post[] = [
  {
    slug: "cricket-betting-stats-guide",
    zone: "cricket",
    featured: true,
    title: "Cricket betting stats: a guide for New Zealand punters",
    seoTitle: "Cricket Betting Stats Guide NZ | Tests, ODIs, T20s",
    description: "The cricket stats that matter for betting across Tests, ODIs and T20s: run rates, required rates, strike rates, economy, conditions and live chase maths.",
    date: "2026-10-23",
    keywords: ["cricket betting NZ", "cricket stats", "Black Caps betting", "T20 betting tips", "live cricket stats"],
    body: `
Cricket gives punters more data than almost any other sport. Every ball is recorded, and matches last long enough for the numbers to tell a story. The format changes which stats matter, though. Here's a guide across Tests, one-day internationals and T20s.

## T20: strike rate and economy

In T20, scoring speed is everything. Look at:

- **Batting strike rate:** runs per 100 balls. Above 140 is aggressive, under 120 is slow for a top-order batter.
- **Bowling economy:** runs per over. Under 7 is excellent, over 9 is expensive.
- **Powerplay scoring:** the first six overs with fielding restrictions often decide the innings. See our [powerplay guide](/blog/t20-powerplay-betting).
- **Boundary %:** how much of a team's score comes in 4s and 6s. High-boundary teams are more volatile.

## ODIs: building and accelerating

In 50-over cricket, teams build, then accelerate. Batting averages count for more than in T20, because staying in matters. Economy across the middle overs (11 to 40) and wickets in hand at 40 overs are strong guides to the final total. See our [ODI guide](/blog/odi-betting-stats).

## Tests: draws, conditions and session betting

Test cricket is about conditions, the toss and time. The draw is a real result. Weather, the pitch and the pace of scoring decide whether it's in play. See our [Test cricket guide](/blog/test-cricket-betting-draw).

## Live chase maths

In any limited-overs chase, three numbers tell you most of what you need: **runs needed**, **balls left** and **wickets in hand**. A required rate under 8 with seven wickets left is comfortable. Over 12 with four wickets left is a long shot. The app shows all three, plus the current and required run rates, for every live chase.

## Conditions are half the game

Pitch, weather, dew, ground size and time of day change everything in cricket. Our [toss and conditions guide](/blog/cricket-toss-and-conditions) covers what to check.

## In the app

The [cricket section](/cricket) covers every match in the world each day (Tests, ODIs, T20 internationals, franchise leagues and domestic cricket) with live scores, full scorecards (balls faced, 4s, 6s, strike rate, economy, dots, wides and no-balls), run rates, boundary %, chase maths and projected totals, all in NZ time.
`,
  },
  {
    slug: "cricket-run-rate-required-rate",
    zone: "cricket",
    title: "Run rate vs required rate: reading a cricket chase like a pro",
    description: "How current run rate, required run rate, balls left and wickets in hand combine in a cricket chase, and how to use them for live betting.",
    date: "2026-10-17",
    keywords: ["required run rate", "cricket chase betting", "live cricket betting", "run rate explained"],
    body: `
Every limited-overs chase comes down to one question: can the batting side score the runs it needs in the balls it has left, without losing all its wickets? Three numbers answer it.

## The three numbers

1. **Runs needed:** target minus current score
2. **Balls left:** the overs remaining, counted in balls
3. **Wickets in hand:** 10 minus wickets lost

From those you get the **required run rate** (runs needed ÷ balls left × 6) to compare with the **current run rate**.

## Rules of thumb in T20

| Required rate | Wickets in hand | Verdict |
| --- | --- | --- |
| Under 8 | 7+ | Batting side strong favourite |
| 8–10 | 6+ | Even-ish, depends on who's batting |
| 10–12 | 5+ | Bowling side favoured |
| Over 12 | Any | Batting side needs something special |

In ODIs, the same thinking applies at lower rates. Needing 7 an over for the last 15 overs with six wickets left is gettable. Needing 9 an over isn't.

## What the numbers miss

- **Who's batting:** a set batter on 60 is worth far more than two new batters.
- **Who's bowling:** count the overs each side's best bowlers have left.
- **Conditions:** dew in a night game makes chasing easier late on, and a slowing pitch makes it harder.

## Live betting angles

**Overreactions to wickets.** Live prices often swing too far when a wicket falls, especially early. If the required rate is still comfortable and good batters are still to come, the drift can be value.

**The death overs.** In T20, the last four overs average far more runs than the middle overs. A chase needing 45 off 24 balls with set batters is closer than it looks.

## In the app

Every live limited-overs match in the [cricket section](/cricket) shows the target, runs needed, balls left, required run rate against the current rate, and wickets in hand. First innings show the current rate and a projected total.
`,
  },
  {
    slug: "test-cricket-betting-draw",
    zone: "cricket",
    title: "Test cricket betting: when the draw is a real chance",
    description: "How to bet on Test matches: when the draw is likely, the role of weather, pitch and scoring rate, session betting and reading the match situation.",
    date: "2026-10-10",
    keywords: ["Test cricket betting", "Test match draw", "Black Caps Test betting", "cricket session betting"],
    body: `
Test cricket is the only major sport where a game can last five days and still end in a draw. Understanding when the draw is a real chance is the key to Test betting.

## What makes a draw likely

- **Weather:** rain that costs a full day or more is the biggest factor.
- **Flat pitches:** if 20 wickets are hard to take, the draw comes into play.
- **Slow scoring:** a first innings that takes 160 overs leaves little time for a result.
- **Evenly matched sides:** two strong batting line-ups can cancel each other out.

## What kills the draw

- **Fast scoring rates:** modern Test teams often score at 3.5 to 4 an over or quicker, which leaves time for results.
- **Bowler-friendly conditions:** seaming New Zealand pitches early in the summer, or turning pitches in the subcontinent late in a match.
- **A big gap between the teams.**

## Reading the match day by day

By the end of day two you can usually see where a Test is heading:

- Each team's first-innings score and how quickly it came
- How many wickets fell per day
- The forecast for the remaining days

If both first innings are big and slow, and there's rain about, the draw is live. If 15 wickets fell on day one, it probably isn't.

## Session betting

Some markets let you bet on individual sessions: runs scored, wickets taken, which team "wins" the session. The new ball, the first session of a day and the last hour before stumps tend to bring wickets.

## New Zealand conditions

Home Tests in New Zealand have a reputation for helping seam and swing, especially early in the season and in the morning sessions. Bowling first after winning the toss is common here.

## In the app

The [cricket section](/cricket) shows Test scorecards innings by innings, with runs, wickets, overs, run rates and every batter's and bowler's figures, live through the day.
`,
  },
  {
    slug: "odi-betting-stats",
    zone: "cricket",
    title: "ODI betting stats: powerplays, middle overs and the final 10",
    description: "How to bet one-day internationals using phase-by-phase stats: powerplay scoring, middle-overs control, death-overs acceleration and projected totals.",
    date: "2026-10-03",
    keywords: ["ODI betting", "one day cricket betting", "ODI totals", "cricket projected score"],
    body: `
A 50-over innings has a rhythm: a fast start under fielding restrictions, a long middle phase, and a big finish. Knowing how teams score in each phase helps you predict totals and results.

## The three phases

1. **Overs 1–10 (powerplay):** only two fielders allowed outside the circle. Fast starts here set up big totals.
2. **Overs 11–40 (middle overs):** teams build. Spinners and economical seamers control the game.
3. **Overs 41–50 (death):** teams with wickets in hand accelerate hard. Scoring often doubles compared with the middle overs.

## The key stat: wickets in hand at 40 overs

A team that's 200/3 after 40 overs can often add 90 to 110 in the last ten. One that's 200/7 might add 50. When you're betting on a first-innings total, wickets in hand count for as much as the score.

## Projecting a total

The app's live projection takes the current run rate and adjusts it for wickets lost. The more wickets down, the more it trims the projection. It's a simple guide, not a full model, but it's a sensible check against the totals line during the innings.

## Bowling stats that matter

- **Middle-over economy:** bowlers who go at under 5 an over in the middle overs squeeze totals.
- **Death bowling:** economy in overs 41 to 50 is a specialist skill. Teams without a good death bowler concede 100 or more in the last ten.
- **Wickets in the powerplay:** early wickets slow everything down.

## Chasing in ODIs

The required rate matters, but so does who's batting. A chase needing 6.5 an over for 20 overs with a set batter and six wickets in hand is the batting side's game to lose. See our [run rate guide](/blog/cricket-run-rate-required-rate).

## In the app

Every ODI in the [cricket section](/cricket) has a live scorecard with run rates, boundary %, dot balls and extras for each innings, plus chase maths in the second innings.
`,
  },
  {
    slug: "t20-powerplay-betting",
    zone: "cricket",
    title: "T20 powerplay betting: why the first six overs decide so much",
    description: "How to bet T20 powerplay runs and wickets: field restrictions, opening batters, new-ball bowlers, conditions and how powerplay scores predict the total.",
    date: "2026-09-26",
    keywords: ["T20 powerplay", "powerplay runs betting", "T20 cricket tips", "opening batters"],
    body: `
In T20 cricket the first six overs, the powerplay, allow only two fielders outside the 30-yard circle. They're the easiest overs to score in, and they often shape the whole innings.

## Why the powerplay matters

- Teams that score 55 or more in the powerplay without losing many wickets usually post above-average totals.
- Losing two or three wickets in the powerplay forces the middle order to rebuild, and the total usually drops.
- Strong opening bowlers who swing the new ball can take control before the batting side gets going.

## What to look at

**Opening batters.** Their strike rates are the best guide to powerplay scoring. Two openers who both score at 140 or more give a much higher ceiling than an anchor-and-hitter pairing.

**New-ball bowlers.** Check their economy and how often they take powerplay wickets. A bowler who swings the ball early is a threat in New Zealand conditions.

**Conditions.** Seaming or swinging conditions, often in afternoon games or early in the season, cut powerplay scores. Flat pitches and small grounds push them up.

## Powerplay markets

- **Powerplay runs over/under:** use both teams' recent powerplay scores, the openers' strike rates and the conditions.
- **Wickets in the powerplay:** goes up with swing-friendly conditions and aggressive batters.
- **First-over runs:** high variance, and best avoided unless you have a strong read on the opening bowler.

## Linked markets

A big powerplay score is strongly linked to a high match total and to the openers' runs lines. If you like a fast start, those legs make a sensible same-game combination. Just don't treat them as independent when you work out the price.

## In the app

The [cricket section](/cricket) shows every batter's balls faced and strike rate and every bowler's economy and dot balls, so you can check recent openers' strike rates and new-ball figures before you bet.
`,
  },
  {
    slug: "cricket-top-batter-market",
    zone: "cricket",
    title: "Top batter betting: a stats method for any format",
    description: "How to pick a top batter in Tests, ODIs and T20s: batting position, balls faced, form, matchups and conditions, plus when the favourite is overpriced.",
    date: "2026-09-19",
    keywords: ["top batter betting", "top run scorer cricket", "cricket player betting", "top batsman tips"],
    body: `
Top-batter markets (which player will score the most runs for his team) are among the most popular cricket bets. They're also among the easiest to research.

## Position is the biggest factor

Openers and the number three bat the longest on average, so they top-score far more often than middle-order batters, in every format. In T20s, players at five and below often face fewer than 15 balls.

## The favourite is often overpriced

The team's star batter is usually the favourite, and often too short. Even the best batters fail regularly. If the favourite is priced at $3.00 (33%) and his recent record says he top-scores about a quarter of the time, there's value elsewhere.

## Form and matchups

- **Recent scores:** use the last five innings rather than career averages. The app's scorecards make this easy.
- **Left vs right:** a team's attack might suit left-handers more than right-handers, or the other way round.
- **Spin vs pace:** some batters thrive against spin and struggle against short-pitched pace. Check the opposition attack.

## Conditions

On seaming pitches, technically sound top-order batters do better. On flat pitches, aggressive hitters score quicker. In T20s on small grounds, power-hitters in the middle order sometimes overtake the top order.

## Format differences

- **Tests:** markets usually cover the first innings only. Top-order batters dominate.
- **ODIs:** anchors who bat deep into the innings often top-score.
- **T20s:** strike rate and balls faced decide it. See our [T20 player props guide](/blog/t20-cricket-player-props-guide).

## In the app

Every scorecard in the [cricket section](/cricket) shows each batter's runs, balls, 4s, 6s and strike rate, and the [Super Smash](/cricket/super-smash) section has season leaders for runs, strike rate and highest scores.
`,
  },
  {
    slug: "cricket-toss-and-conditions",
    zone: "cricket",
    title: "The toss, the pitch and the weather: reading cricket conditions",
    description: "How the toss, pitch type, dew, weather, ground size and time of day affect cricket results and totals, and what to check before betting.",
    date: "2026-09-12",
    keywords: ["cricket toss betting", "cricket conditions", "dew factor", "pitch report cricket"],
    body: `
No other major sport depends on conditions as much as cricket. The same two teams can produce a 140 or a 220 in a T20 depending on the ground, pitch and weather.

## The toss

The toss decides who bats in which conditions, which is why it moves markets as soon as it's called. What a team does with it tells you how it reads the pitch:

- **Choosing to bowl:** the captain expects early help for the bowlers, dew later, or wants to know the target.
- **Choosing to bat:** the captain expects the pitch to get slower or harder to bat on later.

Don't overreact to the toss. In many leagues, the side that wins the toss wins only slightly more than half its games.

## The pitch

- **Green or grassy:** helps seamers, especially early. Lower scores.
- **Dry and cracked:** helps spinners, especially later in the match.
- **Flat and hard:** batting paradise. High totals.

## Dew

In night games, dew makes the ball wet and hard to grip, which makes bowling and fielding harder in the second innings. That's the main reason T20 teams like to chase under lights. In afternoon games, dew isn't a factor.

## Weather

- **Overcast and humid:** helps swing bowling.
- **Rain:** reduced-overs games under DLS. Shorter games push run rates up and make results more random.
- **Wind:** helps bowlers bowling with it and changes which boundaries are easy to hit.

## Ground size

Small grounds and short boundaries mean more sixes and higher totals. Large grounds reward running between the wickets.

## A conditions checklist

1. Day or night start?
2. What did the pitch do in recent games at the ground? Check the scorecards.
3. What's the forecast?
4. How big is the ground?
5. What did the captain choose at the toss, and why?

The app shows the venue on every match in the [cricket section](/cricket), and scorecards from recent games at the ground show how it has played.
`,
  },
  {
    slug: "black-caps-betting-guide",
    zone: "cricket",
    title: "Betting on the Black Caps: home summer stats guide",
    description: "How to bet on the Black Caps at home: NZ conditions, home record patterns, format by format, and what to check before every New Zealand international.",
    date: "2026-09-05",
    keywords: ["Black Caps betting", "NZ cricket betting", "New Zealand cricket tips", "Black Caps home summer"],
    body: `
The Black Caps are a formidable side at home. New Zealand conditions, especially early in the summer, suit their seam attack and give visiting teams problems. Here's what to consider before you bet on a New Zealand international.

## The 2026–27 home summer

New Zealand Cricket has confirmed home tours from **India** and **Sri Lanka** (men) and **Bangladesh** (women) for 2026–27, alongside the domestic Super Smash. The international schedule in January and February 2027 was busy enough that the launch of the new [NZ20 franchise league](/blog/nz20-league-explained) was moved back to December 2027.

## Why New Zealand is tough at home

- **Seam and swing:** green pitches early in the season and overcast mornings help the new ball.
- **Small and unusual grounds:** short straight boundaries at some venues, which changes how teams plan their bowling.
- **Wind:** a real factor in Wellington especially, and visiting bowlers take time to adjust.
- **Unfamiliar conditions:** subcontinental sides in particular can struggle with lateral movement.

## Format by format

**Tests:** New Zealand's home Test record has been strong. Bowling first when the pitch is green is common. Watch for early-morning collapses.

**ODIs:** pitches tend to flatten out over a day. Chasing has often worked well, but day-night games bring changing conditions.

**T20Is:** small grounds help scoring. Totals of 180 or more are common at some venues, so watch the ground and the weather.

## Betting angles

1. **Visiting batters' first-innings struggles:** consider unders on first-innings totals early in a tour, before the visitors adjust.
2. **Home bowlers in top-bowler markets:** New Zealand seamers often top-score with the ball at home.
3. **The market's home bias:** New Zealand money can shorten the Black Caps' price. Compare it with the form and the conditions, not just the flag.

## In the app

Every Black Caps international, and every match worldwide, is in the [cricket section](/cricket) with live scorecards, chase maths and projected totals in NZ time, and a pre-match form guide built from both teams' recent results and player form.
`,
  },
  {
    slug: "how-to-read-a-cricket-scorecard",
    zone: "cricket",
    title: "How to read a cricket scorecard (and what it tells a punter)",
    description: "A plain-English guide to every number on a cricket scorecard — runs, balls, strike rate, overs, maidens, economy, dots, extras — and what each means for betting.",
    date: "2026-08-29",
    keywords: ["cricket scorecard explained", "cricket stats explained", "how to read scorecard", "cricket for beginners"],
    body: `
A cricket scorecard holds a lot of information if you know how to read it. Here's every number and why it matters.

## Batting

| Column | Meaning | Why it matters |
| --- | --- | --- |
| R | Runs scored | The obvious one |
| B | Balls faced | Shows how long the batter lasted |
| 4s / 6s | Boundaries | Shows attacking intent and power |
| SR | Strike rate (runs per 100 balls) | Scoring speed, the key T20 stat |
| Dismissal | How they got out | Patterns (e.g. often caught behind) reveal weaknesses |

An asterisk (*) means not out.

## Bowling

| Column | Meaning | Why it matters |
| --- | --- | --- |
| O | Overs bowled | Workload and trust from the captain |
| M | Maidens (overs with no runs) | Pressure, mostly in Tests |
| R | Runs conceded | |
| W | Wickets | |
| Econ | Runs per over | Control, the key limited-overs bowling stat |
| Dots | Balls with no run | Pressure that leads to wickets |
| WD / NB | Wides / no-balls | Free runs, a sign of discipline |

## Team totals

The innings total is shown as runs/wickets (overs), for example 172/5 (20 ov). A score with no wicket count means the team was bowled out. Extras (wides, no-balls, byes and leg-byes) are runs not scored by a batter.

## What punters should look for

- **Balls faced by top-order batters:** predicts their scoring chances in the next game.
- **Bowlers' overs:** who bowls the death overs and who gets the full four in a T20.
- **Dot-ball percentage:** teams that bowl a lot of dots squeeze totals.
- **Boundary %:** the share of runs from 4s and 6s. High-boundary teams are boom-or-bust.

## In the app

Every match in the [cricket section](/cricket) has a full scorecard with all of these columns, plus an innings summary of run rate, 4s and 6s, boundary %, dot-ball % and extras.
`,
  },
  {
    slug: "franchise-t20-leagues-guide",
    zone: "cricket",
    title: "Franchise T20 leagues: a betting guide to the IPL, BBL, SA20 and more",
    description: "How the world's franchise T20 leagues differ for betting — conditions, imports, team building and scoring patterns — and how NZ players fit in.",
    date: "2026-08-22",
    keywords: ["IPL betting", "BBL betting", "SA20", "franchise cricket", "T20 leagues"],
    body: `
Franchise T20 cricket runs almost all year now, and Kiwi players are spread across most of the leagues. Each league has its own conditions and quirks.

## The big leagues

**IPL (India):** the richest and strongest league. Flat pitches and short boundaries at many venues, heavy dew in evening games, and some very big totals. Chasing has traditionally been favoured at night.

**Big Bash League (Australia):** played over the Australian summer at big venues with different conditions. Bounce in Perth, spin in Sydney. The BBL has used innovations like the Power Surge, which changes how teams split their powerplay overs.

**SA20 (South Africa):** quick, bouncy pitches at altitude in Johannesburg and Centurion help batters, and the ball flies. A short, intense competition early in the year.

**The Hundred (England):** 100-ball innings. Strike rates and totals don't compare directly with T20, so adjust before you use any T20 numbers.

**Others:** the CPL (Caribbean), ILT20 (UAE), Major League Cricket (USA) and more. New Zealand Cricket chose its own [NZ20 league](/blog/nz20-league-explained) over a Big Bash team, and NZ20 is now planned for December 2027.

## What's different about franchise cricket

- **Imports:** overseas stars dominate player markets, and their prices are often shortest.
- **Squad turnover:** teams change a lot from season to season, so last year's team form means less than in international cricket.
- **Travel and fatigue:** players hop between leagues, so check who has just arrived from another competition.

## Betting approach

1. Learn each league's venue patterns: first-innings averages, the chasing record and dew.
2. Use current-season player form over reputation.
3. Treat the first week of each league as the least predictable.
4. Watch team news and late-arriving players closely.

## In the app

The [cricket section](/cricket) covers franchise leagues around the world every day with full scorecards and live chase maths. Use the format filters to see only T20s.
`,
  },
];
