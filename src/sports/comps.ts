// Field-sport competitions (NRL, Super Rugby, A-League, ANZ Premiership). Each one is an
// isolated environment like the basketball leagues: its own data source, ladder rules,
// featured stats and projection settings. Pure data — safe to import from client code.

export type SportKind = "rugby-league" | "rugby" | "soccer" | "netball";

export interface StatDef {
  label: string;
  short: string;
  /** Feed keys that mean this stat, first match wins (feeds name things differently). */
  keys: string[];
  fmt?: "int" | "1" | "pct";
  lowerBetter?: boolean;
  /** Derived stat (e.g. shooting %) from other stats; works on game lines and season totals. */
  calc?: (s: Record<string, number>) => number | null;
  /** A rate/percentage: never divide by games for "per game" views. */
  rate?: boolean;
}

export type SourceDef =
  | { kind: "cd"; nameMatch: string; nameExclude?: string; statDefsPath?: string }
  | { kind: "espn"; sport: string; league: string; startMonth: number; endMonth: number; crossYear: boolean };

export interface PointsRule {
  win: number;
  draw: number;
  loss: number;
  bye?: number;
  /** Bonus point for losing by this many or fewer. */
  lossBonusMargin?: number;
}

export interface CompDef {
  id: string;
  name: string;
  short: string;
  region: string;
  accent: string;
  sport: SportKind;
  source: SourceDef;
  points: PointsRule;
  /** Ladder positions that make the finals. */
  finals: number;
  /** Std. dev. of the final margin, for win chances (points/goals). */
  marginSd: number;
  scoreWord: string; // "pts" or "goals"
  /** Player scoring stat for "anytime" markets (try / goal scorer). */
  scorer?: { keys: string[]; label: string };
  featured: StatDef[];
  teamFeatured: StatDef[];
  siblings?: { id: string; label: string }[];
  periods: number;
  periodName: string;
}

const s = (label: string, short: string, keys: string[], extra: Partial<StatDef> = {}): StatDef => ({ label, short, keys, ...extra });

const pct = (num: number | undefined, den: number | undefined) => (den ? (100 * (num ?? 0)) / den : null);

// NRL — Champion Data match files (every key below is in the real feed)
const NRL_PLAYER: StatDef[] = [
  s("Tries", "T", ["tries"]),
  s("Try assists", "TA", ["tryAssists"]),
  s("Line breaks", "LB", ["lineBreaks"]),
  s("Line-break assists", "LBA", ["lineBreakAssists"]),
  s("Tackle breaks", "TB", ["tackleBreaks"]),
  s("Run metres", "RM", ["runMetres"]),
  s("Runs", "RUN", ["runs"]),
  s("Hit-ups", "HU", ["runsHitup"]),
  s("Post-contact metres", "PCM", ["postContactMetres"]),
  s("Kick-return metres", "KRM", ["runsKickReturnMetres"]),
  s("Metres gained", "MG", ["metresGained"]),
  s("Offloads", "OFF", ["offloads"]),
  s("Passes", "PAS", ["passes"]),
  s("Possessions", "POS", ["possessions"]),
  s("Tackles", "TCK", ["tackles"]),
  s("Missed tackles", "MT", ["missedTackles"], { lowerBetter: true }),
  s("Ineffective tackles", "IT", ["tacklesIneffective"], { lowerBetter: true }),
  s("Tackle %", "TK%", [], { fmt: "1", rate: true, calc: (x) => (x.tackles != null ? pct(x.tackles, (x.tackles ?? 0) + (x.missedTackles ?? 0) + (x.tacklesIneffective ?? 0)) : null) }),
  s("Try saves", "TS", ["trySaves"]),
  s("Kicks", "KCK", ["kicksGeneralPlay"]),
  s("Kick metres", "KM", ["kickMetres"]),
  s("40/20s", "40/20", ["fortyTwenty"]),
  s("Bombs caught", "BC", ["bombKicksCaught"]),
  s("Points", "PTS", ["points"]),
  s("Conversions", "CON", ["conversions"]),
  s("Conversion attempts", "CA", ["conversionAttempts"]),
  s("Penalty goals", "PG", ["penaltyGoals"]),
  s("Field goals", "FG", ["fieldGoals"]),
  s("Errors", "ERR", ["errors"], { lowerBetter: true }),
  s("Penalties conceded", "PEN", ["penaltiesConceded"], { lowerBetter: true }),
  s("Sin bins", "SB", ["sinBins"], { lowerBetter: true }),
];

