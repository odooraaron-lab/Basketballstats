# Courtside — private NBA stat tracker

A password-protected Next.js app that pulls live NBA data from ESPN's public JSON feeds and computes the advanced analytics itself.

## What's in it

| Area | What you get |
|---|---|
| **Dashboard** | League PPG, average game total, pace, offensive rating; today's games (live), next 7 days with betting line, O/U and a projected score/total; league leaders with headshots; teams ranked by average game total and net rating |
| **Teams** | All 30 teams + a sortable league table (PPG, OPP, pace, ORtg, DRtg, net, FG/3P/FT%, eFG%, TS%, OREB/DREB, AST, STL, BLK, TOV, PF, TOV%, FTr, 3PAr) with heat colouring |
| **Team page** | Overview with league ranks, four factors, team leaders, injury report; **player stats** (every per-game counting stat incl. OREB/DREB, turnovers, blocks); **advanced** (PER est., TS%, eFG%, USG%, AST/TO, game score, per-36); schedule & results with game totals vs league average; roster with headshots and bios |
| **Players** | Leaderboard by any category, qualified/all toggle, search, paging, any season back 6 years, regular season or playoffs |
| **Player page** | Bio + headshot, season tiles (PER, USG%, TS%), shooting splits, last 5/10 form, points trend, game log, career by season, shot chart + zones from recent games |
| **Game page** | Linescore, full box score, team comparison (paint/fast-break/points off TOs), advanced (possessions, pace, ORtg/DRtg, four factors, USG%, AST%, OREB%/DREB%/REB%, STL%, BLK%), **shot chart + heatmap**, shot zones (restricted area, paint, mid-range, corner 3, above-the-break 3), xPPS & shot-making, shot types, **score margin chart, lead changes, runs (e.g. 12–2)**, **clutch** stats (last 5 min ≤5 pts, last 2 min, whole 4th), **reconstructed 5-man lineups** with ORtg/DRtg/net, **live- vs dead-ball turnovers**, play-by-play and a possession-by-possession log; pre-game preview with projection, injuries and last five |
| **Glossary** | Every formula, the league rule set, xPPS baselines and a data-coverage table |

### League environments
Each league is an isolated environment (`src/leagues/`) with its own rules (game length, OT, shot clock, foul-out, bonus, clutch window), stat definitions and data provider. All routes are scoped by league (`/nba/...`), so IDs never mix across leagues. Every timing calculation goes through `src/lib/rules.ts`. To add a league, copy `src/leagues/nba.ts` and register it in `src/leagues/registry.ts`.

### Not available from free public data
Shot contest level, defensive matchups, hustle stats (deflections, box-outs, charges) and Synergy play types come from NBA tracking data. stats.nba.com blocks cloud hosts like Vercel, so these would need a paid feed or a manual-entry module. Play type is estimated from shot descriptions.

## Deploy to Vercel

1. In Vercel: **Add New → Project → Import** `odooraaron-lab/Basketballstats`. Framework is detected as Next.js; no build settings needed.
2. **Settings → Environment Variables** — add:
   - `APP_USERNAME` — your login name
   - `APP_PASSWORD` — your password
   - `AUTH_SECRET` — a long random string (e.g. run `openssl rand -hex 32`)
   - optional `NEXT_PUBLIC_DISPLAY_TZ` — defaults to `Pacific/Auckland`
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
- `src/middleware.ts`, `src/lib/auth.ts` — login gate (HMAC-signed cookie)

Data: ESPN public feeds (unofficial, undocumented), cached with short revalidation (live games ~20s). Personal use only.
