// A League is a fully isolated environment: its own teams, players, games, rules and
// stat definitions. Nothing is shared between leagues — every route, cache key and ID is
// scoped by league id (e.g. /nba/players/3945274), so the same numeric player ID in two
// leagues can never collide or mix on a leaderboard.

export interface RuleSet {
  /** Regulation periods (4 quarters, or 2 halves). */
  periods: number;
  /** Minutes per regulation period. */
  periodMinutes: number;
  /** Minutes per overtime period. */
  overtimeMinutes: number;
  /** Shot clock in seconds (null for no shot clock). */
  shotClock: number | null;
  /** Shot clock reset after an offensive rebound, if different. */
  shotClockOffensiveReset: number | null;
  /** Personal fouls before a player is disqualified. */
  foulOutLimit: number;
  /** Team fouls in a period before the opponent is in the bonus. */
  bonusFouls: number;
  /** Players on the floor per team. */
  playersOnCourt: number;
  /** Three-point line distance (feet) above the break and in the corner. */
  threePointFt: number;
  cornerThreeFt: number;
  /** Clutch definition: final N seconds of regulation/OT with margin <= M. */
  clutch: { seconds: number; margin: number };
  /** Clock stops on made baskets late in games (informational). */
  runningClock: boolean;
}

export type ShotZone = "Restricted Area" | "Paint (Non-RA)" | "Mid-Range" | "Corner 3" | "Above the Break 3";

export const SHOT_ZONES: ShotZone[] = [
  "Restricted Area",
  "Paint (Non-RA)",
  "Mid-Range",
  "Corner 3",
  "Above the Break 3",
];

export interface StatDefinition {
  key: string;
  label: string;
  name: string;
  formula?: string;
  description: string;
}

export interface League {
  id: string; // url slug, e.g. "nba"
  name: string;
  shortName: string;
  /** Data provider id + provider-specific league key. */
  provider: { kind: "espn"; sportPath: string };
  rules: RuleSet;
  /** League-average FG% by shot zone, used for expected points per shot (xPPS). */
  zoneBaselines: Record<ShotZone, number>;
  /** Colour used to visually separate this league in the UI. */
  accent: string;
  statDefinitions: StatDefinition[];
}
