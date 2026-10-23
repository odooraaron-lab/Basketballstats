# Courtside — private NBA & NBL stat tracker

A password-protected Next.js app that pulls live NBA and NBL (Australia/New Zealand) data from ESPN's public JSON feeds and computes the advanced analytics itself. A league switch at the very top of every page flips between the two; the app remembers the last one you picked.

## What's in it

| Area | What you get |
|---|---|
| **Dashboard** | League PPG, average game total, pace, offensive rating; today's games (live), next 7 days with betting line, O/U and a projected score/total; league leaders with headshots; teams ranked by average game total and net rating |
| **Teams** | All 30 teams + a sortable league table (PPG, OPP, pace, ORtg, DRtg, net, FG/3P/FT%, eFG%, TS%, OREB/DREB, AST, STL, BLK, TOV, PF, TOV%, FTr, 3PAr) with heat colouring |
| **Team page** | Overview with league ranks, four factors, team leaders, injury report; **player stats** (every per-game counting stat incl. OREB/DREB, turnovers, blocks); **advanced** (PER est., TS%, eFG%, USG%, AST/TO, game score, per-36); schedule & results with game totals vs league average; roster with headshots and bios |
| **Players** | Leaderboard by any category, qualified/all toggle, search, paging, any season back 6 years, regular season or playoffs |
| **Player page** | Bio + headshot, season tiles (PER, USG%, TS%), shooting splits, last 5/10 form, points trend, game log, career by season, shot chart + zones from recent games |
| **Game page** | Linescore, full box score, team comparison (paint/fast-break/points off TOs), advanced (possessions, pace, ORtg/DRtg, four factors, USG%, AST%, OREB%/DREB%/REB%, STL%, BLK%), **shot chart + heatmap**, shot zones (restricted area, paint, mid-range, corner 3, above-the-break 3), xPPS & shot-making, shot types, **score margin chart, lead changes, runs (e.g. 12–2)**, **clutch** stats (last 5 min ≤5 pts, last 2 min, whole 4th), **reconstructed 5-man lineups** with ORtg/DRtg/net, **live- vs dead-ball turnovers**, play-by-play and a possession-by-possession log; pre-game preview with projection, injuries and last five |
| **Tracking** | NBA.com hub: hustle, shot contests, Synergy play types (incl. team play-type mix), player tracking, defense, matchups, official lineups, clutch, advanced, scoring sources, shot zones — players or teams, any synced season |
| **Scan & combinations** | 'Scan for stats' on any game (or a whole day) scores every rotation player and writes a report; 'Build combinations' then simulates the game 10,000 times to estimate the most likely result, total, margin and multi-leg player combinations (points / assists / blocks and more), with a click-to-build custom combo |
| **Odds check** | Upload a screenshot of player props; names, lines and odds are read (Claude vision if `ANTHROPIC_API_KEY` is set, otherwise free on-device OCR), checked against each player's last 10 games and projection, and marked Strong / Lean / Pass with our chance vs the bookmaker's (margin removed) |
| **Glossary** | Every formula, the league rule set, xPPS baselines and a data-coverage table |

### NBL (NZ & AUS)
`/nbl/...` is the same app — dashboard, games, teams, players, standings, scan & combinations, odds check, glossary — run on FIBA rules (4 × 10 min, foul-out on 5, 6.75 m three-point line drawn on the shot charts and used for corner-3 zones, pace per 40). ESPN publishes NBL box scores and play-by-play but **no season aggregates**, so team season stats, player averages, game logs, leaderboards and "stats allowed by team" are built in-app from every completed game's box score (`src/lib/boxSeason.ts`, `src/lib/boxSeasonCore.ts`). The first load of a season pulls each box score once; finished games are cached for a day. The ladder marks the top 2 (straight to the semis) and the play-in (3–6). NBA.com tracking (hustle, Synergy, matchups) is NBA-only, so the NBL has no Tracking section; ESPN doesn't publish NBL betting lines or headshots either.

