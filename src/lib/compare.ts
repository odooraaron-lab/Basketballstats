// Builds the side-by-side roster comparison for a game: every player on both teams with
// the same stat columns, for a chosen split (this season, last season, last 5/10 games).
import "server-only";
import type { League } from "@/leagues/types";
import { getPlayerGameLog, getPlayerSeasons, getRoster, seasonLabel } from "./espn";
import { getLeagueTable, type LeagueTable } from "./league";
import type { GameCard, GameSummary, PlayerSeasonRow, RosterPlayer } from "./model";
import { findPlayer, n, rows as nbaRows, seasonFolder, type Rec } from "./nbacom";
import { teamMinutes } from "./rules";
import {
  addBox,
  astToRatio,
  effectiveFg,
  emptyBox,
  ftPct,
  fgPct,
  gameScore,
  per,
  perMinutes,
  tpPct,
  trueShooting,
  usage,
  type BoxLine,
} from "./stats";

export type Split = "season" | "prev" | "l5" | "l10";
export type Cells = Record<string, number | null>;

export interface ComparePlayer {
  id: string;
  teamId: string;
  name: string;
  headshot: string;
  jersey: string;
  pos: string;
  status: string | null; // injury / availability
  cells: Cells;
}

export interface CompareTeam {
  id: string;
  abbr: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
  record: string;
  footer: Cells;
}

export interface CompareData {
  split: Split;
  splitLabel: string;
  seasonYear: number;
  teams: CompareTeam[]; // [away, home]
  players: ComparePlayer[];
  hasHustle: boolean;
  hasOfficial: boolean;
}

const avgOf = (games: BoxLine[]): BoxLine => {
  const sum = games.reduce((acc, b) => addBox(acc, b), emptyBox());
  const out = emptyBox();
  (Object.keys(out) as (keyof BoxLine)[]).forEach((k) => (out[k] = games.length ? (sum[k] ?? 0) / games.length : 0));
  return out;
};

function boxCells(b: BoxLine | null, gp: number | null, gs: number | null, team: LeagueTable["rows"][number] | null, table: LeagueTable, tmMin: number): Cells {
  if (!b) return { gp: gp ?? null };
  const p36 = perMinutes(b, 36);
  const tmPg = team?.season?.perGame ?? null;
  return {
    gp,
    gs,
    min: b.min,
    pts: b.pts,
    fgm: b.fgm,
    fga: b.fga,
    fgp: fgPct(b),
    twom: b.fgm - b.tpm,
    twoa: b.fga - b.tpa,
    twop: b.fga - b.tpa > 0 ? (b.fgm - b.tpm) / (b.fga - b.tpa) : null,
    tpm: b.tpm,
    tpa: b.tpa,
    tpp: tpPct(b),
    ftm: b.ftm,
    fta: b.fta,
    ftp: ftPct(b),
    oreb: b.oreb,
    dreb: b.dreb,
    reb: b.reb,
    ast: b.ast,
    stl: b.stl,
    blk: b.blk,
    stocks: b.stl + b.blk,
    tov: b.tov,
    pf: b.pf,
    pra: b.pts + b.reb + b.ast,
    astto: astToRatio(b),
    ts: trueShooting(b),
    efg: effectiveFg(b),
    usg: tmPg ? usage(b, tmPg, tmMin) : null,
    per: tmPg && table.context && team ? per(b, { totals: tmPg, pace: team.pace }, table.context) : null,
    gmsc: gameScore(b),
    ftr: b.fga ? b.fta / b.fga : null,
    tpr: b.fga ? b.tpa / b.fga : null,
    p36pts: p36.pts,
    p36reb: p36.reb,
    p36ast: p36.ast,
    p36stl: p36.stl,
    p36blk: p36.blk,
    p36tov: p36.tov,
    p36tpm: p36.tpm,
  };
}

function pickSeasonRow(rows: PlayerSeasonRow[], year: number, teamId: string): PlayerSeasonRow | null {
  const inYear = rows.filter((r) => r.year === year);
  return inYear.find((r) => r.teamId === teamId) ?? inYear[inYear.length - 1] ?? null;
}

function teamFooter(team: LeagueTable["rows"][number] | null): Cells {
  const b = team?.season?.perGame;
  if (!b) return {};
  return {
    gp: team!.gp,
    pts: b.pts,
    fgm: b.fgm,
    fga: b.fga,
    fgp: fgPct(b),
    twom: b.fgm - b.tpm,
    twoa: b.fga - b.tpa,
    twop: b.fga - b.tpa > 0 ? (b.fgm - b.tpm) / (b.fga - b.tpa) : null,
    tpm: b.tpm,
    tpa: b.tpa,
    tpp: tpPct(b),
    ftm: b.ftm,
    fta: b.fta,
    ftp: ftPct(b),
    oreb: b.oreb,
    dreb: b.dreb,
    reb: b.reb,
    ast: b.ast,
    stl: b.stl,
    blk: b.blk,
    stocks: b.stl + b.blk,
    tov: b.tov,
    pf: b.pf,
    pra: b.pts + b.reb + b.ast,
    astto: astToRatio(b),
    ts: trueShooting(b),
    efg: effectiveFg(b),
    ftr: b.fga ? b.fta / b.fga : null,
    tpr: b.fga ? b.tpa / b.fga : null,
  };
}

