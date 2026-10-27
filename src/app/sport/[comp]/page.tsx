import { SeasonNotice } from "@/components/SeasonNotice";
import Link from "next/link";
import { Suspense } from "react";
import { FixtureTile } from "@/components/sport/FixtureTile";
import { LadderTable } from "@/components/sport/LadderTable";
import { SeasonChips, seasonName } from "@/components/sport/SeasonChips";
import { TeamMark } from "@/components/sport/TeamMark";
import { Card, Empty, PageTitle, Stat } from "@/components/ui";
import { fmt } from "@/lib/format";
import { statOf } from "@/sports/comps";
import { currentRound, getSeasonBook, getSeasons, requireComp, resolveSeason, roundKey } from "@/sports/data";
import { project } from "@/sports/model";
import { TeamHome } from "@/components/sport/TeamHome";

export const revalidate = 60;
export const maxDuration = 60;

export default async function SportHome({ params, searchParams }: { params: Promise<{ comp: string }>; searchParams: Promise<{ season?: string }> }) {
  const comp = requireComp((await params).comp);
  const sp = await searchParams;
  const [season, seasons] = await Promise.all([resolveSeason(comp, sp.season), getSeasons(comp)]);
  const book = await getSeasonBook(comp, season, false);
  if (comp.team) return <TeamHome comp={comp} book={book} season={season} seasons={seasons} />;
  const cross = comp.source.kind === "espn" && comp.source.crossYear;
  const fx = book.fixtures;
  const rk = currentRound(fx);
  const roundFx = rk ? fx.filter((f) => roundKey(f) === rk) : [];
  const done = fx.filter((f) => f.state === "post");
  const pos = new Map(book.ladder.map((r) => [r.teamId, r.pos]));
  const avgTotal = done.length ? done.reduce((s, f) => s + (f.home.score ?? 0) + (f.away.score ?? 0), 0) / done.length : null;
  const homeWin = done.length ? done.filter((f) => f.winnerId === f.home.id).length / done.length : null;
  const next = fx.find((f) => f.state === "pre");

  return (
    <div className="space-y-6">
      <SeasonNotice id={comp.id === "a-league-w" ? "a-league-w" : comp.id} />
      <PageTitle
        sub={`${seasonName(season, cross)} season · ${done.length} of ${fx.length} matches played${!next && fx.length ? " · season complete" : ""}`}
        right={<SeasonChips base={`/sport/${comp.id}`} seasons={seasons} season={season} crossYear={cross} />}
      >
        {comp.name}
      </PageTitle>

      {!fx.length ? (
        <Empty>No fixtures published for this season yet. Pick another season above.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Matches played" value={done.length} sub={`of ${fx.length}`} />
            <Stat label={`Avg match total`} value={avgTotal != null ? fmt(avgTotal, "1") : "–"} sub={comp.scoreWord} />
            <Stat label="Home win rate" value={homeWin != null ? fmt(homeWin, "pct0") : "–"} sub={book.ratings.n ? `home edge ${fmt(book.ratings.homeAdv, "1")} ${comp.scoreWord}` : undefined} />
            <Stat label="Leader" value={book.ladder[0] ? book.ladder[0].team.abbr || book.ladder[0].team.name : "–"} sub={book.ladder[0] ? `${book.ladder[0].points} pts` : undefined} tone="accent" />
          </div>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="display text-lg font-bold text-ink-200">{roundFx[0]?.roundLabel || "Matches"}</h2>
              <Link href={`/sport/${comp.id}/fixtures?season=${season}`} className="text-xs text-ink-400 hover:text-court">
                Full draw →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {roundFx.map((f) => (
                <FixtureTile key={f.id} f={f} ladder={pos} proj={f.state === "pre" ? project(book.ratings, comp, f.home.id, f.away.id) : null} />
              ))}
            </div>
            {roundFx.some((f) => f.state === "pre") && book.ratings.n > 0 && (
              <p className="mt-2 text-[11px] text-ink-500">Percentages are our win chances from this season&apos;s results (attack/defence ratings with home advantage). Grey number = projected score.</p>
            )}
          </section>

          <div className="grid gap-5 lg:grid-cols-5">
            <Card className="lg:col-span-3" pad={false} title="Ladder" right={<Link href={`/sport/${comp.id}/ladder?season=${season}`} className="hover:text-court">Full ladder →</Link>}>
              <LadderTable comp={comp} rows={book.ladder} compact />
            </Card>
            <div className="lg:col-span-2">
              <Suspense fallback={<Card title="Season leaders"><p className="text-sm text-ink-500">Adding up every match…</p></Card>}>
                <Leaders compId={comp.id} season={season} />
              </Suspense>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

async function Leaders({ compId, season }: { compId: string; season: number }) {
  const comp = requireComp(compId);
  const book = await getSeasonBook(comp, season, true);
  if (!book.players.length) return <Card title="Season leaders"><p className="text-sm text-ink-500">Player stats appear once matches have been played.</p></Card>;
  const defs = comp.featured.filter((d) => !d.lowerBetter).slice(0, 6);
  const side = (id: string) => book.teamSides.get(id);
  return (
    <Card title="Season leaders" right={<Link href={`/sport/${comp.id}/stats?season=${season}`} className="hover:text-court">All stats →</Link>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {defs.map((d) => {
          const top = book.players
            .map((p) => ({ p, v: statOf(p.totals, d) }))
            .filter((x): x is { p: (typeof book.players)[number]; v: number } => x.v != null && x.v > 0)
            .sort((a, b) => b.v - a.v)
            .slice(0, 3);
          if (!top.length) return null;
          return (
            <div key={d.label}>
              <div className="display mb-1 text-[11px] font-semibold text-ink-500">{d.label}</div>
              <ul className="space-y-1 text-sm">
                {top.map(({ p, v }) => {
                  const t = side(p.teamId);
                  return (
                    <li key={p.id} className="flex items-center gap-2">
                      {t && <TeamMark t={t} size={16} />}
                      <Link href={`/sport/${comp.id}/players/${p.id}?season=${season}`} className="flex-1 truncate hover:text-court">
                        {p.name}
                      </Link>
                      <span className="num font-semibold text-ink-100">{fmt(v, d.fmt === "1" ? "1" : "int")}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
