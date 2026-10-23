// Reader for official NBA.com data synced by sync/sync_nba.py (nba_api) into data/nba/.
// stats.nba.com blocks cloud hosts, so this data is pulled from a home computer and
// committed to the repo; the app only ever reads local JSON here.
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type Rec = Record<string, string | number | null>;
interface Table {
  h: string[];
  r: (string | number | null)[][];
}
interface DatasetFile extends Partial<Table> {
  groups?: Record<string, Table>;
  updated?: string;
}

const DIR = path.join(process.cwd(), "data", "nba");
const cache = new Map<string, Promise<DatasetFile | null>>();

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/** ESPN season year (2027) → NBA.com folder ("2026-27" / "2026-27-playoffs"). */
export function seasonFolder(espnYear: number, type: number): string {
  return `${espnYear - 1}-${String(espnYear).slice(2)}${type === 3 ? "-playoffs" : ""}`;
}

export interface Manifest {
  updated?: string;
  seasons: Record<string, { updated?: string; datasets: Record<string, { rows?: number; updated?: string; error?: string }> }>;
}

export async function getManifest(): Promise<Manifest> {
  return (await readJson<Manifest>(path.join(DIR, "manifest.json"))) ?? { seasons: {} };
}

function load(folder: string, key: string) {
  const file = path.join(DIR, folder, `${key}.json`);
  if (!cache.has(file)) cache.set(file, readJson<DatasetFile>(file));
  return cache.get(file)!;
}

/** NBA.com team IDs are permanent; team datasets carry the ID but not the abbreviation. */
export const NBA_TEAM_ABBR: Record<number, string> = {
  1610612737: "ATL", 1610612738: "BOS", 1610612739: "CLE", 1610612740: "NOP", 1610612741: "CHI",
  1610612742: "DAL", 1610612743: "DEN", 1610612744: "GSW", 1610612745: "HOU", 1610612746: "LAC",
  1610612747: "LAL", 1610612748: "MIA", 1610612749: "MIL", 1610612750: "MIN", 1610612751: "BKN",
  1610612752: "NYK", 1610612753: "ORL", 1610612754: "IND", 1610612755: "PHI", 1610612756: "PHX",
  1610612757: "POR", 1610612758: "SAC", 1610612759: "SAS", 1610612760: "OKC", 1610612761: "TOR",
  1610612762: "UTA", 1610612763: "MEM", 1610612764: "WAS", 1610612765: "DET", 1610612766: "CHA",
};

const toRecs = (t?: Partial<Table>): Rec[] =>
  t?.h && t?.r
    ? t.r.map((row) => {
        const rec: Rec = Object.fromEntries(t.h!.map((h, i) => [h, row[i] ?? null]));
        if (rec.TEAM_ABBREVIATION == null && typeof rec.TEAM_ID === "number" && NBA_TEAM_ABBR[rec.TEAM_ID]) {
          rec.TEAM_ABBREVIATION = NBA_TEAM_ABBR[rec.TEAM_ID];
        }
        return rec;
      })
    : [];

/** Rows of a flat dataset. */
export async function rows(folder: string, key: string): Promise<Rec[]> {
  const d = await load(folder, key);
  return toRecs(d ?? undefined);
}

/** Rows of a grouped dataset, keyed by group name (tracking type, play type, contest range…). */
export async function groups(folder: string, key: string): Promise<Record<string, Rec[]>> {
  const d = await load(folder, key);
  const out: Record<string, Rec[]> = {};
  for (const [k, t] of Object.entries(d?.groups ?? {})) out[k] = toRecs(t);
  return out;
}

export async function updatedAt(folder: string, key: string): Promise<string | null> {
  return (await load(folder, key))?.updated ?? null;
}

// ---------------------------------------------------------------------------
// Matching ESPN players/teams to NBA.com IDs
// ---------------------------------------------------------------------------

