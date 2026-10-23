import Link from "next/link";
import { Suspense } from "react";
import { ScanLoading } from "@/components/ScanLoading";
import { ScanReportView } from "@/components/ScanReport";
import { Empty, PageTitle } from "@/components/ui";
import { getLeague } from "@/leagues/registry";
import { espnDate, getScoreboard } from "@/lib/espn";
import { espnDayLabel, shiftEspnDay } from "@/lib/format";
import { resolveSeason } from "@/lib/league";
import { runScan } from "@/lib/scan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { league: id } = await params;
  const { date: q } = await searchParams;
  const league = getLeague(id);
  const date = q && /^\d{8}$/.test(q) ? q : espnDate(new Date());
  const games = await getScoreboard(league, date);
  const upcoming = games.filter((g) => g.state !== "post");

  return (
    <div className="space-y-4">
      <PageTitle sub={`${espnDayLabel(date)} · ${games.length} games`}>Stat scan</PageTitle>
      <div className="flex flex-wrap gap-1.5">
        {[-1, 0, 1, 2].map((d) => {
          const day = shiftEspnDay(espnDate(new Date()), d);
          return (
            <Link key={day} href={`/${league.id}/scan?date=${day}`} className={`chip ${day === date ? "!border-court !text-court" : "hover:text-ink-100"}`}>
              {d === 0 ? "Today" : d === 1 ? "Tomorrow" : d === -1 ? "Yesterday" : espnDayLabel(day).split(",")[0]}
            </Link>
          );
        })}
      </div>
      {games.length ? (
        <Suspense key={date} fallback={<ScanLoading scope="day" />}>
          <Report leagueId={league.id} games={upcoming.length ? upcoming : games} />
        </Suspense>
      ) : (
        <Empty>No games on this day.</Empty>
      )}
    </div>
  );

  async function Report({ leagueId, games }: { leagueId: string; games: Awaited<ReturnType<typeof getScoreboard>> }) {
    const cur = await resolveSeason(league, undefined);
    const report = await runScan(league, games, cur.year, "day");
    return <ScanReportView report={report} league={leagueId} />;
  }
}
