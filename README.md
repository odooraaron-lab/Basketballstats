# Quick Read — live sports stats & betting research (NZ/AU)

A Next.js subscription site: a public, SEO-focused landing page and blog, and a members' app (NZ$9.99/month via Stripe) covering the NBA, NBL, NRL, Super Rugby Pacific, A-League Men & Women, ANZ Premiership, world cricket and the Super Smash. Live data comes from ESPN's and Champion Data's JSON feeds; the advanced analytics, projections and multi tools are computed in-app.

## Site structure

| Route | Who | What |
|---|---|---|
| `/` | public | Landing page (live "what's in season" board, features, value comparison, pricing, FAQ, JSON-LD) |
| `/blog`, `/blog/sport/<zone>`, `/blog/<slug>` | public | 80 guides, 10 per sport zone (`src/content/blog/`) |
| `/login`, `/signup`, `/forgot`, `/reset`, `/pricing`, `/terms`, `/privacy`, `/responsible-gambling` | public | Auth and legal |
| `/app` and every sport section | paid members | The stat tracker. Unpaid accounts are sent to `/account/billing` |
| `/account` | signed in | Theme (dark / light / system), show/hide areas, home area, password, sign out everywhere, delete account |
| `/account/billing` | signed in | Subscribe (Stripe Checkout) and manage (Stripe billing portal) |
| `/admin` | owner/admins | Overview (members, MRR, signups, funnel, activity), traffic, member list with comp / admin / sign-out actions, setup checks |

Access = admin, or a comp date in the future, or a Stripe subscription that is active/trialing (1-day grace) or past_due (3-day grace). Off-season competitions show a banner explaining when they return (`src/lib/seasonStatus.ts`).

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
| **Cricket · World** | Separate section from the league switcher: every match worldwide by NZ day (Tests, ODIs, T20Is, franchise and domestic, men & women) with format filters, live scores, full scorecards (batting, bowling, dots, extras), run rates, boundary %, chase maths and projected totals. Data: ESPN's cricket feed (ESPNcricinfo match data) |
| **NRL · Super Rugby · A-League · ANZ Premiership** | `/sport/<comp>`: home (this round with projected score + win chance, ladder, season leaders), full draw by round (byes shown for NRL), ladder (official where ESPN publishes one, otherwise built from results with each comp's points rules) plus power ratings, stats (every player and team stat the feed has, totals or per game, sortable), team pages, player game logs, and a match centre — period scores, team stat bars, timeline / scoring flow, top performers and full player stat tables; before kick-off a preview with our markets (result, line, margin bands, total; soccer adds draw, over 2.5, both teams to score, correct score), anytime try/goal scorers, form and head-to-head, each with **+ Multi**. A-League has a Men/Women toggle |
| **Super Smash** | `/cricket/super-smash`: NZ men's T20 — points table (win 4, tie/NR 2, bonus point for 1.25× run rate, NRR), results, upcoming games and season leaders (runs, wickets, sixes, strike rate, economy, highest scores) |
| **Glossary** | Every formula, the league rule set, xPPS baselines and a data-coverage table |

### NBL (NZ & AUS)
`/nbl/...` is the same app — dashboard, games, teams, players, standings, scan & combinations, odds check, glossary — run on FIBA rules (4 × 10 min, foul-out on 5, 6.75 m three-point line drawn on the shot charts and used for corner-3 zones, pace per 40). ESPN publishes NBL box scores and play-by-play but **no season aggregates**, so team season stats, player averages, game logs, leaderboards and "stats allowed by team" are built in-app from every completed game's box score (`src/lib/boxSeason.ts`, `src/lib/boxSeasonCore.ts`). The first load of a season pulls each box score once; finished games are cached for a day. The ladder marks the top 2 (straight to the semis) and the play-in (3–6). NBA.com tracking (hustle, Synergy, matchups) is NBA-only, so the NBL has no Tracking section; ESPN doesn't publish NBL betting lines or headshots either.

### Field sports data
- **NRL and ANZ Premiership** use Champion Data's match-centre feeds (`mc.championdata.com`, the same JSON behind the nrl.com and netball match centres): `competitions.json` → `{id}/fixture.json` → `{id}/{matchId}.json`, giving official per-player stats (run metres, tackle breaks, goal assists, gains, Nissan Net Points…).
- **Super Rugby Pacific** (`rugby/242041`) and **A-League Men/Women** (`soccer/aus.1`, `aus.w.1`) use ESPN's scoreboard (queried by month/year — ESPN's date-range queries return nothing), standings and match summaries. ESPN has no rugby box score, so Super Rugby player stats (tries, points, conversions, penalty goals, starts, bench appearances, cards) are built from lineups and scoring events. Finals are detected as the short rounds at the end of a season.
- **Super Smash** uses ESPN competition `8654` ("New Zealand Domestic Twenty20") with `?season=<start year>`; the day-by-day cricket panel only keeps a few months of history.
- Each competition is defined in `src/sports/comps.ts` (source, ladder points, finals spots, featured stats, margin spread for win chances). Projections come from an attack/defence rating fitted to the season's results with home advantage (`src/sports/model.ts`, unit-tested).