const NRL_TEAM: StatDef[] = [
  s("Points", "PTS", ["score"]),
  s("Tries", "T", ["tries"]),
  s("Completion %", "CMP%", ["completionRatePercentage"], { fmt: "1", rate: true }),
  s("Possession %", "POS%", ["possessionPercentage"], { fmt: "1", rate: true }),
  s("Completed sets", "SETS", ["completeSets"]),
  s("Run metres", "RM", ["runMetres"]),
  s("Post-contact metres", "PCM", ["postContactMetres"]),
  s("Line breaks", "LB", ["lineBreaks"]),
  s("Tackle breaks", "TB", ["tackleBreaks"]),
  s("Offloads", "OFF", ["offloads"]),
  s("Kick metres", "KM", ["kickMetres"]),
  s("Tackles", "TCK", ["tackles"]),
  s("Missed tackles", "MT", ["missedTackles"], { lowerBetter: true }),
  s("Errors", "ERR", ["errors"], { lowerBetter: true }),
  s("Penalties conceded", "PEN", ["penaltiesConceded"], { lowerBetter: true }),
  s("Set restarts", "SR", ["setRestarts"], { lowerBetter: true }),
  s("Time in opp. 20 (min)", "T20", ["timeInOpp20"], { fmt: "1", calc: (x) => (x.timeInOpp20 != null ? x.timeInOpp20 / 60 : null) }),
];

// Netball — Champion Data match files
const NETBALL_PLAYER: StatDef[] = [
  s("Goals", "G", ["goals"]),
  s("Goal attempts", "ATT", ["goalAttempts"]),
  s("Shooting %", "SH%", [], { fmt: "1", rate: true, calc: (x) => (x.goalAttempts ? pct(x.goals, x.goalAttempts) : null) }),
  s("Super shots", "SS", ["goal2"]),
  s("Super shot attempts", "SSA", ["attempt2"]),
  s("Points", "PTS", ["points"]),
  s("Goal assists", "AST", ["goalAssists"]),
  s("Feeds", "FD", ["feeds"]),
  s("Feeds with attempt", "FWA", ["feedWithAttempt"]),
  s("Centre pass receives", "CPR", ["centrePassReceives"]),
  s("Second-phase receives", "2PR", ["secondPhaseReceive"]),
  s("Gains", "GN", ["gain"]),
  s("Intercepts", "INT", ["intercepts"]),
  s("Deflections", "DEF", ["deflections"]),
  s("Rebounds", "REB", ["rebounds"]),
  s("Pickups", "PU", ["pickups"]),
  s("Penalties", "PEN", ["penalties"], { lowerBetter: true }),
  s("Contact penalties", "CON", ["contactPenalties"], { lowerBetter: true }),
  s("Obstruction penalties", "OBS", ["obstructionPenalties"], { lowerBetter: true }),
  s("Turnovers", "TO", ["generalPlayTurnovers"], { lowerBetter: true }),
  s("Unforced turnovers", "UTO", ["unforcedTurnovers"], { lowerBetter: true }),
  s("Bad passes", "BP", ["badPasses"], { lowerBetter: true }),
  s("Bad hands", "BH", ["badHands"], { lowerBetter: true }),
  s("Minutes", "MIN", ["minutesPlayed"]),
];

const NETBALL_TEAM: StatDef[] = [
  s("Points", "PTS", ["points"]),
  s("Goals", "G", ["goals"]),
  s("Shooting %", "SH%", [], { fmt: "1", rate: true, calc: (x) => (x.goalAttempts ? pct(x.goals, x.goalAttempts) : null) }),
  s("Super shots", "SS", ["goal2"]),
  s("Goals from centre pass", "GCP", ["goalsFromCentrePass"]),
  s("Centre pass to goal %", "CP%", ["centrePassToGoalPerc"], { fmt: "1", rate: true }),
  s("Goals from gains", "GFG", ["goalsFromGain"]),
  s("Gain to goal %", "GG%", ["gainToGoalPerc"], { fmt: "1", rate: true }),
  s("Goals from turnovers", "GFT", ["goalsFromTurnovers"]),
  s("Possession %", "POS%", ["timeInPossession"], { fmt: "1", rate: true }),
  s("Feeds", "FD", ["feeds"]),
  s("Gains", "GN", ["gain"]),
  s("Intercepts", "INT", ["intercepts"]),
  s("Deflections", "DEF", ["deflections"]),
  s("Rebounds", "REB", ["rebounds"]),
  s("Penalties", "PEN", ["penalties"], { lowerBetter: true }),
  s("Turnovers", "TO", ["generalPlayTurnovers"], { lowerBetter: true }),
  s("Unforced turnovers", "UTO", ["unforcedTurnovers"], { lowerBetter: true }),
];

