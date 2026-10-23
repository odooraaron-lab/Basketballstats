import { OddsCheck } from "@/components/OddsCheck";
import { PageTitle } from "@/components/ui";
import { getLeague } from "@/leagues/registry";

export default async function OddsPage({ params }: { params: Promise<{ league: string }> }) {
  const { league: id } = await params;
  const league = getLeague(id);
  return (
    <div>
      <PageTitle sub="Upload a screenshot of player props — we read the names, lines and odds and check them against each player's real history.">
        Odds check
      </PageTitle>
      <OddsCheck league={league.id} />
    </div>
  );
}
