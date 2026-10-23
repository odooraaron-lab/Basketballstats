import { STANDARD_STAT_DEFINITIONS } from "./definitions";
import type { League } from "./types";

export const NBA: League = {
  id: "nba",
  name: "National Basketball Association",
  shortName: "NBA",
  region: "USA",
  provider: { kind: "espn", sportPath: "nba", seasonStats: "feed" },
  features: { nbaComTracking: true },
  accent: "#f26b1d",
  ladder: { direct: 6, playIn: 10, note: "Solid line: top-6 playoff seeds · dashed: play-in cutoff (7–10)." },
  rules: {
    periods: 4,
    periodMinutes: 12,
    overtimeMinutes: 5,
    shotClock: 24,
    shotClockOffensiveReset: 14,
    foulOutLimit: 6,
    bonusFouls: 5,
    playersOnCourt: 5,
    threePointFt: 23.75,
    cornerThreeFt: 22,
    clutch: { seconds: 300, margin: 5 },
    runningClock: false,
  },
  // Approximate recent NBA league-average FG% by zone (used for xPPS / shot quality).
  zoneBaselines: {
    "Restricted Area": 0.66,
    "Paint (Non-RA)": 0.44,
    "Mid-Range": 0.42,
    "Corner 3": 0.385,
    "Above the Break 3": 0.355,
  },
  statDefinitions: STANDARD_STAT_DEFINITIONS,
};
