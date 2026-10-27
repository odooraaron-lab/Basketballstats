// "Record" tab for a national team: results against every nation over the last few years,
// split by competition, with recent head-to-head form — handy for head-to-head and line bets.
import Link from "next/link";
import { SeasonChips } from "@/components/sport/SeasonChips";
import { TeamMark } from "@/components/sport/TeamMark";
import { record, resultChip, sides } from "@/components/sport/TeamHome";
import { Card, PageTitle } from "@/components/ui";
import { fmt } from "@/lib/format";
import type { CompDef } from "@/sports/comps";
import { getFixtures } from "@/sports/data";
import type { Fixture } from "@/sports/model";

export async function TeamRecord({ comp, season, seasons }: { comp: CompDef; season: number; seasons: number[] }) {
  const team = comp.team!.id;
  const years = seasons.filter((y) => y <= season);
  const all = (await Promise.all(years.map((y) => getFixtures(comp, y).catch(() => [] as Fixture[])))).flat().filter((f) => f.state === "post");
  const span = years.length ? `${years[years.length - 1]}–${years[0]}` : String(season);

  const byOpp = new Map<string, Fixture[]>();
  for (const f of all) {
    const them = sides(f, team).them;
    byOpp.set(them.id, [...(byOpp.get(them.id) ?? []), f]);
  }
  const opps = [...byOpp.entries()]
    .map(([id, fx]) => {
      const sorted = fx.sort((a, b) => (a.date < b.date ? 1 : -1));
      return { id, side: sides(sorted[0], team).them, fx: sorted, r: record(sorted, team) };
    })
    .sort((a, b) => b.r.p - a.r.p || a.side.name.localeCompare(b.side.name));

  const byComp = new Map<string, Fixture[]>();
  for (const f of all) {
    const k = (f.stage ?? "Test").replace(/^Bledisloe Cup · /, "").replace(/ · .*$/, "");
    byComp.set(k, [...(byComp.get(k) ?? []), f]);
  }
  const total = record(all, team);

  return (
    <div className="space-y-5">
      <PageTitle sub={`Every completed test ${span} (ESPN keeps four years). Pick a year to end the range there.`} right={<SeasonChips base={`/sport/${comp.id}/ladder`} seasons={seasons} season={season} />}>
        Record v every nation
      </PageTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-3">
          <div className="display text-[11px] text-ink-500">Tests</div>
          <div className="num text-xl font-semibold">{total.p}</div>
        </div>
        <div className="card p-3">
          <div className="display text-[11px] text-ink-500">Won</div>
          <div className="num text-xl font-semibold text-win">{total.w} <span className="text-sm text-ink-500">{total.p ? fmt(total.w / total.p, "pct0") : ""}</span></div>
        </div>
        <div className="card p-3">
          <div className="display text-[11px] text-ink-500">Avg score</div>
          <div className="num text-xl font-semibold">{total.p ? `${fmt(total.pf / total.p, "1")}–${fmt(total.pa / total.p, "1")}` : "–"}</div>
        </div>
        <div className="card p-3">
          <div className="display text-[11px] text-ink-500">Avg margin</div>
          <div className="num text-xl font-semibold">{total.p ? fmt((total.pf - total.pa) / total.p, "signed1") : "–"}</div>
        </div>
      </div>

      <Card pad={false} title="By opponent" right="most recent first">
        <div className="overflow-x-auto">
          <table className="stat-table">
            <thead>
              <tr>
                <th className="!text-left">Opponent</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>Win %</th>
                <th>For</th>
                <th>Against</th>
                <th>Avg margin</th>
                <th className="!text-left">Recent</th>
              </tr>
            </thead>
            <tbody>
              {opps.map((o) => (
                <tr key={o.id}>
                  <td className="!text-left font-sans">
                    <Link href={`/sport/${comp.id}/teams/${o.id}?season=${season}`} className="flex items-center gap-2 whitespace-nowrap hover:text-court">
                      <TeamMark t={o.side} size={18} />
                      {o.side.name}
                    </Link>
                  </td>
                  <td>{o.r.p}</td>
                  <td className="!text-win">{o.r.w}</td>
                  <td>{o.r.d}</td>
                  <td className="!text-loss">{o.r.l}</td>
                  <td className="font-semibold !text-ink-100">{fmt(o.r.w / o.r.p, "pct0")}</td>
                  <td>{fmt(o.r.pf / o.r.p, "1")}</td>
                  <td>{fmt(o.r.pa / o.r.p, "1")}</td>
                  <td className={o.r.pf >= o.r.pa ? "!text-win" : "!text-loss"}>{fmt((o.r.pf - o.r.pa) / o.r.p, "signed1")}</td>
                  <td className="!text-left">
                    <div className="flex gap-1">
                      {o.fx.slice(0, 6).map((f) => {
                        const s = sides(f, team);
                        return (
                          <Link key={f.id} href={`/sport/${comp.id}/match/${f.id}?season=${f.season}`} title={`${f.date.slice(0, 10)} ${s.us.score}–${s.them.score}`}>
                            {resultChip(s.result)}
                          </Link>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card pad={false} title="By competition">
        <div className="overflow-x-auto">
          <table className="stat-table">
            <thead>
              <tr>
                <th className="!text-left">Competition</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>Win %</th>
                <th>Avg score</th>
              </tr>
            </thead>
            <tbody>
              {[...byComp.entries()].map(([k, fx]) => {
                const r = record(fx, team);
                return (
                  <tr key={k}>
                    <td className="!text-left font-sans">{k}</td>
                    <td>{r.p}</td>
                    <td className="!text-win">{r.w}</td>
                    <td>{r.d}</td>
                    <td className="!text-loss">{r.l}</td>
                    <td className="font-semibold !text-ink-100">{fmt(r.w / r.p, "pct0")}</td>
                    <td>{`${fmt(r.pf / r.p, "1")}–${fmt(r.pa / r.p, "1")}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
