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

const NRL_PLAYER: StatDef[] = [
  s("Tries", "T", ["tries"]),
  s("Points", "PTS", ["points"]),
  s("Run metres", "RM", ["runMetres", "allRunMetres", "metresGained"]),
  s("Runs", "RUN", ["allRuns", "runs", "hitUps"]),
  s("Line breaks", "LB", ["lineBreaks"]),
  s("Line-break assists", "LBA", ["lineBreakAssists"]),
  s("Try assists", "TA", ["tryAssists"]),
  s("Tackle breaks", "TB", ["tackleBreaks", "brokenTackles"]),
  s("Offloads", "OFF", ["offloads"]),
  s("Post-contact metres", "PCM", ["postContactMetres"]),
  s("Tackles", "TCK", ["tacklesMade", "tackles"]),
  s("Missed tackles", "MT", ["missedTackles", "tacklesMissed"], { lowerBetter: true }),
  s("Kick metres", "KM", ["kickMetres"]),
  s("Goals", "G", ["goals", "conversions"]),
  s("Errors", "ERR", ["errors", "handlingErrors"], { lowerBetter: true }),
  s("Penalties conceded", "PEN", ["penaltiesConceded", "penalties"], { lowerBetter: true }),
  s("Fantasy", "FAN", ["fantasyPoints", "supercoachPoints"]),
];

const NETBALL_PLAYER: StatDef[] = [
  s("Goals", "G", ["goals", "goalsTotal"]),
  s("Goal attempts", "GA", ["goalAttempts"]),
  s("Super shots", "SS", ["goal2", "superShots"]),
  s("Goal assists", "AST", ["goalAssists"]),
  s("Feeds", "FD", ["feeds"]),
  s("Centre pass receives", "CPR", ["centrePassReceives"]),
  s("Gains", "GN", ["gain", "gains"]),
  s("Intercepts", "INT", ["intercepts"]),
  s("Deflections", "DEF", ["deflections"]),
  s("Rebounds", "REB", ["rebounds"]),
  s("Pickups", "PU", ["pickups"]),
  s("Penalties", "PEN", ["penalties"], { lowerBetter: true }),
  s("Turnovers", "TO", ["generalPlayTurnovers", "turnovers"], { lowerBetter: true }),
  s("Nissan Net Points", "NP", ["netPoints", "nissanNetPoints"], { fmt: "1" }),
];

const RUGBY_PLAYER: StatDef[] = [
  s("Tries", "T", ["tries"]),
  s("Points", "PTS", ["points"]),
  s("Try assists", "TA", ["tryAssists"]),
  s("Carries", "CAR", ["carries", "runs"]),
  s("Metres", "M", ["metres", "metresRun", "metresCarried", "runMetres"]),
  s("Clean breaks", "CB", ["cleanBreaks", "lineBreaks", "linebreaks"]),
  s("Defenders beaten", "DB", ["defendersBeaten"]),
  s("Offloads", "OFF", ["offload", "offloads"]),
  s("Tackles", "TCK", ["tackles", "totalTackles"]),
  s("Missed tackles", "MT", ["missedTackles"], { lowerBetter: true }),
  s("Turnovers won", "TW", ["turnoversWon", "turnoverWon"]),
  s("Lineouts won", "LO", ["lineoutsWon", "lineOutWon"]),
  s("Conversions", "CON", ["conversionGoals", "conversions"]),
  s("Penalty goals", "PG", ["penaltyGoals"]),
  s("Penalties conceded", "PEN", ["penaltiesConceded"], { lowerBetter: true }),
  s("Yellow cards", "YC", ["yellowCards"], { lowerBetter: true }),
];

const SOCCER_PLAYER: StatDef[] = [
  s("Goals", "G", ["totalGoals", "goals"]),
  s("Assists", "A", ["goalAssists", "assists"]),
  s("Shots", "SH", ["totalShots", "shotsTotal"]),
  s("Shots on target", "SOT", ["shotsOnTarget"]),
  s("Saves", "SV", ["saves"]),
  s("Fouls", "FC", ["foulsCommitted"], { lowerBetter: true }),
  s("Fouls won", "FS", ["foulsSuffered"]),
  s("Offsides", "OFS", ["offsides"], { lowerBetter: true }),
  s("Yellow cards", "YC", ["yellowCards"], { lowerBetter: true }),
  s("Red cards", "RC", ["redCards"], { lowerBetter: true }),
  s("Appearances (sub)", "SUB", ["subIns"]),
];

const SOCCER_TEAM: StatDef[] = [
  s("Possession %", "POS", ["possessionPct"], { fmt: "1" }),
  s("Shots", "SH", ["totalShots"]),
  s("Shots on target", "SOT", ["shotsOnTarget"]),
  s("Corners", "COR", ["wonCorners", "corners"]),
  s("Passes", "PAS", ["totalPasses", "accuratePasses"]),
  s("Fouls", "FC", ["foulsCommitted"], { lowerBetter: true }),
  s("Yellow cards", "YC", ["yellowCards"], { lowerBetter: true }),
  s("Offsides", "OFS", ["offsides"], { lowerBetter: true }),
  s("Saves", "SV", ["saves"]),
  s("Tackles won", "TKW", ["effectiveTackles", "totalTackles"]),
];

export const COMPS: CompDef[] = [
  {
    id: "nrl",
    name: "NRL Telstra Premiership",
    short: "NRL",
    region: "AUS/NZ",
    accent: "#2f8de4",
    sport: "rugby-league",
    source: { kind: "cd", nameMatch: "^NRL Premiership|^Telstra Premiership|^NRL Telstra", nameExclude: "NRLW|Women|State of Origin", statDefsPath: "/global/settings/nrl_statistic_definitions.json" },
    points: { win: 2, draw: 1, loss: 0, bye: 2 },
    finals: 8,
    marginSd: 14.5,
    scoreWord: "pts",
    scorer: { keys: ["tries"], label: "try" },
    featured: NRL_PLAYER,
    teamFeatured: NRL_PLAYER.filter((d) => !["Fantasy"].includes(d.label)),
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
    teamFeatured: RUGBY_PLAYER,
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
    source: { kind: "cd", nameMatch: "ANZ Premiership", nameExclude: "Pre-?season|Preseason|Trial" },
    points: { win: 3, draw: 0, loss: 0, lossBonusMargin: 5 },
    finals: 3,
    marginSd: 8.5,
    scoreWord: "goals",
    featured: NETBALL_PLAYER,
    teamFeatured: NETBALL_PLAYER,
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
