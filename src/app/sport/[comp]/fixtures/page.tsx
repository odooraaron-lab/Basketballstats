import Link from "next/link";
import { FixtureTile } from "@/components/sport/FixtureTile";
import { SeasonChips } from "@/components/sport/SeasonChips";
import { Empty, PageTitle } from "@/components/ui";
import { currentRound, getSeasonBook, getSeasons, requireComp, resolveSeason, roundKey, rounds } from "@/sports/data";
import { project } from "@/sports/model";

export const revalidate = 60;

export default async function Fixtures({ params, searchParams }: { params: Promise<{ comp: string }>; searchParams: Promise<{ season?: string; r?: string }> }) {
  const comp = requireComp((await params).comp);
  const sp = await searchParams;
  const [season, seasons] = await Promise.all([resolveSeason(comp, sp.season), getSeasons(comp)]);
  const book = await getSeasonBook(comp, season, false);
  const list = rounds(book.fixtures);
  const rk = sp.r && list.some((r) => r.key === sp.r) ? sp.r : currentRound(book.fixtures) ?? list[0]?.key;
  const fx = book.fixtures.filter((f) => roundKey(f) === rk);
  const pos = new Map(book.ladder.map((r) => [r.teamId, r.pos]));
  const idx = list.findIndex((r) => r.key === rk);
  const cross = comp.source.kind === "espn" && comp.source.crossYear;
  const href = (r: string) => `/sport/${comp.id}/fixtures?season=${season}&r=${encodeURIComponent(r)}`;
  // Byes (rugby league): teams in the ladder with no game this round
  const playing = new Set(fx.flatMap((f) => [f.home.id, f.away.id]));
  const byes = comp.points.bye && fx.length && !fx[0].final ? book.ladder.filter((r) => !playing.has(r.teamId)) : [];

  return (
    <div className="space-y-5">
      <PageTitle sub="All times NZ. Upcoming games show our projected score and win chance." right={<SeasonChips base={`/sport/${comp.id}/fixtures`} seasons={seasons} season={season} crossYear={cross} />}>
        Fixtures & results
      </PageTitle>
      {!list.length ? (
        <Empty>No fixtures for this season yet.</Empty>
      ) : (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {list.map((r) => (
              <Link key={r.key} href={href(r.key)} className={`chip shrink-0 !px-2.5 ${r.key === rk ? "!border-court !text-court" : ""}`} title={r.label}>
                {r.short || r.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between">
            {idx > 0 ? <Link href={href(list[idx - 1].key)} className="text-sm text-ink-400 hover:text-court">← {list[idx - 1].label}</Link> : <span />}
            <h2 className="display text-xl font-bold">{list[idx]?.label}</h2>
            {idx < list.length - 1 ? <Link href={href(list[idx + 1].key)} className="text-sm text-ink-400 hover:text-court">{list[idx + 1].label} →</Link> : <span />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {fx.map((f) => (
              <FixtureTile key={f.id} f={f} ladder={pos} proj={f.state === "pre" ? project(book.ratings, comp, f.home.id, f.away.id) : null} />
            ))}
          </div>
          {byes.length > 0 && <p className="text-sm text-ink-400">Bye: {byes.map((b) => b.team.name).join(", ")}</p>}
        </>
      )}
    </div>
  );
}
