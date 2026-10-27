import Link from "next/link";
import { notFound } from "next/navigation";
import { SortableTable, type Column, type Row } from "@/components/SortableTable";
import { FixtureTile } from "@/components/sport/FixtureTile";
import { TeamMark } from "@/components/sport/TeamMark";
import { Card, PageTitle, Stat } from "@/components/ui";
import { fmt } from "@/lib/format";
import { ordinal, perGame, statOf } from "@/sports/comps";
import { getSeasonBook, requireComp, resolveSeason } from "@/sports/data";
import { project } from "@/sports/model";

export const revalidate = 300;
export const maxDuration = 60;

export default async function TeamPage({ params, searchParams }: { params: Promise<{ comp: string; teamId: string }>; searchParams: Promise<{ season?: string }> }) {
  const { comp: compId, teamId } = await params;
  const comp = requireComp(compId);
  const season = await resolveSeason(comp, (await searchParams).season);
  const book = await getSeasonBook(comp, season, true);
  const t = book.teamSides.get(teamId);
  if (!t) notFound();
  const lr = book.ladder.find((r) => r.teamId === teamId);
  const games = book.fixtures.filter((f) => f.home.id === teamId || f.away.id === teamId);
  const results = games.filter((f) => f.state !== "pre").reverse();
  const upcoming = games.filter((f) => f.state === "pre").slice(0, 6);
  const pos = new Map(book.ladder.map((r) => [r.teamId, r.pos]));
  const r = book.ratings;
  const ts = book.teams.find((x) => x.teamId === teamId);

  const players = book.players.filter((p) => p.teamId === teamId);
  const defs = comp.featured.filter((d) => players.some((p) => statOf(p.totals, d) != null));
  const columns: Column[] = [{ key: "gp", label: "GP", fmt: "int" }, ...defs.map((d) => ({ key: d.label, label: d.short, title: `${d.label} (season total)`, fmt: (d.fmt === "1" ? "1" : "int") as Column["fmt"], heat: true, invert: d.lowerBetter }))];
  const rows: Row[] = players.map((p) => ({
    key: p.id,
    lead: { label: p.name, sub: p.position, href: `/sport/${comp.id}/players/${p.id}?season=${season}`, img: p.headshot, imgKind: "player" as const },
    cells: { gp: p.games, ...Object.fromEntries(defs.map((d) => [d.label, statOf(p.totals, d)])) },
  }));
  const first = defs.find((d) => !d.lowerBetter);

  return (
    <div className="space-y-5">
      <PageTitle sub={lr ? `${ordinal(lr.pos)} · ${lr.won}-${comp.sport !== "netball" ? `${lr.drawn}-` : ""}${lr.lost} · ${lr.points} pts` : `${season} season`}>
        <span className="flex items-center gap-3">
          <TeamMark t={t} size={44} /> {t.name}
        </span>
      </PageTitle>
      {lr && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={`${comp.scoreWord} for / game`} value={lr.played ? fmt(lr.pf / lr.played, "1") : "–"} sub={`${lr.pf} total`} />
          <Stat label={`${comp.scoreWord} against / game`} value={lr.played ? fmt(lr.pa / lr.played, "1") : "–"} sub={`${lr.pa} total`} />
          <Stat label="Home / away" value={`${lr.homeRec || "–"} · ${lr.awayRec || "–"}`} />
          <Stat label="Power rating" value={r.n ? fmt((r.att.get(teamId) ?? 0) - (r.def.get(teamId) ?? 0), "signed1") : "–"} sub="net vs average team" tone="accent" />
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="display mb-2 text-lg font-bold text-ink-200">Next up</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((f) => (
              <FixtureTile key={f.id} f={f} ladder={pos} proj={project(r, comp, f.home.id, f.away.id)} />
            ))}
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <Card pad={false} title="Player season stats" right="totals — click a column to sort">
          <SortableTable columns={columns} rows={rows} dense defaultSort={first ? { key: first.label, dir: "desc" } : undefined} />
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Results">
          <ul className="space-y-1.5 text-sm">
            {results.map((f) => {
              const home = f.home.id === teamId;
              const us = home ? f.home : f.away;
              const them = home ? f.away : f.home;
              const res = f.state !== "post" ? "LIVE" : f.winnerId ? (f.winnerId === teamId ? "W" : "L") : "D";
              return (
                <li key={f.id} className="flex items-center gap-2">
                  <span className={`w-9 rounded text-center text-[11px] font-bold ${res === "W" ? "bg-win/25 text-win" : res === "L" ? "bg-loss/25 text-loss" : "bg-ink-700 text-ink-300"}`}>{res}</span>
                  <span className="w-12 shrink-0 text-xs text-ink-500">{f.final ? "Final" : `R${f.round ?? ""}`}</span>
                  <Link href={`/sport/${comp.id}/match/${f.id}?season=${season}`} className="flex flex-1 items-center gap-1.5 truncate hover:text-court">
                    {home ? "v" : "@"} <TeamMark t={them} size={16} /> {them.name}
                  </Link>
                  <span className="num text-xs">{us.score}–{them.score}</span>
                </li>
              );
            })}
            {!results.length && <li className="text-ink-500">No results yet.</li>}
          </ul>
        </Card>
        {ts && (
          <Card title="Team averages per game" right="for · against">
            <table className="w-full text-sm">
              <tbody>
                {comp.teamFeatured
                  .filter((d) => statOf(ts.totals, d) != null)
                  .slice(0, 16)
                  .map((d) => (
                    <tr key={d.label} className="border-b border-ink-850">
                      <td className="py-1 text-ink-300">{d.label}</td>
                      <td className="num py-1 text-right font-semibold">{fmt(perGame(ts.totals, ts.games, d), "1")}</td>
                      <td className="num py-1 text-right text-ink-500">{fmt(perGame(ts.against, ts.games, d), "1")}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
