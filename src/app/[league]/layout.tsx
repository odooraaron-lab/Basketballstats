import { LeagueSwitch } from "@/components/LeagueSwitch";
import { Nav } from "@/components/Nav";
import { BetSlip } from "@/components/BetSlip";
import { LEAGUE_LIST, getLeague } from "@/leagues/registry";

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ league: string }>;
}) {
  const { league: id } = await params;
  const league = getLeague(id);
  const options = LEAGUE_LIST.map((l) => ({
    id: l.id,
    shortName: l.shortName,
    name: l.name,
    region: l.region,
    accent: l.accent,
    tracking: l.features.nbaComTracking,
  }));
  return (
    <div style={{ ["--accent" as string]: league.accent }}>
      <LeagueSwitch current={league.id} leagues={options} />
      <Nav league={league.id} accent={league.accent} shortName={league.shortName} tracking={league.features.nbaComTracking} />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <BetSlip />
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-ink-600">
        Data: ESPN public feeds, refreshed automatically.{" "}
        {league.provider.seasonStats === "boxscores"
          ? "Season stats, averages and leaderboards are built in-app from every completed game's box score. "
          : ""}
        Advanced metrics are calculated in-app. Personal use only.
      </footer>
    </div>
  );
}
