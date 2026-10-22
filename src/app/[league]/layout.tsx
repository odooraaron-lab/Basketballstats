import { Nav } from "@/components/Nav";
import { getLeague } from "@/leagues/registry";

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ league: string }>;
}) {
  const { league: id } = await params;
  const league = getLeague(id);
  return (
    <div style={{ ["--accent" as string]: league.accent }}>
      <Nav league={league.id} accent={league.accent} shortName={league.shortName} />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-ink-600">
        Data: ESPN public feeds, refreshed automatically. Advanced metrics are calculated in-app. Personal use only.
      </footer>
    </div>
  );
}
