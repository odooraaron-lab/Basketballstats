// "Scan for stats": looks at every rotation player in one game (or a whole day of games)
// and surfaces standout stats — high averages, hot form, consistent lines, soft matchups.
import "server-only";
import type { League } from "@/leagues/types";
import { getInjuries, getLeaders, getPlayerGameLog, getRoster, getStandings, seasonLabel } from "./espn";
import type { GameCard, GameLogRow, LeaderRow } from "./model";
import { getManifest, n, nbaAbbr, rows as nbaRows, seasonFolder } from "./nbacom";
import { getSeasonBook } from "./boxSeason";
import { allowedByTeam } from "./boxSeasonCore";
import {
  SCAN_CATS,
  formOf,
  hitLine,
  mean,
  ordinal,
  percentileOf,
  rankOf,
  signalScore,
  statOf,
  projectStat,
  type HitLine,
  type ModelStat,
  type ScanCatKey,
} from "./scanCore";
import { getLeagueTable, projectGame } from "./league";

// ---------------------------------------------------------------------------- types

export interface Avg {
  gp: number;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  tpm: number;
  stl: number;
  blk: number;
}

export interface ScanSignal {
  cat: ScanCatKey;
  base: number;
  l5: number | null;
  l10: number | null;
  hit: HitLine | null;
  leagueRank: number | null;
  leaguePct: number | null;
  form: number | null;
  oppRank: number | null; // 1 = opponent allows the most
  oppAllowed: number | null;
  score: number;
  reasons: string[];
}

export interface ScanPlayer {
  id: string;
  name: string;
  headshot: string;
  pos: string;
  teamId: string;
  teamAbbr: string;
  oppAbbr: string;
  gameId: string;
  gameLabel: string;
  status: string | null;
  baseLabel: string; // which season the baseline averages come from
  gp: number;
  min: number;
  l5min: number | null;
  recent: { date: string; opp: string; pts: number; reb: number; ast: number; tpm: number; stl: number; blk: number; min: number }[];
  signals: ScanSignal[];
  notes: string[]; // player-level notes (minutes trend, teammate out…)
  /** Projection for tonight, used by the combination simulator. */
  model: Record<ModelStat, { mean: number; sd: number }>;
  /** Last 10 games, newest first, for history checks. */
  history: Record<"pts" | "reb" | "ast" | "tpm", number[]>;
}

export interface GameModel {
  id: string;
  label: string;
  date: string;
  teams: [GameModelTeam, GameModelTeam]; // [away, home]
  overUnder: number | null;
  spread: { abbr: string; value: number } | null; // favourite and line, e.g. MIL -1.5
  basis: string;
}

export interface GameModelTeam {
  id: string;
  abbr: string;
  name: string;
  logo: string;
  color: string;
  mean: number;
}

export interface ScanReport {
  scope: "game" | "day";
  title: string;
  generatedAt: string;
  games: { id: string; label: string; date: string }[];
  scanned: number;
  rotation: number;
  basis: { players: string; league: string; opponent: string };
  top: { player: ScanPlayer; signal: ScanSignal }[];
  byCat: { cat: ScanCatKey; rows: { player: ScanPlayer; signal: ScanSignal }[] }[];
  hot: { player: ScanPlayer; signal: ScanSignal }[];
  cold: { player: ScanPlayer; signal: ScanSignal }[];
  matchups: { teamAbbr: string; oppAbbr: string; soft: { cat: ScanCatKey; rank: number; allowed: number }[]; tough: { cat: ScanCatKey; rank: number; allowed: number }[] }[];
  out: { name: string; teamAbbr: string; status: string; pts: number | null; min: number | null }[];
  gameModels: GameModel[];
  /** Every scanned rotation player (for longshot hunting). */
  pool: ScanPlayer[];
}

// ---------------------------------------------------------------------------- helpers

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

