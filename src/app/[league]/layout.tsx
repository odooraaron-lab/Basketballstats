import { LeagueSwitch } from "@/components/LeagueSwitch";
import { Nav } from "@/components/Nav";
import { BetSlip } from "@/components/BetSlip";
import { getLeague } from "@/leagues/registry";
import { memberShell } from "@/lib/appShell";

export const metadata = { robots: { index: false, follow: false } };

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ league: string }>;
}) {
  const { league: id } = await params;
  const league = getLeague(id);
  const { hidden, switchProps } = await memberShell(`/${league.id}`);
  return (
    <div style={{ ["--accent" as string]: league.accent }}>
      <LeagueSwitch current={league.id} {...switchProps} />
      <Nav league={league.id} accent={league.accent} shortName={league.shortName} tracking={league.features.nbaComTracking && !hidden.includes("tracking")} odds={!hidden.includes("odds")} />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      {!hidden.includes("multi") && <BetSlip />}
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-ink-600">
        Data: ESPN public feeds, refreshed automatically.{" "}
        {league.provider.seasonStats === "boxscores"
          ? "Season stats, averages and leaderboards are built in-app from every completed game's box score. "
          : ""}
        Advanced metrics are calculated in-app.
      </footer>
    </div>
  );
}
