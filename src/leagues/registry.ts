import { notFound } from "next/navigation";
import { NBA } from "./nba";
import { NBL } from "./nbl";
import type { League } from "./types";

// Register leagues here. Each entry is an isolated environment. Order = order in the
// league switcher at the top of every page.
export const LEAGUES: Record<string, League> = {
  [NBA.id]: NBA,
  [NBL.id]: NBL,
};

export const LEAGUE_LIST: League[] = Object.values(LEAGUES);

export const DEFAULT_LEAGUE = NBA.id;

export function getLeague(id: string): League {
  const league = LEAGUES[id];
  if (!league) notFound();
  return league;
}
