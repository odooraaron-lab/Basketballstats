import Link from "next/link";
import { Card, Empty, GameTile, PageTitle, Stat } from "@/components/ui";
import { getLeague } from "@/leagues/registry";
import { espnDate, getScoreboard } from "@/lib/espn";
import { espnDayLabel, fmt, shiftEspnDay } from "@/lib/format";
import { getLeagueTable, projectGame, resolveSeason } from "@/lib/league";

export const revalidate = 30;

export default async function GamesPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { league: id } = await params;
  const league = getLeague(id);
  const { date: q } = await searchParams;
  const today = espnDate(new Date());
  const date = q && /^\d{8}$/.test(q) ? q : today;

  const [games, sel] = await Promise.all([getScoreboard(league, date), resolveSeason(league, undefined)]);
  let table = await getLeagueTable(league, sel.year, 2);
  if (!table.averages) table = await getLeagueTable(league, sel.year - 1, 2);
  const rowMap = new Map(table.rows.map((r) => [r.team.id, r]));

  const finals = games.filter((g) => g.state === "post");
  const totals = finals.map((g) => (g.home.score ?? 0) + (g.away.score ?? 0));
  const avgTotal = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
  const margins = finals.map((g) => Math.abs((g.home.score ?? 0) - (g.away.score ?? 0)));
  const homeWins = finals.filter((g) => (g.home.score ?? 0) > (g.away.score ?? 0)).length;

  const week = Array.from({ length: 9 }, (_, i) => shiftEspnDay(date, i - 4));

  return (
    <div className="space-y-5">
      <PageTitle sub="US Eastern game days · tip-off times shown in NZ time">Games</PageTitle>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <Link href={`/${league.id}/games?date=${shiftEspnDay(date, -7)}`} className="chip">
          ‹‹
        </Link>
        {week.map((d) => (
          <Link
            key={d}
            href={`/${league.id}/games?date=${d}`}
            className={`chip shrink-0 flex-col !items-center !px-3 !py-1 ${d === date ? "!border-court !text-court" : ""}`}
          >
            <span className="display text-[10px]">{espnDayLabel(d).split(" ")[0].slice(0, 3)}</span>
            <span className="num">
              {Number(d.slice(6, 8))}/{Number(d.slice(4, 6))}
            </span>
          </Link>
        ))}
        <Link href={`/${league.id}/games?date=${shiftEspnDay(date, 7)}`} className="chip">
          ››
        </Link>
        {date !== today && (
          <Link href={`/${league.id}/games`} className="chip ml-2 !border-court !text-court">
            Today
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Games" value={games.length} sub={espnDayLabel(date)} />
        <Stat label="Avg total (finals)" value={fmt(avgTotal, "1")} tone="accent" sub={table.averages ? `Season avg ${fmt(table.averages.total, "1")}` : undefined} />
        <Stat label="Avg margin" value={fmt(margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : null, "1")} />
        <Stat label="Home wins" value={finals.length ? `${homeWins}/${finals.length}` : "–"} />
      </div>

      <Card title={espnDayLabel(date)}>
        {games.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {games.map((g) => (
              <GameTile key={g.id} g={g} league={league.id} projection={projectGame(g, rowMap)} />
            ))}
          </div>
        ) : (
          <Empty>No games on this day.</Empty>
        )}
      </Card>
    </div>
  );
}
