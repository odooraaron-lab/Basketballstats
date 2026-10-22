// Resolves NBA.com names/abbreviations to this app's (ESPN-keyed) team and player pages.
//   /nba/go?team=GSW            → /nba/teams/9
//   /nba/go?player=Stephen%20Curry&team=GSW → /nba/players/3975
import { NextResponse } from "next/server";
import { LEAGUES } from "@/leagues/registry";
import { getRoster, getTeams } from "@/lib/espn";
import { espnAbbr, normName } from "@/lib/nbacom";

export async function GET(req: Request, { params }: { params: Promise<{ league: string }> }) {
  const { league: id } = await params;
  const league = LEAGUES[id];
  const url = new URL(req.url);
  if (!league) return NextResponse.redirect(new URL("/", url));
  const teamAbbr = url.searchParams.get("team") ?? "";
  const player = url.searchParams.get("player") ?? "";

  const teams = await getTeams(league);
  const team = teams.find((t) => t.abbr === espnAbbr(teamAbbr) || t.abbr === teamAbbr);

  if (player) {
    const wanted = normName(player);
    const rosters = team ? [await getRoster(league, team.id)] : await Promise.all(teams.map((t) => getRoster(league, t.id)));
    const hit = rosters.flat().find((p) => normName(p.name) === wanted);
    if (hit) return NextResponse.redirect(new URL(`/${league.id}/players/${hit.id}`, url));
    // Traded or not on a current roster — fall back to the leaderboard
    return NextResponse.redirect(new URL(`/${league.id}/players?all=1`, url));
  }
  if (team) return NextResponse.redirect(new URL(`/${league.id}/teams/${team.id}`, url));
  return NextResponse.redirect(new URL(`/${league.id}/teams`, url));
}
