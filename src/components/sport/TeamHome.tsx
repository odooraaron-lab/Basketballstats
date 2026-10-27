// Home page for a national-team environment (the All Blacks): record, next test with our
// projection and anytime try-scorer chances, every test this year, and the team's leaders.
import Link from "next/link";
import { Suspense } from "react";
import { FixtureTile } from "@/components/sport/FixtureTile";
import { SeasonChips } from "@/components/sport/SeasonChips";
import { TeamMark } from "@/components/sport/TeamMark";
import { SeasonNotice } from "@/components/SeasonNotice";
import { Card, Empty, PageTitle, Stat } from "@/components/ui";
import { fmt, fmtDay, fmtTime } from "@/lib/format";
import { statOf, type CompDef } from "@/sports/comps";
import { getSeasonBook, requireComp, type SeasonBook } from "@/sports/data";
import { project, type Fixture } from "@/sports/model";
import { buildPreview } from "@/sports/preview";

const pct = (p: number) => `${Math.round(p * 100)}%`;

/** Our side / their side of a test. */
export function sides(f: Fixture, teamId: string) {
  const home = f.home.id === teamId;
  const us = home ? f.home : f.away;
  const them = home ? f.away : f.home;
  const result: "W" | "D" | "L" | "" = f.state !== "post" ? "" : us.score === them.score ? "D" : (us.score ?? 0) > (them.score ?? 0) ? "W" : "L";
  return { home, us, them, result };
}

export function record(fx: Fixture[], teamId: string) {
  const done = fx.filter((f) => f.state === "post");
  const r = { p: done.length, w: 0, d: 0, l: 0, pf: 0, pa: 0 };
  for (const f of done) {
    const s = sides(f, teamId);
    r[s.result === "W" ? "w" : s.result === "D" ? "d" : "l"]++;
    r.pf += s.us.score ?? 0;
    r.pa += s.them.score ?? 0;
  }
  return r;
}

export const resultChip = (r: string) =>
  r ? <span className={`inline-grid h-5 w-5 place-items-center rounded text-[11px] font-bold ${r === "W" ? "bg-win/20 text-win" : r === "L" ? "bg-loss/20 text-loss" : "bg-ink-700 text-ink-300"}`}>{r}</span> : null;

