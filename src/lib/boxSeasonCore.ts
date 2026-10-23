// Season aggregates built from per-game box scores. Pure functions, no I/O.
// Used for leagues where ESPN publishes box scores but no season endpoints (e.g. NBL):
// every completed game is folded into a SeasonBook, and the book answers the same
// questions ESPN's team-stats, player-averages, game-log and leaderboard feeds would.
import type { GameLogRow, GameSummary, LeaderRow, PlayerRef, PlayerSeasonRow, TeamRef, TeamSeason } from "./model.ts";
import { addBox, emptyBox, type BoxLine } from "./stats.ts";

export interface BookTeam {
  team: TeamRef;
  gp: number;
  wins: number;
  losses: number;
  totals: BoxLine;
  /** What opponents put up against this team. */
  opp: BoxLine;
}

export interface BookPlayerTeam {
  team: TeamRef;
  gp: number;
  gs: number;
  totals: BoxLine;
}

export interface BookPlayer {
  player: PlayerRef;
  /** Team of the player's most recent game. */
  team: TeamRef;
  gp: number;
  gs: number;
  dd2: number;
  td3: number;
  totals: BoxLine;
  byTeam: Map<string, BookPlayerTeam>;
  /** Newest first. */
  log: GameLogRow[];
  lastDate: string;
}

export interface SeasonBook {
  year: number;
  seasonType: number;
  label: string;
  games: number;
  teams: Map<string, BookTeam>;
  players: Map<string, BookPlayer>;
}

const played = (b: BoxLine, dnp: boolean) =>
  !dnp && (b.min > 0 || b.pts > 0 || b.fga > 0 || b.fta > 0 || b.reb > 0 || b.ast > 0 || b.stl > 0 || b.blk > 0 || b.tov > 0 || b.pf > 0);

function doubles(b: BoxLine): number {
  return [b.pts, b.reb, b.ast, b.stl, b.blk].filter((v) => v >= 10).length;
}

/** Fold completed games into a season book. Games without a two-team box score are skipped. */
export function buildSeasonBook(
  games: GameSummary[],
  meta: { year: number; seasonType: number; label: string },
): SeasonBook {
  const teams = new Map<string, BookTeam>();
  const players = new Map<string, BookPlayer>();
  let count = 0;

  for (const g of games) {
    if (g.card.state !== "post" || g.box.length !== 2) continue;
    count++;
    const [a, b] = g.box;
    for (const [mine, theirs] of [
      [a, b],
      [b, a],
    ] as const) {
      const side = mine.homeAway === "home" ? g.card.home : g.card.away;
      const oppSide = mine.homeAway === "home" ? g.card.away : g.card.home;
      const pts = side.score ?? mine.totals.pts;
      const oppPts = oppSide.score ?? theirs.totals.pts;
      const won = pts > oppPts;

      const t = teams.get(mine.team.id) ?? { team: mine.team, gp: 0, wins: 0, losses: 0, totals: emptyBox(), opp: emptyBox() };
      t.gp++;
      if (won) t.wins++;
      else t.losses++;
      t.totals = addBox(t.totals, { ...mine.totals, pts });
      t.opp = addBox(t.opp, { ...theirs.totals, pts: oppPts });
      teams.set(mine.team.id, t);

      for (const bp of mine.players) {
        if (!bp.player.id || !played(bp.box, bp.dnp)) continue;
        const p: BookPlayer = players.get(bp.player.id) ?? {
          player: bp.player,
          team: mine.team,
          gp: 0,
          gs: 0,
          dd2: 0,
          td3: 0,
          totals: emptyBox(),
          byTeam: new Map(),
          log: [],
          lastDate: "",
        };
        p.gp++;
        if (bp.starter) p.gs++;
        const d = doubles(bp.box);
        if (d >= 2) p.dd2++;
        if (d >= 3) p.td3++;
        p.totals = addBox(p.totals, bp.box);
        if (g.card.date >= p.lastDate) {
          p.lastDate = g.card.date;
          p.team = mine.team;
          p.player = { ...bp.player, teamId: mine.team.id };
        }
        const pt = p.byTeam.get(mine.team.id) ?? { team: mine.team, gp: 0, gs: 0, totals: emptyBox() };
        pt.gp++;
        if (bp.starter) pt.gs++;
        pt.totals = addBox(pt.totals, bp.box);
        p.byTeam.set(mine.team.id, pt);
        p.log.push({
          eventId: g.card.id,
          date: g.card.date,
          opp: theirs.team.abbr,
          oppLogo: theirs.team.logo,
          atVs: mine.homeAway === "home" ? "vs" : "@",
          result: won ? "W" : "L",
          score: `${pts}-${oppPts}`,
          seasonType: g.card.seasonType || meta.seasonType,
          box: bp.box,
        });
        players.set(bp.player.id, p);
      }
    }
  }

  for (const p of players.values()) p.log.sort((x, y) => (x.date < y.date ? 1 : -1));
  return { ...meta, games: count, teams, players };
}

export function perGame(totals: BoxLine, gp: number): BoxLine {
  const out = emptyBox();
  if (!gp) return out;
  (Object.keys(out) as (keyof BoxLine)[]).forEach((k) => (out[k] = (totals[k] ?? 0) / gp));
  return out;
}