const toAvg = (r: LeaderRow): Avg => ({
  gp: r.values.gamesPlayed ?? 0,
  min: r.values.avgMinutes ?? 0,
  pts: r.values.avgPoints ?? 0,
  reb: r.values.avgRebounds ?? 0,
  ast: r.values.avgAssists ?? 0,
  tpm: r.values.avgThreePointFieldGoalsMade ?? 0,
  stl: r.values.avgSteals ?? 0,
  blk: r.values.avgBlocks ?? 0,
});

/** Season averages for every player in the league (≈6 paged requests, cached). */
async function leagueAverages(l: League, year: number): Promise<Map<string, Avg>> {
  const first = await getLeaders(l, { season: year, sortKey: "pts", limit: 100, page: 1, qualified: false });
  const pages = Math.min(first.pages || 1, 10);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => getLeaders(l, { season: year, sortKey: "pts", limit: 100, page: i + 2, qualified: false })),
  );
  const m = new Map<string, Avg>();
  for (const r of [first, ...rest].flatMap((x) => x.rows)) m.set(r.player.id, toAvg(r));
  return m;
}

const isOut = (s: string | null) => /\bout\b|doubtful|suspend/i.test(s ?? "");

const OPP_KEYS: Record<ScanCatKey, string[]> = {
  pts: ["OPP_PTS"],
  reb: ["OPP_REB"],
  ast: ["OPP_AST"],
  tpm: ["OPP_FG3M"],
  stl: ["OPP_STL"],
  blk: ["OPP_BLK"],
  pra: ["OPP_PTS", "OPP_REB", "OPP_AST"],
};

/** How much of each stat every team allows per game, from synced NBA.com data (or ESPN points only). */
async function opponentAllowed(l: League, currentYear: number) {
  if (l.provider.seasonStats === "boxscores") {
    // Every stat allowed, straight from this league's box scores.
    for (const y of [currentYear, currentYear - 1]) {
      const book = await getSeasonBook(l, y, 2);
      const gp = Math.max(0, ...[...book.teams.values()].map((t) => t.gp));
      if (book.teams.size && (gp >= 4 || y !== currentYear)) {
        return { table: allowedByTeam(book), label: `${l.shortName} box scores, ${seasonLabel(y)}${y === currentYear ? "" : " (current season too early)"}` };
      }
    }
  }
  const manifest = l.features.nbaComTracking ? await getManifest() : { seasons: {} as Record<string, unknown> };
  for (const y of [currentYear, currentYear - 1]) {
    const folder = seasonFolder(y, 2);
    if (!manifest.seasons[folder]) continue;
    const recs = await nbaRows(folder, "team_opponent");
    const gp = Math.max(0, ...recs.map((r) => n(r.GP) ?? 0));
    if (recs.length >= 20 && (gp >= 8 || y !== currentYear)) {
      const table: Record<string, Partial<Record<ScanCatKey, number>>> = {};
      for (const r of recs) {
        const abbr = String(r.TEAM_ABBREVIATION ?? "");
        table[abbr] = Object.fromEntries(
          SCAN_CATS.map((c) => [c.key, OPP_KEYS[c.key].reduce((a, k) => a + (n(r[k]) ?? 0), 0)]),
        ) as Record<ScanCatKey, number>;
      }
      return { table, label: `NBA.com, ${seasonLabel(y)}${y === currentYear ? "" : " (current season too early)"}` };
    }
  }
  // Fallback: points allowed only, from ESPN standings
  const st = await getStandings(l, currentYear);
  const table: Record<string, Partial<Record<ScanCatKey, number>>> = {};
  for (const s of st) if (s.oppg) table[nbaAbbr(s.team.abbr)] = { pts: s.oppg };
  return {
    table,
    label: l.features.nbaComTracking
      ? "ESPN points allowed only — sync NBA.com data for rebounds, assists, threes, steals, blocks"
      : "ESPN points allowed only",
  };
}

function rankAllowed(table: Record<string, Partial<Record<ScanCatKey, number>>>, abbr: string, cat: ScanCatKey) {
  const mine = table[abbr]?.[cat];
  if (mine == null) return { rank: null, allowed: null, pct: null };
  const all = Object.values(table)
    .map((t) => t[cat])
    .filter((v): v is number => v != null);
  return { rank: rankOf(mine, all), allowed: mine, pct: percentileOf(mine, all) };
}