### League environments
Each league is an isolated environment (`src/leagues/`) with its own rules (game length, OT, shot clock, foul-out, bonus, clutch window), stat definitions and data provider. All routes are scoped by league (`/nba/...`), so IDs never mix across leagues. Every timing calculation goes through `src/lib/rules.ts`. To add a league, copy `src/leagues/nba.ts` (ESPN season feeds) or `src/leagues/nbl.ts` (season stats built from box scores) and register it in `src/leagues/registry.ts` — it appears in the league switch automatically.

### NBA.com tracking data (via [nba_api](https://github.com/swar/nba_api))
The **Tracking** section and the **Tracking** tabs on player and team pages use official NBA.com data:
Synergy play types (iso, P&R ball handler/roll man, post-up, spot-up, handoff, cut, off screen, transition, putbacks) with PPP and percentile, shot contest level (closest defender 0–2 / 2–4 / 4–6 / 6+ ft), hustle (deflections, charges, contests, screen assists, loose balls, box-outs), who-guarded-who matchups, official 5-man lineups, official clutch, player tracking (speed, distance, drives, catch & shoot, pull-ups, touches, passing, rebound chances, rim defense), defense as closest defender, official ORtg/DRtg/PIE + estimated metrics, and season shot zones.

stats.nba.com blocks cloud servers (Vercel, AWS, Heroku), so this data is **pulled from your own computer** and committed to `data/nba/`. The app just reads those files.

```bash
# one-time
pip install -r sync/requirements.txt

# pull the current season and push (Vercel redeploys with the new data)
python sync/sync_nba.py --push
python sync/sync_nba.py --season 2025-26 --push          # a past season
python sync/sync_nba.py --season 2025-26 --playoffs --push
```

Or just run `sync/sync.sh` (Mac/Linux) or `sync\sync.bat` (Windows). To keep it fresh, schedule one of them daily (cron on Mac/Linux, Task Scheduler on Windows). A full sync makes ~90 polite requests and takes 2–3 minutes. If every request fails you're probably on a VPN or cloud network — use your home connection.

Matching between ESPN and NBA.com uses normalised player names + team, and NBA.com headshots are used as a fallback when ESPN doesn't have one.

## Deploy to Vercel

1. In Vercel: **Add New → Project → Import** `odooraaron-lab/Basketballstats`. Framework is detected as Next.js; no build settings needed.
2. **Settings → Environment Variables** — add:
   - `APP_USERNAME` — your login name
   - `APP_PASSWORD` — your password
   - `AUTH_SECRET` — a long random string (e.g. run `openssl rand -hex 32`)
   - optional `NEXT_PUBLIC_DISPLAY_TZ` — defaults to `Pacific/Auckland`
   - optional `ANTHROPIC_API_KEY` — makes Odds check read screenshots with Claude vision (more accurate); without it the phone reads them itself
3. Deploy (redeploy after changing env vars). Every page except `/login` requires the session cookie; the site is also marked `noindex`.

## Local development

```bash
npm install
cp .env.example .env.local   # then edit values
npm run dev                  # http://localhost:3000
npm test                     # stat engine + play-by-play tests
npm run typecheck
```

## Code map

- `src/lib/espn.ts` — ESPN endpoints + normalisers (scoreboard, summary/box/plays, teams, rosters, standings, injuries, athlete stats & game logs, leaders)
- `src/lib/stats.ts` — formulas (TS%, eFG%, USG%, REB%, PER, game score, possessions, four factors…)
- `src/lib/pbp.ts` — play-by-play analytics (shots/zones, runs, flow, clutch, turnovers, possessions, lineups)
- `src/lib/league.ts` — league-wide team table, averages, projections
- `sync/sync_nba.py` — nba_api pipeline (run locally) → `data/nba/`
- `src/lib/nbacom.ts`, `src/lib/tracking.ts` — readers + ESPN↔NBA.com matching for the synced data
- `src/middleware.ts`, `src/lib/auth.ts` — login gate (HMAC-signed cookie)

Data: ESPN public feeds (unofficial, undocumented), cached with short revalidation (live games ~20s). Personal use only.
