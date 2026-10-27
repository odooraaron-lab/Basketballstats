// Everything a signed-in section layout needs: the paywall check plus the top switcher's props.
import "server-only";
import { LEAGUE_LIST } from "@/leagues/registry";
import { requireMember, requireViewer } from "./session";

const leagueOptions = () =>
  LEAGUE_LIST.map((l) => ({ id: l.id, shortName: l.shortName, name: l.name, region: l.region, accent: l.accent, tracking: l.features.nbaComTracking }));

export async function memberShell(next: string) {
  const viewer = await requireMember(next);
  const hidden = viewer.prefs.hidden ?? [];
  return { viewer, hidden, switchProps: { leagues: leagueOptions(), hidden, isAdmin: viewer.isAdmin } };
}

/** Signed in but not necessarily paid (account & billing pages). */
export async function viewerShell(next: string) {
  const viewer = await requireViewer(next);
  const hidden = viewer.prefs.hidden ?? [];
  return { viewer, hidden, switchProps: { leagues: leagueOptions(), hidden, isAdmin: viewer.isAdmin } };
}