// Super Rugby — ESPN publishes lineups and scoring events only; these are built from them
const RUGBY_PLAYER: StatDef[] = [
  s("Tries", "T", ["tries"]),
  s("Points", "PTS", ["points"]),
  s("Conversions", "CON", ["conversions"]),
  s("Penalty goals", "PG", ["penaltyGoals"]),
  s("Drop goals", "DG", ["dropGoals"]),
  s("Starts", "ST", ["starts"]),
  s("Off the bench", "SUB", ["subIns"]),
  s("Yellow cards", "YC", ["yellowCards"], { lowerBetter: true }),
  s("Red cards", "RC", ["redCards"], { lowerBetter: true }),
];

const RUGBY_TEAM: StatDef[] = [
  s("Points", "PTS", ["points"]),
  s("Tries", "T", ["tries"]),
  s("Conversions", "CON", ["conversions"]),
  s("Penalty goals", "PG", ["penaltyGoals"]),
  s("Drop goals", "DG", ["dropGoals"]),
  s("Yellow cards", "YC", ["yellowCards"], { lowerBetter: true }),
  s("Red cards", "RC", ["redCards"], { lowerBetter: true }),
];

// A-League — ESPN match rosters (15 player stats) and team boxscore
const SOCCER_PLAYER: StatDef[] = [
  s("Goals", "G", ["totalGoals"]),
  s("Assists", "A", ["goalAssists"]),
  s("Shots", "SH", ["totalShots"]),
  s("Shots on target", "SOT", ["shotsOnTarget"]),
  s("Fouls won", "FS", ["foulsSuffered"]),
  s("Fouls", "FC", ["foulsCommitted"], { lowerBetter: true }),
  s("Offsides", "OFS", ["offsides"], { lowerBetter: true }),
  s("Yellow cards", "YC", ["yellowCards"], { lowerBetter: true }),
  s("Red cards", "RC", ["redCards"], { lowerBetter: true }),
  s("Own goals", "OG", ["ownGoals"], { lowerBetter: true }),
  s("Saves", "SV", ["saves"]),
  s("Shots faced", "SF", ["shotsFaced"]),
  s("Goals conceded", "GC", ["goalsConceded"], { lowerBetter: true }),
  s("Appearances", "APP", ["appearances"]),
  s("Sub appearances", "SUB", ["subIns"]),
];

const SOCCER_TEAM: StatDef[] = [
  s("Possession %", "POS", ["possessionPct"], { fmt: "1", rate: true }),
  s("Shots", "SH", ["totalShots"]),
  s("Shots on target", "SOT", ["shotsOnTarget"]),
  s("Corners", "COR", ["wonCorners"]),
  s("Passes", "PAS", ["totalPasses"]),
  s("Accurate passes", "AP", ["accuratePasses"]),
  s("Crosses", "CRS", ["totalCrosses"]),
  s("Long balls", "LB", ["totalLongBalls"]),
  s("Tackles", "TCK", ["totalTackles", "effectiveTackles"]),
  s("Interceptions", "INT", ["interceptions"]),
  s("Clearances", "CLR", ["totalClearance", "effectiveClearance"]),
  s("Saves", "SV", ["saves"]),
  s("Fouls", "FC", ["foulsCommitted"], { lowerBetter: true }),
  s("Yellow cards", "YC", ["yellowCards"], { lowerBetter: true }),
  s("Red cards", "RC", ["redCards"], { lowerBetter: true }),
  s("Offsides", "OFS", ["offsides"], { lowerBetter: true }),
];