const r1 = (x: number | null | undefined) => (x == null ? "–" : x.toFixed(1));

// ---------------------------------------------------------------------------- main

export async function runScan(
  l: League,
  games: GameCard[],
  currentYear: number,
  scope: "game" | "day",
  extraInjuries: { teamId: string; items: { name: string; status: string; detail: string }[] }[] = [],
): Promise<ScanReport> {
  const [cur, prev, injuries, opp] = await Promise.all([
    leagueAverages(l, currentYear),
    leagueAverages(l, currentYear - 1),
    getInjuries(l),
    opponentAllowed(l, currentYear),
  ]);

  // League-wide comparison pool: rotation players from whichever season has a real sample.
  const curDeep = [...cur.values()].filter((a) => a.gp >= 10).length >= 150;
  const poolSrc = curDeep ? cur : prev;
  const poolMinGp = curDeep ? 10 : 25;
  const pool = [...poolSrc.values()].filter((a) => a.gp >= poolMinGp && a.min >= 15);
  const poolVals: Record<ScanCatKey, number[]> = Object.fromEntries(SCAN_CATS.map((c) => [c.key, pool.map((a) => statOf(a, c.key))])) as Record<
    ScanCatKey,
    number[]
  >;

  // Every player on every team in scope
  const sides = games.flatMap((g) => [
    { game: g, team: g.away.team, opp: g.home.team, label: `${g.away.team.abbr} @ ${g.home.team.abbr}` },
    { game: g, team: g.home.team, opp: g.away.team, label: `${g.away.team.abbr} @ ${g.home.team.abbr}` },
  ]);
  const rosters = await mapLimit(sides, 6, (s) => getRoster(l, s.team.id));

  type Cand = { side: (typeof sides)[number]; p: Awaited<ReturnType<typeof getRoster>>[number]; base: Avg; baseLabel: string; status: string | null };
  const cands: Cand[] = [];
  const outList: ScanReport["out"] = [];
  let scanned = 0;
  sides.forEach((side, i) => {
    const injured = new Map((injuries[side.team.id] ?? []).map((x) => [x.playerId, x.status + (x.detail ? ` · ${x.detail}` : "")]));
    const injuredByName = new Map(
      extraInjuries.filter((t) => t.teamId === side.team.id).flatMap((t) => t.items.map((x) => [x.name, x.status + (x.detail ? ` · ${x.detail}` : "")] as const)),
    );
    for (const p of rosters[i]) {
      scanned++;
      const c = cur.get(p.id);
      const pv = prev.get(p.id);
      const useCur = c && c.gp >= 5;
      const base = useCur ? c : pv ?? c;
      const status = injured.get(p.id) ?? injuredByName.get(p.name) ?? p.injury ?? null;
      if (!base) continue;
      const baseLabel = useCur || !pv ? seasonLabel(currentYear) : `${seasonLabel(currentYear - 1)} (current season < 5 games)`;
      if (isOut(status)) {
        if (base.min >= 15) outList.push({ name: p.name, teamAbbr: side.team.abbr, status: status ?? "Out", pts: base.pts, min: base.min });
        continue;
      }
      if (base.min < 15 && (c?.min ?? 0) < 15) continue;
      cands.push({ side, p, base, baseLabel, status });
    }
  });

  // Keep the work bounded on big slates: rough pre-score, then fetch game logs for the best ~140.
  const pre = (c: Cand) => Math.max(...SCAN_CATS.map((k) => percentileOf(statOf(c.base, k.key), poolVals[k.key]) ?? 0));
  const chosen = cands.length > 140 ? [...cands].sort((a, b) => pre(b) - pre(a)).slice(0, 140) : cands;

  const logs = await mapLimit(chosen, 8, async (c) => {
    const regular = (rows: GameLogRow[]) => rows.filter((g) => g.seasonType !== 1 && g.box.min > 0);
    let games = regular(await getPlayerGameLog(l, c.p.id, currentYear));
    if (games.length < 10) games = games.concat(regular(await getPlayerGameLog(l, c.p.id, currentYear - 1)));
    return games.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);
  });

  // League-average allowed per stat, for the matchup nudge in projections
  const lgAllowed = Object.fromEntries(
    SCAN_CATS.map((c) => {
      const vals = Object.values(opp.table).map((t) => t[c.key]).filter((v): v is number => v != null);
      return [c.key, mean(vals)];
    }),
  ) as Record<ScanCatKey, number | null>;

  // Team-level context: high-volume teammates who are out
  const outByTeam = new Map<string, ScanReport["out"]>();
  for (const o of outList) outByTeam.set(o.teamAbbr, [...(outByTeam.get(o.teamAbbr) ?? []), o]);

  const players: ScanPlayer[] = chosen.map((c, i) => {
    const log = logs[i];
    const last5 = log.slice(0, 5);
    const oppAbbr = nbaAbbr(c.side.opp.abbr);
    const l5min = mean(last5.map((g) => g.box.min));
    const notes: string[] = [];
    if (l5min != null && l5min - c.base.min >= 4) notes.push(`Minutes up: ${r1(l5min)} over the last 5 vs ${r1(c.base.min)} on the season`);
    if (l5min != null && c.base.min - l5min >= 5) notes.push(`Minutes down: ${r1(l5min)} over the last 5 vs ${r1(c.base.min)} on the season`);
    const outMates = (outByTeam.get(c.side.team.abbr) ?? []).filter((o) => (o.pts ?? 0) >= 12);
    if (outMates.length) notes.push(`Teammate${outMates.length > 1 ? "s" : ""} out: ${outMates.map((o) => `${o.name} (${r1(o.pts)} ppg)`).join(", ")}`);
    if (c.status) notes.push(`Status: ${c.status}`);

    const signals: ScanSignal[] = SCAN_CATS.map((cat) => {
      const base = statOf(c.base, cat.key);
      const vals = log.map((g) => statOf(g.box, cat.key));
      const l5 = mean(vals.slice(0, 5));
      const l10 = mean(vals);
      const hit = hitLine(vals, cat.ladder);
      const pct = percentileOf(base, poolVals[cat.key]);
      const rank = rankOf(base, poolVals[cat.key]);
      const form = formOf(l5, base, cat.floor);
      const o = rankAllowed(opp.table, oppAbbr, cat.key);
      const reasons: string[] = [];
      if (rank != null && pct != null && pct >= 0.9) reasons.push(`League top ${Math.max(1, Math.round((1 - pct) * 100))}% · #${rank} among rotation players`);
      else if (pct != null && pct >= 0.75) reasons.push(`Top quarter of the league (#${rank})`);
      if (form != null && form >= 0.15 && l5 != null) reasons.push(`Hot: ${r1(l5)} over the last 5 vs ${r1(base)} average (+${Math.round(form * 100)}%)`);
      if (form != null && form <= -0.15 && l5 != null) reasons.push(`Cold: ${r1(l5)} over the last 5 vs ${r1(base)} average (${Math.round(form * 100)}%)`);
      if (hit) reasons.push(`${cat.short} ${hit.line}+ in ${hit.hits} of last ${hit.n}`);
      if (o.rank != null && o.rank <= 5) reasons.push(`${oppAbbr} allow the ${o.rank === 1 ? "most" : `${ordinal(o.rank)}-most`} ${cat.label.toLowerCase()} (${r1(o.allowed)}/game)`);
      if (o.rank != null && o.rank >= 26) reasons.push(`Tough matchup: ${oppAbbr} allow the ${o.rank === 30 ? "fewest" : `${ordinal(31 - o.rank)}-fewest`} ${cat.label.toLowerCase()}`);
      return {
        cat: cat.key,
        base,
        l5,
        l10,
        hit,
        leagueRank: rank,
        leaguePct: pct,
        form,
        oppRank: o.rank,
        oppAllowed: o.allowed,
        score: signalScore({ pct, form, hitRate: hit ? hit.hits / hit.n : null, oppPct: o.pct }),
        reasons,
      };
    }).filter((s) => {
      const cat = SCAN_CATS.find((k) => k.key === s.cat)!;
      return s.base >= cat.floor || (s.l5 ?? 0) >= cat.floor;
    });

    const model = Object.fromEntries(
      (["pts", "reb", "ast", "tpm", "stl", "blk"] as ModelStat[]).map((k) => {
        const o = opp.table[oppAbbr]?.[k] ?? null;
        const pr = projectStat(k, statOf(c.base, k), log.map((g) => statOf(g.box, k)), o, lgAllowed[k]);
        return [k, { mean: Math.round(pr.mean * 100) / 100, sd: Math.round(pr.sd * 100) / 100 }];
      }),
    ) as ScanPlayer["model"];

    return {
      id: c.p.id,
      name: c.p.name,
      headshot: c.p.headshot,
      pos: c.p.pos,
      teamId: c.side.team.id,
      teamAbbr: c.side.team.abbr,
      oppAbbr: c.side.opp.abbr,
      gameId: c.side.game.id,
      gameLabel: c.side.label,
      status: c.status,
      baseLabel: c.baseLabel,
      gp: c.base.gp,
      min: c.base.min,
      l5min,
      recent: log.slice(0, 5).map((g) => ({ date: g.date, opp: `${g.atVs} ${g.opp}`, pts: g.box.pts, reb: g.box.reb, ast: g.box.ast, tpm: g.box.tpm, stl: g.box.stl, blk: g.box.blk, min: g.box.min })),
      signals,
      notes,
      model,
      history: {
        pts: log.map((g) => g.box.pts),
        reb: log.map((g) => g.box.reb),
        ast: log.map((g) => g.box.ast),
        tpm: log.map((g) => g.box.tpm),
      },
    };
  });

  const pairs = players.flatMap((p) => p.signals.map((s) => ({ player: p, signal: s })));

  // A top signal has to be a genuine standout: top 40% of the league in that stat,
  // or clearly hot (20%+ above a real average) — not just a soft matchup.
  const standout = (x: (typeof pairs)[number]) => {
    const cat = SCAN_CATS.find((c) => c.key === x.signal.cat)!;
    return (x.signal.leaguePct ?? 0) >= 0.6 || ((x.signal.form ?? 0) >= 0.2 && x.signal.base >= cat.floor * 1.2);
  };
  // Best category per player (PRA slightly discounted so single stats win ties) …
  const bestPerPlayer = new Map<string, (typeof pairs)[number]>();
  const adj = (x: (typeof pairs)[number]) => (x.signal.cat === "pra" ? x.signal.score - 3 : x.signal.score);
  for (const x of pairs.filter(standout)) {
    const cur = bestPerPlayer.get(x.player.id);
    if (!cur || adj(x) > adj(cur)) bestPerPlayer.set(x.player.id, x);
  }
  // … then keep the list varied: at most 3 (4 on a full slate) per stat.
  const cap = scope === "day" ? 4 : 3;
  const perCat = new Map<ScanCatKey, number>();
  const top: (typeof pairs)[number][] = [];
  for (const x of [...bestPerPlayer.values()].sort((a, b) => b.signal.score - a.signal.score)) {
    if ((perCat.get(x.signal.cat) ?? 0) >= cap) continue;
    perCat.set(x.signal.cat, (perCat.get(x.signal.cat) ?? 0) + 1);
    top.push(x);
    if (top.length >= (scope === "day" ? 12 : 8)) break;
  }

  const byCat = SCAN_CATS.map((cat) => ({
    cat: cat.key,
    rows: pairs
      .filter((x) => x.signal.cat === cat.key)
      .sort((a, b) => b.signal.base - a.signal.base)
      .slice(0, scope === "day" ? 8 : 5),
  }));

  const formPairs = pairs.filter((x) => (x.signal.cat === "pts" || x.signal.cat === "pra") && x.signal.form != null && x.player.recent.length >= 4);
  const dedupe = (xs: typeof formPairs) => {
    const seen = new Set<string>();
    return xs.filter((x) => (seen.has(x.player.id) ? false : (seen.add(x.player.id), true)));
  };
  const hot = dedupe(formPairs.filter((x) => x.signal.form! >= 0.15).sort((a, b) => b.signal.form! - a.signal.form!)).slice(0, 6);
  const cold = dedupe(formPairs.filter((x) => x.signal.form! <= -0.15).sort((a, b) => a.signal.form! - b.signal.form!)).slice(0, 4);

  const matchups = sides.map((s) => {
    const oppAbbr = nbaAbbr(s.opp.abbr);
    const ranks = SCAN_CATS.map((c) => ({ cat: c.key, ...rankAllowed(opp.table, oppAbbr, c.key) })).filter((x) => x.rank != null);
    return {
      teamAbbr: s.team.abbr,
      oppAbbr: s.opp.abbr,
      soft: ranks.filter((x) => x.rank! <= 5).map((x) => ({ cat: x.cat, rank: x.rank!, allowed: x.allowed! })),
      tough: ranks.filter((x) => x.rank! >= 26).map((x) => ({ cat: x.cat, rank: x.rank!, allowed: x.allowed! })),
    };
  });

  // Team score projections for the simulator
  let table = await getLeagueTable(l, currentYear, 2);
  let tableBasis = seasonLabel(currentYear);
  const thin = !table.context || table.rows.every((r) => (r.gp ?? 0) < 8);
  if (thin) {
    const prevTable = await getLeagueTable(l, currentYear - 1, 2);
    if (prevTable.context) {
      table = prevTable;
      tableBasis = `${seasonLabel(currentYear - 1)} (current season too early)`;
    }
  }
  const rowMap = new Map(table.rows.map((r) => [r.team.id, r]));
  const gameModels: GameModel[] = games.map((g) => {
    const proj = projectGame(g, rowMap);
    const lg = table.averages?.ppg ?? 114;
    // Home court ≈ +1.5 each way on top of the season blend
    const away = (proj?.away ?? lg) - 1.25;
    const home = (proj?.home ?? lg) + 1.25;
    const m = (g.odds?.details ?? "").match(/^([A-Z]{2,4})\s*([-+]?\d+(?:\.\d+)?)/);
    const team = (s: (typeof g)["away"]) => ({ id: s.team.id, abbr: s.team.abbr, name: s.team.shortName, logo: s.team.logo, color: s.team.color });
    return {
      id: g.id,
      label: `${g.away.team.abbr} @ ${g.home.team.abbr}`,
      date: g.date,
      teams: [{ ...team(g.away), mean: Math.round(away * 10) / 10 }, { ...team(g.home), mean: Math.round(home * 10) / 10 }],
      overUnder: g.odds?.overUnder ?? null,
      spread: m ? { abbr: m[1], value: Number(m[2]) } : null,
      basis: proj ? `Team scoring vs points allowed, ${tableBasis}, plus home court` : "League average (team data not available)",
    };
  });

  const first = games[0];
  return {
    scope,
    title: scope === "game" && first ? `${first.away.team.shortName} @ ${first.home.team.shortName}` : `${games.length} game${games.length === 1 ? "" : "s"}`,
    generatedAt: new Date().toISOString(),
    games: games.map((g) => ({ id: g.id, label: `${g.away.team.abbr} @ ${g.home.team.abbr}`, date: g.date })),
    scanned,
    rotation: players.length,
    basis: {
      players: "Season averages (last season when a player has fewer than 5 games this season) + last 10 games across both seasons",
      league: `Ranks vs ${pool.length} rotation players, ${curDeep ? seasonLabel(currentYear) : seasonLabel(currentYear - 1)}`,
      opponent: opp.label,
    },
    top,
    byCat,
    hot,
    cold,
    matchups,
    out: outList.sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0)),
    gameModels,
    pool: players,
  };
}
