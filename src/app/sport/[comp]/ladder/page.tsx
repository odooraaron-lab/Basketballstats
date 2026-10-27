import { LadderTable } from "@/components/sport/LadderTable";
import { SeasonChips } from "@/components/sport/SeasonChips";
import { Card, PageTitle } from "@/components/ui";
import { getSeasonBook, getSeasons, requireComp, resolveSeason } from "@/sports/data";
import { fmt } from "@/lib/format";
import { TeamRecord } from "@/components/sport/TeamRecord";

export const revalidate = 120;

export default async function Ladder({ params, searchParams }: { params: Promise<{ comp: string }>; searchParams: Promise<{ season?: string }> }) {
  const comp = requireComp((await params).comp);
  const sp = await searchParams;
  const [season, seasons] = await Promise.all([resolveSeason(comp, sp.season), getSeasons(comp)]);
  if (comp.team) return <TeamRecord comp={comp} season={season} seasons={seasons} />;
  const book = await getSeasonBook(comp, season, false);
  const cross = comp.source.kind === "espn" && comp.source.crossYear;
  const r = book.ratings;
  const power = [...book.ladder]
    .map((row) => ({ row, att: r.att.get(row.teamId) ?? 0, def: r.def.get(row.teamId) ?? 0 }))
    .map((x) => ({ ...x, net: x.att - x.def }))
    .sort((a, b) => b.net - a.net);
  const p = comp.points;
  const rules = [`Win ${p.win}`, comp.sport !== "netball" ? `draw ${p.draw}` : "", p.bye ? `bye ${p.bye}` : "", p.lossBonusMargin != null ? `losing bonus 1 (within ${p.lossBonusMargin})` : ""].filter(Boolean).join(", ");
  return (
    <div className="space-y-5">
      <PageTitle sub={`${book.ladderSource === "official" ? "Official table" : `Built from results — ${rules}`}. Top ${comp.finals} make the finals.`} right={<SeasonChips base={`/sport/${comp.id}/ladder`} seasons={seasons} season={season} crossYear={cross} />}>
        Ladder
      </PageTitle>
      <Card pad={false}>
        <LadderTable comp={comp} rows={book.ladder} season={season} />
      </Card>
      {r.n > 0 && (
        <Card pad={false} title="Power ratings" right="per game vs an average team, home advantage removed">
          <div className="overflow-x-auto">
            <table className="stat-table compact">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="!text-left">Team</th>
                  <th>Attack</th>
                  <th>Defence</th>
                  <th>Net</th>
                  <th>Ladder</th>
                </tr>
              </thead>
              <tbody>
                {power.map((x, i) => (
                  <tr key={x.row.teamId}>
                    <td>{i + 1}</td>
                    <td className="!text-left font-sans">{x.row.team.name}</td>
                    <td className={x.att > 0 ? "!text-win" : "!text-loss"}>{fmt(x.att, "signed1")}</td>
                    <td className={x.def < 0 ? "!text-win" : "!text-loss"}>{fmt(-x.def, "signed1")}</td>
                    <td className="font-semibold !text-ink-100">{fmt(x.net, "signed1")}</td>
                    <td>{x.row.pos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-[11px] text-ink-500">
            Attack = {comp.scoreWord} scored above average; defence = {comp.scoreWord} kept out. Average team scores {fmt(r.base, "1")}; home edge {fmt(r.homeAdv, "1")}.
          </p>
        </Card>
      )}
    </div>
  );
}