const ESPN_TO_NBA_ABBR: Record<string, string> = { GS: "GSW", NO: "NOP", NY: "NYK", SA: "SAS", UTAH: "UTA", WSH: "WAS", PHO: "PHX", BKN: "BKN" };
const NBA_TO_ESPN_ABBR: Record<string, string> = Object.fromEntries(Object.entries(ESPN_TO_NBA_ABBR).map(([k, v]) => [v, k]));

export const nbaAbbr = (espn: string) => ESPN_TO_NBA_ABBR[espn] ?? espn;
export const espnAbbr = (nba: string) => NBA_TO_ESPN_ABBR[nba] ?? nba;

export function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/-/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findPlayer(recs: Rec[], name: string, espnTeamAbbr?: string): Rec | null {
  const n = normName(name);
  const hits = recs.filter((r) => normName(String(r.PLAYER_NAME ?? r.OFF_PLAYER_NAME ?? "")) === n);
  if (!hits.length) {
    // last-name + first-initial fallback (e.g. "Nic" vs "Nicolas")
    const [first, ...rest] = n.split(" ");
    const last = rest.join(" ");
    const loose = recs.filter((r) => {
      const m = normName(String(r.PLAYER_NAME ?? ""));
      return m.endsWith(` ${last}`) && m[0] === first?.[0];
    });
    if (loose.length === 1) return loose[0];
    return null;
  }
  if (hits.length === 1 || !espnTeamAbbr) return hits[0];
  const abbr = nbaAbbr(espnTeamAbbr);
  return hits.find((h) => h.TEAM_ABBREVIATION === abbr || h.PLAYER_LAST_TEAM_ABBREVIATION === abbr) ?? hits[0];
}

export function findTeam(recs: Rec[], espnTeamAbbr: string): Rec | null {
  const abbr = nbaAbbr(espnTeamAbbr);
  return recs.find((r) => r.TEAM_ABBREVIATION === abbr) ?? null;
}