export function TestList({ comp, fx }: { comp: CompDef; fx: Fixture[] }) {
  const team = comp.team!.id;
  return (
    <div className="overflow-x-auto">
      <table className="stat-table">
        <thead>
          <tr>
            <th className="!text-left">Date</th>
            <th className="!text-left">Opponent</th>
            <th className="!text-left">Competition</th>
            <th>Score</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {fx.map((f) => {
            const s = sides(f, team);
            return (
              <tr key={f.id}>
                <td className="!text-left whitespace-nowrap font-sans text-ink-400">
                  {fmtDay(f.date)}
                  {f.state === "pre" && <span className="ml-1 text-ink-500">{fmtTime(f.date)}</span>}
                </td>
                <td className="!text-left font-sans">
                  <Link href={`/sport/${comp.id}/match/${f.id}?season=${f.season}`} className="flex items-center gap-2 hover:text-court">
                    <TeamMark t={s.them} size={18} />
                    <span className="whitespace-nowrap">
                      {s.home ? "v" : "@"} {s.them.name}
                    </span>
                  </Link>
                </td>
                <td className="!text-left whitespace-nowrap font-sans text-xs text-ink-400">{f.stage}</td>
                <td className="whitespace-nowrap font-semibold !text-ink-100">
                  {f.state === "pre" ? <span className="font-normal text-ink-500">–</span> : f.state === "in" ? <span className="text-loss">{s.us.score}–{s.them.score} live</span> : `${s.us.score}–${s.them.score}`}
                </td>
                <td>{resultChip(s.result)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TeamHome({ comp, book, season, seasons }: { comp: CompDef; book: SeasonBook; season: number; seasons: number[] }) {
  const team = comp.team!;
  const fx = book.fixtures;
  const r = record(fx, team.id);
  const next = fx.find((f) => f.state === "in") ?? fx.find((f) => f.state === "pre");
  const last = [...fx].reverse().find((f) => f.state === "post");
  const biggest = fx
    .filter((f) => f.state === "post")
    .map((f) => ({ f, s: sides(f, team.id) }))
    .sort((a, b) => (b.s.us.score ?? 0) - (b.s.them.score ?? 0) - ((a.s.us.score ?? 0) - (a.s.them.score ?? 0)))[0];
  const proj = next ? project(book.ratings, comp, next.home.id, next.away.id) : null;

  return (
    <div className="space-y-6">
      <SeasonNotice id={comp.id} />
      <PageTitle
        sub={`${season} test season · ${r.p} of ${fx.length} tests played · Nations Championship, Bledisloe Cup, Rugby Championship and tours`}
        right={<SeasonChips base={`/sport/${comp.id}`} seasons={seasons} season={season} />}
      >
        {team.nickname}
      </PageTitle>

      {!fx.length ? (
        <Empty>No All Blacks tests listed for {season} yet. Pick another year above.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Record" value={`${r.w}–${r.d ? `${r.d}–` : ""}${r.l}`} sub={r.d ? "won–drawn–lost" : "won–lost"} tone={r.w >= r.l ? "win" : "loss"} />
            <Stat label="Win rate" value={r.p ? fmt(r.w / r.p, "pct0") : "–"} sub={`${r.p} tests`} />
            <Stat label="Avg score" value={r.p ? `${fmt(r.pf / r.p, "1")}–${fmt(r.pa / r.p, "1")}` : "–"} sub={r.p ? `margin ${fmt((r.pf - r.pa) / r.p, "signed1")} a test` : undefined} />
            <Stat label="Biggest win" value={biggest && biggest.s.result === "W" ? `${biggest.s.us.score}–${biggest.s.them.score}` : "–"} sub={biggest && biggest.s.result === "W" ? `v ${biggest.s.them.name}` : undefined} tone="accent" />
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            <div className="space-y-3 lg:col-span-2">
              <h2 className="display text-lg font-bold text-ink-200">{next ? (next.state === "in" ? "Live now" : "Next test") : "Last test"}</h2>
              {next ? <FixtureTile f={next} proj={next.state === "pre" ? proj : null} /> : last ? <FixtureTile f={last} /> : null}
              {next && next.state === "pre" && proj && (
                <p className="text-[11px] text-ink-500">
                  Our chance from every international this year and last (attack/defence ratings with home advantage). Projected {fmt(proj.home, "int")}–{fmt(proj.away, "int")}. Open the match for line, margin and total markets.
                </p>
              )}
              {next && (
                <Suspense fallback={<Card title="Anytime try scorer"><p className="text-sm text-ink-500">Working out try chances…</p></Card>}>
                  <TryScorers compId={comp.id} season={season} fixtureId={next.id} />
                </Suspense>
              )}
            </div>
            <Card className="lg:col-span-3" pad={false} title={`${season} tests`} right={<Link href={`/sport/${comp.id}/ladder?season=${season}`} className="hover:text-court">Record v every nation →</Link>}>
              <TestList comp={comp} fx={fx} />
            </Card>
          </div>

          <Suspense fallback={<Card title="Leaders"><p className="text-sm text-ink-500">Adding up every test…</p></Card>}>
            <TeamLeaders compId={comp.id} season={season} />
          </Suspense>
        </>
      )}
    </div>
  );
}

async function TryScorers({ compId, season, fixtureId }: { compId: string; season: number; fixtureId: string }) {
  const comp = requireComp(compId);
  const book = await getSeasonBook(comp, season, true);
  const f = book.fixtures.find((x) => x.id === fixtureId);
  if (!f || !book.players.length) return null;
  const pv = await buildPreview(book, f);
  const ours = pv.scorers.filter((s) => s.teamId === comp.team!.id).slice(0, 6);
  if (!ours.length) return null;
  return (
    <Card title="Anytime try scorer" right={<Link href={`/sport/${comp.id}/match/${f.id}?season=${season}`} className="hover:text-court">All markets →</Link>}>
      <ul className="space-y-1.5 text-sm">
        {ours.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <Link href={`/sport/${comp.id}/players/${s.id}?season=${season}`} className="flex-1 truncate hover:text-court">
              {s.name}
            </Link>
            <span className="text-[11px] text-ink-500">
              {s.scored} in {s.games}
            </span>
            <span className="num w-10 text-right font-semibold text-ink-100">{pct(s.p)}</span>
            <span className="num w-12 text-right text-court">{(1 / s.p).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-ink-500">Our chance and fair odds, from tries per test this year, scaled to the projected score. Players from the last test only.</p>
    </Card>
  );
}

async function TeamLeaders({ compId, season }: { compId: string; season: number }) {
  const comp = requireComp(compId);
  const book = await getSeasonBook(comp, season, true);
  const ours = book.players.filter((p) => p.teamId === comp.team!.id);
  if (!ours.length) return <Card title="Leaders"><p className="text-sm text-ink-500">Player stats appear once a test has been played.</p></Card>;
  const defs = comp.featured.filter((d) => !d.lowerBetter && ours.some((p) => (statOf(p.totals, d) ?? 0) > 0)).slice(0, 8);
  return (
    <Card title={`${comp.team!.nickname} leaders · ${season}`} right={<Link href={`/sport/${comp.id}/stats?season=${season}`} className="hover:text-court">Every player →</Link>}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {defs.map((d) => {
          const top = ours
            .map((p) => ({ p, v: statOf(p.totals, d) ?? 0 }))
            .filter((x) => x.v > 0)
            .sort((a, b) => b.v - a.v)
            .slice(0, 5);
          return (
            <div key={d.label}>
              <div className="display mb-1 text-[11px] font-semibold text-ink-500">{d.label}</div>
              <ul className="space-y-1 text-sm">
                {top.map(({ p, v }) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <Link href={`/sport/${comp.id}/players/${p.id}?season=${season}`} className="flex-1 truncate hover:text-court">
                      {p.name}
                    </Link>
                    <span className="num font-semibold text-ink-100">{fmt(v, "int")}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