/** Same shape as ESPN's team statistics feed. */
export function teamSeasonFrom(book: SeasonBook, teamId: string): TeamSeason | null {
  const t = book.teams.get(teamId);
  if (!t || !t.gp) return null;
  const pg = perGame(t.totals, t.gp);
  const opg = perGame(t.opp, t.gp);
  return {
    gp: t.gp,
    perGame: pg,
    totals: t.totals,
    raw: {
      gamesPlayed: t.gp,
      wins: t.wins,
      losses: t.losses,
      avgPoints: pg.pts,
      avgPointsAgainst: opg.pts,
      avgOppRebounds: opg.reb,
      avgOppAssists: opg.ast,
      avgOppThreePointFieldGoalsMade: opg.tpm,
      avgOppSteals: opg.stl,
      avgOppBlocks: opg.blk,
      avgOppTurnovers: opg.tov,
    },
  };
}

/** One row per team the player appeared for (same as ESPN's career-by-season table). */
export function playerSeasonRowsFrom(book: SeasonBook, playerId: string): PlayerSeasonRow[] {
  const p = book.players.get(playerId);
  if (!p) return [];
  return [...p.byTeam.values()].map((pt) => ({
    season: book.label,
    year: book.year,
    teamId: pt.team.id,
    teamAbbr: pt.team.abbr,
    gp: pt.gp,
    gs: pt.gs,
    avg: perGame(pt.totals, pt.gp),
  }));
}

/** Values keyed exactly like ESPN's byathlete leaderboard, so pages read them unchanged. */
export function leaderValues(p: BookPlayer): Record<string, number> {
  const a = perGame(p.totals, p.gp);
  const pct = (m: number, att: number) => (att > 0 ? (100 * m) / att : 0);
  return {
    gamesPlayed: p.gp,
    gamesStarted: p.gs,
    avgMinutes: a.min,
    avgPoints: a.pts,
    avgFieldGoalsMade: a.fgm,
    avgFieldGoalsAttempted: a.fga,
    fieldGoalPct: pct(p.totals.fgm, p.totals.fga),
    avgThreePointFieldGoalsMade: a.tpm,
    avgThreePointFieldGoalsAttempted: a.tpa,
    threePointFieldGoalPct: pct(p.totals.tpm, p.totals.tpa),
    avgFreeThrowsMade: a.ftm,
    avgFreeThrowsAttempted: a.fta,
    freeThrowPct: pct(p.totals.ftm, p.totals.fta),
    avgOffensiveRebounds: a.oreb,
    avgDefensiveRebounds: a.dreb,
    avgRebounds: a.reb,
    avgAssists: a.ast,
    avgSteals: a.stl,
    avgBlocks: a.blk,
    avgTurnovers: a.tov,
    avgFouls: a.pf,
    doubleDouble: p.dd2,
    tripleDouble: p.td3,
  };
}

/** Minimum volume for a percentage leaderboard (per game), keyed by the value being sorted. */
const PCT_MIN: Record<string, [keyof BoxLine, number]> = {
  fieldGoalPct: ["fga", 4],
  threePointFieldGoalPct: ["tpa", 2],
  freeThrowPct: ["fta", 1.5],
};

/** Qualified = appeared in 60%+ of their team's games and averages 10+ minutes. */
export function isQualified(book: SeasonBook, p: BookPlayer, sortValue?: string): boolean {
  const teamGp = book.teams.get(p.team.id)?.gp ?? p.gp;
  if (p.gp < Math.max(1, Math.ceil(teamGp * 0.6))) return false;
  if (p.totals.min / p.gp < 10) return false;
  const req = sortValue ? PCT_MIN[sortValue] : undefined;
  if (req && (p.totals[req[0]] ?? 0) / p.gp < req[1]) return false;
  return true;
}

/**
 * Leaderboard page from the book. `sort` is an ESPN sort string such as
 * "offensive.avgPoints:desc"; the part after the dot names the value to rank by.
 */
export function leadersFrom(
  book: SeasonBook,
  opts: { sort: string; qualified?: boolean; limit?: number; page?: number },
): { rows: LeaderRow[]; pages: number; count: number } {
  const m = opts.sort.match(/^(?:[a-z]+\.)?([A-Za-z]+)(?::(asc|desc))?$/);
  const key = m?.[1] ?? "avgPoints";
  const dir = m?.[2] === "asc" ? 1 : -1;
  const limit = Math.max(1, opts.limit ?? 50);
  const page = Math.max(1, opts.page ?? 1);

  const all = [...book.players.values()]
    .filter((p) => (opts.qualified === false ? true : isQualified(book, p, key)))
    .map((p) => ({ p, values: leaderValues(p) }))
    .sort((x, y) => dir * ((x.values[key] ?? 0) - (y.values[key] ?? 0)) || (y.values.avgPoints ?? 0) - (x.values.avgPoints ?? 0));

  const rows: LeaderRow[] = all.slice((page - 1) * limit, page * limit).map(({ p, values }) => ({
    player: { ...p.player, teamId: p.team.id },
    teamAbbr: p.team.abbr,
    teamLogo: p.team.logo,
    values,
  }));
  return { rows, pages: Math.ceil(all.length / limit), count: all.length };
}

/** Per-game stats each team allows, keyed by team abbreviation (used by the scan report). */
export function allowedByTeam(book: SeasonBook): Record<string, { pts: number; reb: number; ast: number; tpm: number; stl: number; blk: number; pra: number }> {
  const out: Record<string, { pts: number; reb: number; ast: number; tpm: number; stl: number; blk: number; pra: number }> = {};
  for (const t of book.teams.values()) {
    const o = perGame(t.opp, t.gp);
    out[t.team.abbr] = { pts: o.pts, reb: o.reb, ast: o.ast, tpm: o.tpm, stl: o.stl, blk: o.blk, pra: o.pts + o.reb + o.ast };
  }
  return out;
}