export const nbaHeadshot = (id: string | number | null | undefined) =>
  id ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${id}.png` : "";
export const nbaLogo = (teamId: string | number | null | undefined) =>
  teamId ? `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg` : "";

export const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : v == null || v === "" ? null : Number(v));

export const PLAY_TYPE_LABELS: Record<string, string> = {
  Isolation: "Isolation",
  Transition: "Transition",
  PRBallHandler: "P&R ball handler",
  PRRollman: "P&R roll man",
  Postup: "Post-up",
  Spotup: "Spot-up",
  Handoff: "Handoff",
  Cut: "Cut",
  OffScreen: "Off screen",
  OffRebound: "Putbacks",
  Misc: "Misc",
};

export const CONTEST_LABELS: Record<string, string> = {
  "0-2 Feet - Very Tight": "Very tight (0–2 ft)",
  "2-4 Feet - Tight": "Tight (2–4 ft)",
  "4-6 Feet - Open": "Open (4–6 ft)",
  "6+ Feet - Wide Open": "Wide open (6+ ft)",
};

export const TRACKING_LABELS: Record<string, string> = {
  SpeedDistance: "Speed & distance",
  Drives: "Drives",
  CatchShoot: "Catch & shoot",
  PullUpShot: "Pull-up shooting",
  Passing: "Passing",
  Rebounding: "Rebounding",
  Possessions: "Touches & possessions",
  PaintTouch: "Paint touches",
  PostTouch: "Post touches",
  ElbowTouch: "Elbow touches",
  Defense: "Rim & defense",
  Efficiency: "Scoring efficiency",
};

/** Friendly labels for common NBA.com column names. */
export const COL_LABELS: Record<string, string> = {
  GP: "GP", G: "G", MIN: "MIN", W: "W", L: "L", AGE: "AGE",
  PTS: "PTS", FGM: "FGM", FGA: "FGA", FG_PCT: "FG%", FG3M: "3PM", FG3A: "3PA", FG3_PCT: "3P%", FTM: "FTM", FTA: "FTA", FT_PCT: "FT%",
  OREB: "OREB", DREB: "DREB", REB: "REB", AST: "AST", TOV: "TOV", STL: "STL", BLK: "BLK", BLKA: "BLKA", PF: "PF", PFD: "PFD", PLUS_MINUS: "+/-",
  EFG_PCT: "eFG%", TS_PCT: "TS%", USG_PCT: "USG%", PIE: "PIE", PACE: "PACE", OFF_RATING: "ORtg", DEF_RATING: "DRtg", NET_RATING: "NET",
  AST_PCT: "AST%", AST_TO: "AST/TO", AST_RATIO: "AST RATIO", OREB_PCT: "OREB%", DREB_PCT: "DREB%", REB_PCT: "REB%", TM_TOV_PCT: "TOV%",
  CONTESTED_SHOTS: "CONTESTS", CONTESTED_SHOTS_2PT: "2PT CONT", CONTESTED_SHOTS_3PT: "3PT CONT", DEFLECTIONS: "DEFL", CHARGES_DRAWN: "CHARGES",
  SCREEN_ASSISTS: "SCR AST", SCREEN_AST_PTS: "SCR AST PTS", LOOSE_BALLS_RECOVERED: "LOOSE BALLS", OFF_LOOSE_BALLS_RECOVERED: "OFF LB", DEF_LOOSE_BALLS_RECOVERED: "DEF LB",
  BOX_OUTS: "BOX OUTS", OFF_BOXOUTS: "OFF BO", DEF_BOXOUTS: "DEF BO", BOX_OUT_PLAYER_REBS: "BO REB", PCT_BOX_OUTS_REB: "BO→REB%",
  DIST_MILES: "MILES", DIST_MILES_OFF: "MI OFF", DIST_MILES_DEF: "MI DEF", AVG_SPEED: "SPEED", AVG_SPEED_OFF: "SPD OFF", AVG_SPEED_DEF: "SPD DEF", DIST_FEET: "FEET",
  DRIVES: "DRIVES", DRIVE_FGM: "DRV FGM", DRIVE_FGA: "DRV FGA", DRIVE_FG_PCT: "DRV FG%", DRIVE_PTS: "DRV PTS", DRIVE_PTS_PCT: "DRV PTS%", DRIVE_PASSES: "DRV PASS",
  DRIVE_PASSES_PCT: "DRV PASS%", DRIVE_AST: "DRV AST", DRIVE_AST_PCT: "DRV AST%", DRIVE_TOV: "DRV TOV", DRIVE_TOV_PCT: "DRV TOV%", DRIVE_PF: "DRV PF", DRIVE_FTM: "DRV FTM", DRIVE_FTA: "DRV FTA", DRIVE_FT_PCT: "DRV FT%",
  CATCH_SHOOT_FGM: "C&S FGM", CATCH_SHOOT_FGA: "C&S FGA", CATCH_SHOOT_FG_PCT: "C&S FG%", CATCH_SHOOT_PTS: "C&S PTS", CATCH_SHOOT_FG3M: "C&S 3PM", CATCH_SHOOT_FG3A: "C&S 3PA", CATCH_SHOOT_FG3_PCT: "C&S 3P%", CATCH_SHOOT_EFG_PCT: "C&S eFG%",
  PULL_UP_FGM: "PU FGM", PULL_UP_FGA: "PU FGA", PULL_UP_FG_PCT: "PU FG%", PULL_UP_PTS: "PU PTS", PULL_UP_FG3M: "PU 3PM", PULL_UP_FG3A: "PU 3PA", PULL_UP_FG3_PCT: "PU 3P%", PULL_UP_EFG_PCT: "PU eFG%",
  PASSES_MADE: "PASSES", PASSES_RECEIVED: "RECEIVED", FT_AST: "FT AST", SECONDARY_AST: "2ND AST", POTENTIAL_AST: "POT AST", AST_POINTS_CREATED: "AST PTS", AST_ADJ: "ADJ AST", AST_TO_PASS_PCT: "AST/PASS%", AST_TO_PASS_PCT_ADJ: "ADJ AST/PASS%",
  REB_CONTEST: "CONT REB", REB_CHANCES: "REB CHANCES", REB_CHANCE_PCT: "REB CH%", REB_CHANCE_DEFER: "DEFERRED", AVG_REB_DIST: "REB DIST", OREB_CONTEST: "CONT OREB", DREB_CONTEST: "CONT DREB", OREB_CHANCES: "OREB CH", DREB_CHANCES: "DREB CH",
  TOUCHES: "TOUCHES", FRONT_CT_TOUCHES: "FRONT CT", TIME_OF_POSS: "TIME OF POSS", AVG_SEC_PER_TOUCH: "SEC/TOUCH", AVG_DRIB_PER_TOUCH: "DRIB/TOUCH", PTS_PER_TOUCH: "PTS/TOUCH", ELBOW_TOUCHES: "ELBOW", POST_TOUCHES: "POST", PAINT_TOUCHES: "PAINT",
  DEF_RIM_FGM: "RIM FGM", DEF_RIM_FGA: "RIM FGA", DEF_RIM_FG_PCT: "RIM FG%",
  POSS: "POSS", POSS_PCT: "FREQ", PPP: "PPP", PERCENTILE: "PCTL", TOV_POSS_PCT: "TOV%", SF_POSS_PCT: "SF%", PLUSONE_POSS_PCT: "AND1%", SCORE_POSS_PCT: "SCORE%", FT_POSS_PCT: "FT%",
  D_FGM: "D FGM", D_FGA: "D FGA", D_FG_PCT: "D FG%", NORMAL_FG_PCT: "NORMAL FG%", PCT_PLUSMINUS: "DIFF",
  PTS_OFF_TOV: "PTS OFF TO", PTS_2ND_CHANCE: "2ND CH PTS", PTS_FB: "FB PTS", PTS_PAINT: "PAINT PTS",
  PCT_AST_FGM: "AST'D FGM%", PCT_UAST_FGM: "UNAST FGM%", PCT_PTS_PAINT: "% PTS PAINT", PCT_PTS_3PT: "% PTS 3PT", PCT_PTS_FT: "% PTS FT", PCT_PTS_FB: "% PTS FB", PCT_PTS_OFF_TOV: "% PTS OFF TO",
  E_OFF_RATING: "est ORtg", E_DEF_RATING: "est DRtg", E_NET_RATING: "est NET", E_USG_PCT: "est USG", E_PACE: "est PACE", E_AST_RATIO: "est AST R", E_OREB_PCT: "est OREB%", E_DREB_PCT: "est DREB%", E_REB_PCT: "est REB%", E_TOV_PCT: "est TOV%",
};

/** Columns that are identifiers rather than stats. */
export const ID_COLS = new Set([
  "PLAYER_ID", "PLAYER_NAME", "TEAM_ID", "TEAM_ABBREVIATION", "TEAM_NAME", "TEAM_CITY", "NICKNAME", "SEASON_ID", "PLAYER_LAST_TEAM_ID",
  "PLAYER_LAST_TEAM_ABBREVIATION", "PLAYER_POSITION", "CLOSE_DEF_PERSON_ID", "PLAY_TYPE", "TYPE_GROUPING", "GROUP_SET", "GROUP_ID",
  "GROUP_NAME", "VS_PLAYER_ID", "PLAYER_NAME_LAST_FIRST", "W_PCT", "SEASON_YEAR", "GP", "G", "W", "L",
]);

/** NBA.com writes percentages as 0–1 fractions; most other numbers are plain. */
export const isPctCol = (k: string) => /(_PCT|^PCT_|PERCENTILE|^PIE$|POSS_PCT|_FREQUENCY)/.test(k) || /\|FG_PCT$/.test(k);