### Horse racing (NZ)
`/racing`: every New Zealand thoroughbred and harness meeting, from Entain's **Affiliates API** (TAB NZ, `api.tab.co.nz/affiliates/v1`, with the identical Ladbrokes feed as a fallback). Requests identify the site with `From` / `X-Partner` headers, as the feed asks.

- **Meetings** by day (yesterday → +2 days), next-to-go, thoroughbred/harness filter
- **Race cards**: barrier, weight, jockey/driver (+ apprentice claim), trainer, fixed win/place odds, flucs (firming/drifting), market chance with the margin removed, places paid, form comments, + Win / + Place to the multi slip; results and tote dividends when final
- **Form database** (`racing_races`, `racing_runs` in Postgres): the feed has no career stats or horse IDs, so every card and result we fetch is saved and horses/jockeys/trainers are keyed by normalised name. Filled by a nightly Vercel Cron (`vercel.json` → `/api/cron/racing`, needs `CRON_SECRET`), by page views (yesterday → tomorrow, at most every 20 minutes), and by **Admin → Setup → Backfill** (walks back day by day).
- **Profiles** for horses, jockeys/drivers and trainers: starts, wins, places, strike rates, $1 level-stakes profit/ROI at recorded fixed odds, splits by track condition/distance/jockey (horses) and price band/partner/track (people), upcoming runs, every recorded start
- **Leaderboards** for jockeys/drivers and trainers (30/90/365 days, gallops/harness)
- **My tracking**: follow horses, jockeys and trainers (`racing_follows`) and see their upcoming runs and latest results
- Racing favourites (win/place) feed into **The Ultimate Bet**
- The feed lists placegetters only, so finishes outside the top three/four are recorded as unplaced.

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
2. **Database** — create a free Postgres at [neon.tech](https://neon.tech) (or Vercel → Storage → Neon) and copy the connection string. Tables are created automatically on first use (or press *Create tables* in `/admin/setup`).
3. **Stripe** — Developers → API keys → copy the secret key. Developers → Webhooks → add endpoint `https://<your-domain>/api/stripe/webhook` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`; copy the signing secret. Settings → Billing → Customer portal → enable it. Everything Quick Read creates is tagged `site=quickread` in metadata, so it's easy to filter in a shared Stripe account.
4. **Settings → Environment Variables** — add everything in `.env.example`:
   - `APP_USERNAME`, `APP_PASSWORD` — the owner login (admin; works even if the database is down)
   - `AUTH_SECRET` — a long random string (`openssl rand -hex 32`)
   - `DATABASE_URL` — members, page views, events
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; optional `STRIPE_PRICE_ID` (else an inline NZ$9.99/month price is used), optional `STRIPE_TRIAL_DAYS`
   - `NEXT_PUBLIC_SITE_URL` — canonical URL for SEO, sitemap and Stripe return links
   - `RESEND_API_KEY`, `EMAIL_FROM` — password-reset emails ([resend.com](https://resend.com)); without them the reset link is only logged
   - `SUPPORT_EMAIL`; optional `NEXT_PUBLIC_DISPLAY_TZ` (defaults to `Pacific/Auckland`), optional `ANTHROPIC_API_KEY` (Odds check reads screenshots with Claude vision)
5. Deploy (redeploy after changing env vars), sign in with the owner login and open `/admin/setup` — it shows a green tick for each piece that's configured.
6. Submit `https://<your-domain>/sitemap.xml` in Google Search Console.

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
- `src/middleware.ts`, `src/lib/auth.ts`, `src/lib/session.ts` — public vs members routes, HMAC-signed session cookie, `requireMember` / `requireAdmin`
- `src/lib/db.ts`, `src/lib/users.ts`, `src/lib/stripe.ts` — Postgres, members, Stripe checkout/portal/webhook sync
- `src/lib/adminStats.ts`, `src/components/Tracker.tsx` — first-party analytics for the admin pages
- `src/app/(public)/`, `src/content/blog/` — landing page, legal pages, blog

Data: ESPN public feeds (unofficial, undocumented), cached with short revalidation (live games ~20s). These feeds are unofficial; licence the data before relying on them commercially.
