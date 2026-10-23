import Link from "next/link";
import { TeamLogo } from "@/components/Img";
import { Card, Empty, PageTitle, SeasonPicker } from "@/components/ui";
import { getLeague } from "@/leagues/registry";
import { getStandings } from "@/lib/espn";
import { fmt } from "@/lib/format";
import { resolveSeason } from "@/lib/league";

export const revalidate = 600;

export default async function StandingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ season?: string; type?: string }>;
}) {
  const { league: id } = await params;
  const league = getLeague(id);
  const sel = await resolveSeason(league, await searchParams);
  const standings = await getStandings(league, sel.year);
  const confs = [...new Set(standings.map((s) => s.conference))];

  return (
    <div className="space-y-6">
      <PageTitle
        sub={`${league.shortName} · ${sel.label}`}
        right={<SeasonPicker base={`/${league.id}/standings`} current={sel.current} year={sel.year} type={2} />}
      >
        Standings
      </PageTitle>
      {!standings.length && <Empty>No standings available for this season.</Empty>}
      <div className={`grid gap-6 ${confs.length > 1 ? "xl:grid-cols-2" : ""}`}>
        {confs.map((c) => {
          const rows = standings
            .filter((s) => s.conference === c)
            .sort((a, b) => (a.seed || 99) - (b.seed || 99) || b.pct - a.pct);
          return (
            <Card key={c || "ladder"} title={c ? `${c}ern Conference`.replace("ernern", "ern") : `${league.shortName} ladder`} pad={false}>
              <div className="overflow-x-auto">
                <table className="stat-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>W</th>
                      <th>L</th>
                      <th>PCT</th>
                      <th>GB</th>
                      <th>HOME</th>
                      <th>AWAY</th>
                      {c && <th>CONF</th>}
                      <th>L10</th>
                      <th>STRK</th>
                      <th>PPG</th>
                      <th>OPP</th>
                      <th>DIFF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s, i) => (
                      <tr key={s.team.id} className={i === league.ladder.direct - 1 ? "[&>td]:border-b [&>td]:border-b-ink-600" : i === league.ladder.playIn - 1 ? "[&>td]:border-b [&>td]:border-dashed [&>td]:border-b-ink-600" : ""}>
                        <td>
                          <Link href={`/${league.id}/teams/${s.team.id}`} className="flex items-center gap-2 font-sans hover:text-court">
                            <span className="num w-5 text-xs text-ink-500">{s.seed || i + 1}</span>
                            <TeamLogo src={s.team.logo} alt={s.team.abbr} size={20} />
                            {s.team.shortName}
                          </Link>
                        </td>
                        <td>{s.wins}</td>
                        <td>{s.losses}</td>
                        <td>{fmt(s.pct, "3")}</td>
                        <td>{s.gb ? fmt(s.gb, "1") : "–"}</td>
                        <td>{s.home}</td>
                        <td>{s.road}</td>
                        {c && <td>{s.confRecord}</td>}
                        <td>{s.last10}</td>
                        <td className={s.streak.startsWith("W") ? "!text-win" : s.streak.startsWith("L") ? "!text-loss" : ""}>{s.streak}</td>
                        <td>{fmt(s.ppg, "1")}</td>
                        <td>{fmt(s.oppg, "1")}</td>
                        <td className={s.diff >= 0 ? "!text-win" : "!text-loss"}>{fmt(s.diff, "signed1")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-2 text-[11px] text-ink-500">{league.ladder.note}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