export async function compareRosters(league: League, g: GameSummary, currentYear: number, split: Split): Promise<CompareData> {
  const card: GameCard = g.card;
  const year = split === "prev" ? currentYear - 1 : currentYear;
  const sides = [card.away, card.home];

  let table = await getLeagueTable(league, year, 2);
  // Early in a season there may be no team totals yet — use last season's for context metrics.
  if (!table.context && split !== "prev") table = await getLeagueTable(league, year - 1, 2);
  const tmMin = teamMinutes(league.rules, league.rules.periods);

  const folder = seasonFolder(split === "prev" ? currentYear - 1 : currentYear, 2);
  const [hustle, official] = await Promise.all([nbaRows(folder, "hustle_player"), nbaRows(folder, "player_advanced")]);

  const injuryByName = new Map<string, string>();
  for (const t of g.injuries) for (const i of t.items) injuryByName.set(i.name, [i.status, i.detail].filter(Boolean).join(" · "));

  const rosters: RosterPlayer[][] = await Promise.all(sides.map((s) => getRoster(league, s.team.id)));
  const players: ComparePlayer[] = [];

  await Promise.all(
    sides.map(async (side, si) => {
      const teamRow = table.rows.find((r) => r.team.id === side.team.id) ?? null;
      const roster = rosters[si];
      const built = await Promise.all(
        roster.map(async (p) => {
          let cells: Cells;
          if (split === "l5" || split === "l10") {
            const log = (await getPlayerGameLog(league, p.id, currentYear)).filter((x) => x.box.min > 0 && x.seasonType !== 1);
            const games = log.slice(0, split === "l5" ? 5 : 10).map((x) => x.box);
            const avg = games.length ? avgOf(games) : null;
            cells = boxCells(avg, games.length || null, null, teamRow, table, tmMin);
            if (avg) cells.pm = avgOf(games).pm ?? null;
          } else {
            const row = pickSeasonRow(await getPlayerSeasons(league, p.id, 2), year, side.team.id);
            cells = boxCells(row?.avg ?? null, row?.gp ?? null, row?.gs ?? null, teamRow, table, tmMin);
          }
          const h = hustle.length ? findPlayer(hustle, p.name, side.team.abbr) : null;
          const o = official.length ? findPlayer(official, p.name, side.team.abbr) : null;
          const hv = (r: Rec | null, k: string) => (r ? n(r[k]) : null);
          Object.assign(cells, {
            h_cont: hv(h, "CONTESTED_SHOTS"),
            h_defl: hv(h, "DEFLECTIONS"),
            h_chg: hv(h, "CHARGES_DRAWN"),
            h_scr: hv(h, "SCREEN_ASSISTS"),
            h_lb: hv(h, "LOOSE_BALLS_RECOVERED"),
            h_bo: hv(h, "BOX_OUTS"),
            o_ortg: hv(o, "OFF_RATING"),
            o_drtg: hv(o, "DEF_RATING"),
            o_net: hv(o, "NET_RATING"),
            o_pie: hv(o, "PIE"),
            o_usg: hv(o, "USG_PCT"),
            o_ts: hv(o, "TS_PCT"),
          });
          return {
            id: p.id,
            teamId: side.team.id,
            name: p.name,
            headshot: p.headshot,
            jersey: p.jersey,
            pos: p.pos,
            status: injuryByName.get(p.name) ?? p.injury ?? null,
            cells,
          } satisfies ComparePlayer;
        }),
      );
      players.push(...built);
    }),
  );

  const teams: CompareTeam[] = sides.map((s) => {
    const row = table.rows.find((r) => r.team.id === s.team.id) ?? null;
    return {
      id: s.team.id,
      abbr: s.team.abbr,
      name: s.team.name,
      shortName: s.team.shortName,
      logo: s.team.logo,
      color: s.team.color,
      record: s.record,
      footer: teamFooter(row),
    };
  });

  const labels: Record<Split, string> = {
    season: `${seasonLabel(currentYear)} season`,
    prev: `${seasonLabel(currentYear - 1)} season`,
    l5: "Last 5 games",
    l10: "Last 10 games",
  };

  return {
    split,
    splitLabel: labels[split],
    seasonYear: year,
    teams,
    players,
    hasHustle: hustle.length > 0,
    hasOfficial: official.length > 0,
  };
}
