import { STANDARD_STAT_DEFINITIONS } from "./definitions.ts";
import type { League } from "./types.ts";

// Australia/New Zealand National Basketball League — FIBA rules.
// ESPN publishes NBL box scores and play-by-play but not season aggregates, so team
// season stats, player averages, game logs and leaderboards are built in-app from every
// completed game (see src/lib/boxSeason.ts).
export const NBL: League = {
  id: "nbl",
  name: "National Basketball League",
  shortName: "NBL",
  region: "NZ & AUS",
  provider: { kind: "espn", sportPath: "nbl", seasonStats: "boxscores" },
  features: { nbaComTracking: false },
  accent: "#2bb3a3",
  ladder: { direct: 2, playIn: 6, note: "Solid line: top 2 go straight to the semi-finals · dashed: play-in (3–6)." },
  rules: {
    periods: 4,
    periodMinutes: 10,
    overtimeMinutes: 5,
    shotClock: 24,
    shotClockOffensiveReset: 14,
    foulOutLimit: 5,
    bonusFouls: 5, // penalty free throws from the 5th team foul in a quarter
    playersOnCourt: 5,
    threePointFt: 22.15, // 6.75 m
    cornerThreeFt: 21.65, // 6.60 m
    clutch: { seconds: 300, margin: 5 },
    runningClock: false,
  },
  // Approximate NBL league-average FG% by zone (used for xPPS / shot quality).
  zoneBaselines: {
    "Restricted Area": 0.62,
    "Paint (Non-RA)": 0.42,
    "Mid-Range": 0.39,
    "Corner 3": 0.37,
    "Above the Break 3": 0.345,
  },
  statDefinitions: STANDARD_STAT_DEFINITIONS.map((d) =>
    d.key === "pace" ? { ...d, formula: "Possessions per 40 minutes; Poss ≈ FGA − ORB + TOV + 0.44·FTA" } : d,
  ),
};
