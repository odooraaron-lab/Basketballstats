import { notFound } from "next/navigation";
import { NBA } from "./nba";
import type { League } from "./types";

// Register leagues here. Each entry is an isolated environment.
// To add another ESPN-covered league later (e.g. WNBA) copy nba.ts, set
// provider.sportPath to "wnba" and its rules (4×10 min, 24s clock, 5 min OT).
export const LEAGUES: Record<string, League> = {
  [NBA.id]: NBA,
};

export const DEFAULT_LEAGUE = NBA.id;

export function getLeague(id: string): League {
  const league = LEAGUES[id];
  if (!league) notFound();
  return league;
}
