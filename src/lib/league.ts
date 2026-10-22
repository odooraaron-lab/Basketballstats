import "server-only";
import type { League } from "@/leagues/types";
import { getCurrentSeason, getStandings, getTeamSeason, getTeams, seasonLabel } from "./espn";
import type { GameCard, Standing, TeamRef, TeamSeason } from "./model";
import { regulationMinutes } from "./rules";
import {
  addBox,
  effectiveFg,
  emptyBox,
  fourFactors,
  ftRate,
  offRating,
  possessionsSimple,
  threeRate,
  trueShooting,
  type LeagueContext,
} from "./stats";

export interface SeasonSel {
  year: number;
  type: number; // 2 regular, 3 playoffs
  label: string;
  current: number;
}

/** Resolve ?season=&type= against the league's current season. */
export async function resolveSeason(
  l: League,
  sp: { season?: string; type?: string } | undefined,
): Promise<SeasonSel> {
  const cur = await getCurrentSeason(l);
  const year = Number(sp?.season) || cur.year;
  const type = sp?.type === "3" ? 3 : 2;
  return { year, type, label: seasonLabel(year) + (type === 3 ? " Playoffs" : ""), current: cur.year };
}

export interface TeamRow {
  team: TeamRef;
  standing: Standing | null;
  season: TeamSeason | null;
  gp: number;
  ppg: number;
  oppg: number | null;
  poss: number;
  pace: number;
  ortg: number | null;
  drtg: number | null;
  net: number | null;
  ts: number | null;
  efg: number | null;
  tovPct: number | null;
  orebPct: number | null;
  ftRate: number | null;
  threeRate: number | null;
  avgTotal: number | null;
}

export interface LeagueTable {
  rows: TeamRow[];
  context: LeagueContext | null;
  averages: { ppg: number; total: number; pace: number; ortg: number } | null;
}

export async function getLeagueTable(l: League, year: number, type = 2): Promise<LeagueTable> {
  const [teams, standings] = await Promise.all([getTeams(l), getStandings(l, year)]);
  const seasons = await Promise.all(teams.map((t) => getTeamSeason(l, t.id, year, type)));
  const regMin = regulationMinutes(l.rules);

  const rows: TeamRow[] = teams.map((team, i) => {
    const s = seasons[i];
    const st = standings.find((x) => x.team.id === team.id) ?? null;
    const pg = s?.perGame ?? emptyBox();
    const poss = possessionsSimple(pg);
    const oppg = type === 2 && st && st.oppg ? st.oppg : s?.raw?.avgPointsAgainst ?? null;
    const ortg = s ? offRating(pg.pts, poss) : null;
    const drtg = oppg != null && poss > 0 ? (100 * oppg) / poss : null;
    const ff = fourFactors(pg, emptyBox());
    return {
      team,
      standing: st,
      season: s,
      gp: s?.gp ?? 0,
      ppg: pg.pts,
      oppg,
      poss,
      pace: (poss * regMin) / regMin, // per-game possessions == per-48 for regulation games
      ortg,
      drtg,
      net: ortg != null && drtg != null ? ortg - drtg : null,
      ts: s ? trueShooting(pg) : null,
      efg: s ? effectiveFg(pg) : null,
      tovPct: ff.tovPct,
      orebPct: null,
      ftRate: s ? ftRate(pg) : null,
      threeRate: s ? threeRate(pg) : null,
      avgTotal: oppg != null && s ? pg.pts + oppg : null,
    };
  });

  const withData = rows.filter((r) => r.season);
  if (!withData.length) return { rows, context: null, averages: null };

  const totals = withData.reduce((acc, r) => addBox(acc, r.season!.totals), emptyBox());
  totals.min = withData.reduce((a, r) => a + r.gp, 0) * regMin * l.rules.playersOnCourt;
  const avgPace = withData.reduce((a, r) => a + r.pace, 0) / withData.length;
  const totalsWithOpp = withData.filter((r) => r.avgTotal != null);
  return {
    rows,
    context: { totals, pace: avgPace },
    averages: {
      ppg: withData.reduce((a, r) => a + r.ppg, 0) / withData.length,
      total: totalsWithOpp.length
        ? totalsWithOpp.reduce((a, r) => a + (r.avgTotal ?? 0), 0) / totalsWithOpp.length
        : (2 * withData.reduce((a, r) => a + r.ppg, 0)) / withData.length,
      pace: avgPace,
      ortg: withData.reduce((a, r) => a + (r.ortg ?? 0), 0) / withData.length,
    },
  };
}

/** Projected score: average of a team's scoring and the opponent's points allowed. */
export function projectGame(g: GameCard, rows: Map<string, TeamRow>) {
  const a = rows.get(g.away.team.id);
  const h = rows.get(g.home.team.id);
  if (!a?.season || !h?.season || a.oppg == null || h.oppg == null) return null;
  return { away: (a.ppg + h.oppg) / 2, home: (h.ppg + a.oppg) / 2 };
}
