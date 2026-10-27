import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamMark } from "@/components/sport/TeamMark";
import { Card, PageTitle, Stat } from "@/components/ui";
import { fmt, fmtDay } from "@/lib/format";
import { perGame, statOf } from "@/sports/comps";
import { getSeasonBook, requireComp, resolveSeason } from "@/sports/data";

export const revalidate = 300;
export const maxDuration = 60;

export default async function PlayerPage({ params, searchParams }: { params: Promise<{ comp: string; playerId: string }>; searchParams: Promise<{ season?: string }> }) {
  const { comp: compId, playerId } = await params;
  const comp = requireComp(compId);
  const season = await resolveSeason(comp, (await searchParams).season);
  const book = await getSeasonBook(comp, season, true);
  const p = book.players.find((x) => x.id === playerId);
  if (!p) notFound();
  const team = book.teamSides.get(p.teamId);
  const defs = comp.featured.filter((d) => statOf(p.totals, d) != null);
  const tiles = defs.filter((d) => !d.lowerBetter).slice(0, 4);
  // League rank per game among regulars
  const regulars = book.players.filter((x) => x.games >= Math.max(2, Math.round(Math.max(...book.players.map((y) => y.games)) * 0.3)));
  const rankOf = (d: (typeof defs)[number]) => {
    const mine = perGame(p.totals, p.games, d) ?? 0;
    const better = (x: number) => (d.lowerBetter ? x < mine : x > mine);
    return 1 + regulars.filter((x) => better(perGame(x.totals, x.games, d) ?? 0)).length;
  };
  const logs = [...p.logs].reverse();
  return (
    <div className="space-y-5">
      <PageTitle sub={[team?.name, p.position, `${p.games} games in ${season}`].filter(Boolean).join(" · ")}>
        <span className="flex items-center gap-3">
          {team && <TeamMark t={team} size={40} />} {p.name}
        </span>
      </PageTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((d) => (
          <Stat key={d.label} label={`${d.label} / game`} value={fmt(perGame(p.totals, p.games, d), "1")} sub={`${d.rate ? "season" : `${fmt(statOf(p.totals, d), "int")} total`} · ${rankOf(d)} of ${regulars.length}`} tone="accent" />
        ))}
      </div>
      <Card pad={false} title="Game log">
        <div className="overflow-x-auto">
          <table className="stat-table compact">
            <thead>
              <tr>
                <th className="!text-left">Date</th>
                <th className="!text-left">Opp</th>
                <th>Res</th>
                {defs.map((d) => (
                  <th key={d.label} title={d.label}>{d.short}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const opp = book.teamSides.get(l.oppId);
                return (
                  <tr key={l.fixtureId}>
                    <td className="!text-left font-sans text-xs">
                      <Link href={`/sport/${comp.id}/match/${l.fixtureId}?season=${season}`} className="hover:text-court">{fmtDay(l.date)}</Link>
                    </td>
                    <td className="!text-left font-sans text-xs">{l.home ? "v" : "@"} {opp?.abbr ?? ""}</td>
                    <td className={l.result === "W" ? "!text-win" : l.result === "L" ? "!text-loss" : ""}>{l.result}</td>
                    {defs.map((d) => (
                      <td key={d.label}>{fmt(statOf(l.stats, d), d.rate || d.fmt === "1" ? "1" : "int")}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="!text-left font-sans" colSpan={3}>Average</td>
                {defs.map((d) => (
                  <td key={d.label}>{fmt(perGame(p.totals, p.games, d), "1")}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