export const COMPS: CompDef[] = [
  {
    id: "nrl",
    name: "NRL Telstra Premiership",
    short: "NRL",
    region: "AUS/NZ",
    accent: "#2f8de4",
    sport: "rugby-league",
    source: { kind: "cd", nameMatch: "\\bNRL (Premiership|Finals)\\b", nameExclude: "NRLW|Women|Origin|Country", statDefsPath: "/global/settings/nrl_statistic_definitions.json" },
    points: { win: 2, draw: 1, loss: 0, bye: 2 },
    finals: 8,
    marginSd: 14.5,
    scoreWord: "pts",
    scorer: { keys: ["tries"], label: "try" },
    featured: NRL_PLAYER,
    teamFeatured: NRL_TEAM,
    periods: 2,
    periodName: "Half",
  },
  {
    id: "super-rugby",
    name: "Super Rugby Pacific",
    short: "Super Rugby",
    region: "NZ/AUS",
    accent: "#00a3a1",
    sport: "rugby",
    source: { kind: "espn", sport: "rugby", league: "242041", startMonth: 2, endMonth: 6, crossYear: false },
    points: { win: 4, draw: 2, loss: 0, lossBonusMargin: 7 },
    finals: 6,
    marginSd: 14,
    scoreWord: "pts",
    scorer: { keys: ["tries"], label: "try" },
    featured: RUGBY_PLAYER,
    teamFeatured: RUGBY_TEAM,
    periods: 2,
    periodName: "Half",
  },
  {
    id: "a-league",
    name: "A-League Men",
    short: "A-League",
    region: "AUS/NZ",
    accent: "#ff6b00",
    sport: "soccer",
    source: { kind: "espn", sport: "soccer", league: "aus.1", startMonth: 10, endMonth: 5, crossYear: true },
    points: { win: 3, draw: 1, loss: 0 },
    finals: 6,
    marginSd: 1.6,
    scoreWord: "goals",
    scorer: { keys: ["totalGoals", "goals"], label: "goal" },
    featured: SOCCER_PLAYER,
    teamFeatured: SOCCER_TEAM,
    siblings: [
      { id: "a-league", label: "Men" },
      { id: "a-league-w", label: "Women" },
    ],
    periods: 2,
    periodName: "Half",
  },
  {
    id: "a-league-w",
    name: "A-League Women",
    short: "A-League W",
    region: "AUS/NZ",
    accent: "#ff6b00",
    sport: "soccer",
    source: { kind: "espn", sport: "soccer", league: "aus.w.1", startMonth: 10, endMonth: 5, crossYear: true },
    points: { win: 3, draw: 1, loss: 0 },
    finals: 6,
    marginSd: 1.7,
    scoreWord: "goals",
    scorer: { keys: ["totalGoals", "goals"], label: "goal" },
    featured: SOCCER_PLAYER,
    teamFeatured: SOCCER_TEAM,
    siblings: [
      { id: "a-league", label: "Men" },
      { id: "a-league-w", label: "Women" },
    ],
    periods: 2,
    periodName: "Half",
  },
  {
    id: "anz-premiership",
    name: "ANZ Premiership",
    short: "ANZ Prem",
    region: "NZ netball",
    accent: "#d6336c",
    sport: "netball",
    source: { kind: "cd", nameMatch: "ANZ Premiership", nameExclude: "Pre-?season|Preseason|Trial", statDefsPath: "/global/settings/netball_statistic_definitions.json" },
    points: { win: 3, draw: 0, loss: 0, lossBonusMargin: 5 },
    finals: 3,
    marginSd: 8.5,
    scoreWord: "goals",
    featured: NETBALL_PLAYER,
    teamFeatured: NETBALL_TEAM,
    periods: 4,
    periodName: "Quarter",
  },
];

export const COMP_BY_ID: Record<string, CompDef> = Object.fromEntries(COMPS.map((c) => [c.id, c]));
export const getComp = (id: string) => COMP_BY_ID[id];

/** Buttons for the top switcher (A-League men & women share one). */
export const SWITCH_COMPS = COMPS.filter((c) => c.id !== "a-league-w");

/** Value of a StatDef in a stats record (first key present). */
export function statOf(stats: Record<string, number> | undefined, d: StatDef): number | null {
  if (!stats) return null;
  if (d.calc) {
    const v = d.calc(stats);
    return v != null && Number.isFinite(v) ? v : null;
  }
  for (const k of d.keys) if (typeof stats[k] === "number" && Number.isFinite(stats[k])) return stats[k];
  return null;
}

/** "runMetres" → "Run Metres" for stats we don't have a label for. */
export const humanise = (k: string) =>
  k
    .replace(/([a-z])([A-Z0-9])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bPct\b/, "%");

export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;

/**
 * Per-game value from season totals. Derived rates (shooting %, tackle %) are computed from
 * the totals directly; everything else — including feed percentages, which are summed per
 * game — is divided by games.
 */
export function perGame(totals: Record<string, number>, games: number, d: StatDef): number | null {
  const v = statOf(totals, d);
  if (v == null || !games) return null;
  return d.calc && d.rate ? v : v / games;
}
