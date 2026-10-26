import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToSlip } from "@/components/BetSlip";
import { SortableTable, type Column, type Row } from "@/components/SortableTable";
import { TeamMark } from "@/components/sport/TeamMark";
import { Card, CompareBar, Empty, Stat } from "@/components/ui";
import { fmt, fmtDayTime } from "@/lib/format";
import { statOf, type CompDef } from "@/sports/comps";
import { findFixture, getMatchFile, getSeasonBook, requireComp, type SeasonBook } from "@/sports/data";
import type { Fixture, MatchEvent, MatchFile, PlayerLine } from "@/sports/model";
import { buildPreview } from "@/sports/preview";

export const revalidate = 30;
export const maxDuration = 60;

const pct = (p: number) => `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;
const fair = (p: number) => (p > 0 ? (1 / p).toFixed(2) : "–");
const resCls = (r: string) => (r === "W" ? "bg-win/25 text-win" : r === "L" ? "bg-loss/25 text-loss" : "bg-ink-700 text-ink-300");

export default async function MatchPage({ params, searchParams }: { params: Promise<{ comp: string; id: string }>; searchParams: Promise<{ season?: string }> }) {
  const { comp: compId, id } = await params;
  const comp = requireComp(compId);
  const sp = await searchParams;
  const f = await findFixture(comp, id, Number(sp.season) || undefined);
  if (!f) notFound();
  const [file, book] = await Promise.all([f.state !== "pre" ? getMatchFile(comp, f) : Promise.resolve(null), getSeasonBook(comp, f.season, true)]);
  const fx = file?.fixture ?? f;
  const game = `${fx.home.abbr || fx.home.name} v ${fx.away.abbr || fx.away.name}`;

  return (
    <div className="space-y-5">
      <Link href={`/sport/${comp.id}/fixtures?season=${f.season}`} className="text-xs text-ink-400 hover:text-court">
        ← Fixtures
      </Link>
      <Header comp={comp} f={fx} />
      {f.state === "pre" ? <PreviewBlock comp={comp} book={book} f={fx} game={game} /> : file ? <MatchBody comp={comp} m={file} /> : <Empty>Match stats aren&apos;t available yet.</Empty>}
      {file && file.officials.length > 0 && <p className="text-xs text-ink-500">Officials: {file.officials.join(", ")}</p>}
    </div>
  );
}

function Header({ comp, f }: { comp: CompDef; f: Fixture }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-800 px-4 py-2 text-[11px] text-ink-400">
        {comp.name} · {f.roundLabel} {f.venue && `· ${f.venue}`} {f.date && `· ${fmtDayTime(f.date)}`}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4 sm:gap-3">
        {[f.home, f.away].map((t, i) => (
          <Link
            key={t.id}
            href={`/sport/${comp.id}/teams/${t.id}?season=${f.season}`}
            className={`flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-3 ${i === 1 ? "order-3 sm:flex-row-reverse sm:text-right" : "sm:text-left"}`}
          >
            <TeamMark t={t} size={44} />
            <span className={`display text-sm font-bold leading-tight sm:text-2xl ${f.winnerId === t.id ? "text-ink-100" : "text-ink-300"}`}>{t.name}</span>
          </Link>
        ))}
        <div className="order-2 text-center">
          {f.state === "pre" ? (
            <span className="display text-sm text-ink-400">v</span>
          ) : (
            <span className="num whitespace-nowrap text-2xl font-extrabold sm:text-4xl">
              {f.home.score ?? "–"}
              <span className="mx-1 text-ink-600">–</span>
              {f.away.score ?? "–"}
            </span>
          )}
          <div className={`text-[11px] ${f.state === "in" ? "text-loss" : "text-ink-500"}`}>{f.state === "pre" ? "Not started" : f.status || "Full time"}</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------- result / live

function MatchBody({ comp, m }: { comp: CompDef; m: MatchFile }) {
  const f = m.fixture;
  const featuredKeys = comp.teamFeatured.flatMap((d) => d.keys);
  const rows = [...m.teamStats]
    .filter((r) => r.home != null || r.away != null)
    .sort((a, b) => {
      const ia = featuredKeys.indexOf(a.key);
      const ib = featuredKeys.indexOf(b.key);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  const top = rows.slice(0, 14);
  const rest = rows.slice(14);
  const scoring = m.events.filter((e) => e.scoring);
  const longFlow = scoring.length > 40; // netball: every goal is an event
  return (
    <>
      {m.periods.length > 0 && (
        <Card pad={false} title="By period">
          <div className="overflow-x-auto">
            <table className="stat-table compact">
              <thead>
                <tr>
                  <th className="!text-left">Team</th>
                  {m.periods.map((_, i) => (
                    <th key={i}>{comp.periods === 4 ? `Q${i + 1}` : i < 2 ? `${i === 0 ? "1st" : "2nd"} half` : `ET${i - 1}`}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {[f.home, f.away].map((t, ti) => (
                  <tr key={t.id}>
                    <td className="!text-left font-sans">{t.name}</td>
                    {m.periods.map((p, i) => (
                      <td key={i}>{(ti === 0 ? p.home : p.away) ?? "–"}</td>
                    ))}
                    <td className="font-bold !text-ink-100">{t.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Team stats">
          {top.length ? (
            <>
              <div className="mb-1 flex justify-between text-xs font-semibold">
                <span style={{ color: f.home.color }}>{f.home.abbr}</span>
                <span style={{ color: f.away.color }}>{f.away.abbr}</span>
              </div>
              {top.map((r) => (
                <CompareBar key={r.key} label={r.label} a={r.home} b={r.away} fmtKind={Number.isInteger(r.home ?? 0) && Number.isInteger(r.away ?? 0) ? "int" : "1"} colorA={f.home.color} colorB={f.away.color} lowerBetter={r.lowerBetter} />
              ))}
              {rest.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-ink-400">{rest.length} more stats</summary>
                  {rest.map((r) => (
                    <CompareBar key={r.key} label={r.label} a={r.home} b={r.away} fmtKind={Number.isInteger(r.home ?? 0) ? "int" : "1"} colorA={f.home.color} colorB={f.away.color} lowerBetter={r.lowerBetter} />
                  ))}
                </details>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-500">No team stats in the feed for this match.</p>
          )}
        </Card>
        <Card title={longFlow ? "Scoring flow" : "Timeline"}>
          {longFlow ? <FlowSummary m={m} events={scoring} /> : m.events.length ? <Timeline m={m} events={m.events} /> : <p className="text-sm text-ink-500">No match events in the feed.</p>}
        </Card>
      </div>

      <TopPerformers comp={comp} m={m} />
      {[f.home, f.away].map((t) => (
        <PlayerTable key={t.id} comp={comp} m={m} teamId={t.id} title={t.name} />
      ))}
    </>
  );
}

function Timeline({ m, events }: { m: MatchFile; events: MatchEvent[] }) {
  const f = m.fixture;
  return (
    <ul className="space-y-1.5 text-sm">
      {events.map((e, i) => {
        const home = e.teamId === f.home.id;
        const t = home ? f.home : e.teamId === f.away.id ? f.away : null;
        return (
          <li key={i} className={`flex items-center gap-2 ${home ? "" : "flex-row-reverse text-right"}`}>
            <span className="num w-10 shrink-0 text-xs text-ink-500">{e.clock}</span>
            {t && <TeamMark t={t} size={18} />}
            <span className={`min-w-0 flex-1 truncate ${e.scoring ? "text-ink-100" : "text-ink-400"}`}>
              <span className="display mr-1 text-[10px] text-court-soft">{e.kind}</span>
              {e.text}
            </span>
            {e.homeScore != null && <span className="num shrink-0 text-xs text-ink-400">{e.homeScore}–{e.awayScore}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** For high-scoring flows (netball): lead changes, biggest leads and best runs. */
function FlowSummary({ m, events }: { m: MatchFile; events: MatchEvent[] }) {
  const f = m.fixture;
  let lead = 0, changes = 0, maxH = 0, maxA = 0;
  let run = { team: "", n: 0 }, bestH = 0, bestA = 0;
  for (const e of events) {
    const d = (e.homeScore ?? 0) - (e.awayScore ?? 0);
    const sign = Math.sign(d);
    if (sign && lead && sign !== lead) changes++;
    if (sign) lead = sign;
    maxH = Math.max(maxH, d);
    maxA = Math.max(maxA, -d);
    run = run.team === e.teamId ? { team: e.teamId, n: run.n + 1 } : { team: e.teamId, n: 1 };
    if (e.teamId === f.home.id) bestH = Math.max(bestH, run.n);
    else bestA = Math.max(bestA, run.n);
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label="Lead changes" value={changes} />
      <Stat label="Goals" value={events.length} />
      <Stat label={`${f.home.abbr} biggest lead`} value={maxH} />
      <Stat label={`${f.away.abbr} biggest lead`} value={maxA} />
      <Stat label={`${f.home.abbr} best run`} value={bestH} sub="unanswered goals" />
      <Stat label={`${f.away.abbr} best run`} value={bestA} sub="unanswered goals" />
    </div>
  );
}

function TopPerformers({ comp, m }: { comp: CompDef; m: MatchFile }) {
  const defs = comp.featured.filter((d) => !d.lowerBetter && m.players.some((p) => (statOf(p.stats, d) ?? 0) > 0)).slice(0, 6);
  if (!defs.length) return null;
  const team = (p: PlayerLine) => (p.teamId === m.fixture.home.id ? m.fixture.home : m.fixture.away);
  return (
    <Card title="Top performers">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {defs.map((d) => {
          const top = m.players
            .map((p) => ({ p, v: statOf(p.stats, d) ?? 0 }))
            .filter((x) => x.v > 0)
            .sort((a, b) => b.v - a.v)
            .slice(0, 3);
          return (
            <div key={d.label}>
              <div className="display mb-1 text-[11px] font-semibold text-ink-500">{d.label}</div>
              <ul className="space-y-1 text-sm">
                {top.map(({ p, v }) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <TeamMark t={team(p)} size={16} />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="num font-semibold">{fmt(v, Number.isInteger(v) ? "int" : "1")}</span>
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

function PlayerTable({ comp, m, teamId, title }: { comp: CompDef; m: MatchFile; teamId: string; title: string }) {
  const players = m.players.filter((p) => p.teamId === teamId && Object.keys(p.stats).length);
  if (!players.length) return null;
  const defs = comp.featured.filter((d) => players.some((p) => statOf(p.stats, d) != null));
  const known = new Set(defs.flatMap((d) => d.keys));
  // Any other stats the feed has, after the featured ones
  const extra = [...new Set(players.flatMap((p) => Object.keys(p.stats)))].filter((k) => !known.has(k)).slice(0, 20);
  const columns: Column[] = [
    { key: "pos", label: "Pos" },
    ...defs.map((d) => ({ key: d.label, label: d.short, title: d.label, fmt: (d.fmt === "1" ? "1" : "int") as Column["fmt"], heat: true, invert: d.lowerBetter })),
    ...extra.map((k) => ({ key: `x:${k}`, label: k.replace(/([a-z])([A-Z])/g, "$1 $2").slice(0, 12), title: k, fmt: "int" as const })),
  ];
  const rows: Row[] = players.map((p) => ({
    key: p.id,
    lead: { label: `${p.number ? `${p.number}. ` : ""}${p.name}`, href: `/sport/${comp.id}/players/${p.id}?season=${m.fixture.season}`, img: p.headshot, imgKind: "player" as const, muted: p.starter === false },
    cells: { pos: p.position ?? "", ...Object.fromEntries(defs.map((d) => [d.label, statOf(p.stats, d)])), ...Object.fromEntries(extra.map((k) => [`x:${k}`, p.stats[k] ?? null])) },
  }));
  const first = defs.find((d) => !d.lowerBetter);
  return (
    <Card pad={false} title={title}>
      <SortableTable columns={columns} rows={rows} dense defaultSort={first ? { key: first.label, dir: "desc" } : undefined} />
    </Card>
  );
}

// ---------------------------------------------------------------------------- preview

async function PreviewBlock({ comp, book, f, game }: { comp: CompDef; book: SeasonBook; f: Fixture; game: string }) {
  const pv = await buildPreview(book, f);
  const p = pv.proj;
  const groups = [...new Set(pv.markets.map((m) => m.group))];
  const leg = (id: string, label: string, prob: number) => ({ id: `${f.id}:${id}`, gameId: f.id, game, label, p: prob });
  const teamOf = (id: string) => (id === f.home.id ? f.home : f.away);
  return (
    <>
      {p ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Projected score" value={`${p.home.toFixed(comp.sport === "soccer" ? 1 : 0)} – ${p.away.toFixed(comp.sport === "soccer" ? 1 : 0)}`} sub={`${f.home.abbr} v ${f.away.abbr}`} tone="accent" />
          <Stat label={`${f.home.abbr} win`} value={pct(p.pHome)} sub={`fair ${fair(p.pHome)}`} tone={p.pHome >= 0.5 ? "win" : undefined} />
          <Stat label={`${f.away.abbr} win`} value={pct(p.pAway)} sub={`fair ${fair(p.pAway)}${comp.sport === "soccer" ? ` · draw ${pct(p.pDraw)}` : ""}`} tone={p.pAway >= 0.5 ? "win" : undefined} />
          <Stat label="Projected total" value={p.total.toFixed(comp.sport === "soccer" ? 1 : 0)} sub={`margin ${p.margin >= 0 ? f.home.abbr : f.away.abbr} by ${Math.abs(p.margin).toFixed(comp.sport === "soccer" ? 1 : 0)} · ${p.confidence} confidence`} />
        </div>
      ) : (
        <Empty>No results yet this season to project from.</Empty>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {pv.markets.length > 0 && (
          <Card title="Our markets" right="our chance · fair odds">
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g}>
                  <div className="display mb-1 text-[11px] font-semibold text-ink-500">{g}</div>
                  <ul className="space-y-1">
                    {pv.markets
                      .filter((m) => m.group === g)
                      .map((m) => (
                        <li key={m.id} className="flex items-center gap-2 rounded-md bg-ink-950/60 px-2 py-1 text-sm">
                          <span className="flex-1 truncate">{m.label}</span>
                          <span className="num w-12 text-right text-ink-300">{pct(m.p)}</span>
                          <span className="num w-12 text-right text-court-soft">{fair(m.p)}</span>
                          <AddToSlip legs={[leg(m.id, m.label, m.p)]} label="+" />
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-500">Compare the fair odds with the bookie: a price above fair is value by our numbers.</p>
          </Card>
        )}
        {pv.scorers.length > 0 && (
          <Card title={`Anytime ${comp.scorer?.label} scorer`} right="season rate × projected score">
            <ul className="space-y-1">
              {pv.scorers.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-md bg-ink-950/60 px-2 py-1 text-sm">
                  <TeamMark t={teamOf(s.teamId)} size={18} />
                  <Link href={`/sport/${comp.id}/players/${s.id}?season=${f.season}`} className="min-w-0 flex-1 truncate hover:text-court">
                    {s.name}
                    <span className="ml-1 text-[10px] text-ink-500">
                      {s.scored} in {s.games} · last 5: {s.last5.join(" ")}
                    </span>
                  </Link>
                  <span className="num w-12 text-right text-ink-300">{pct(s.p)}</span>
                  <span className="num w-12 text-right text-court-soft">{fair(s.p)}</span>
                  <AddToSlip legs={[leg(`scorer:${s.id}`, `${s.name} anytime ${comp.scorer?.label}`, s.p)]} label="+" />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-ink-500">Players who played their team&apos;s last match. Check team lists before betting.</p>
          </Card>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {pv.form.map(({ teamId, rows }) => {
          const t = teamOf(teamId);
          return (
            <Card key={teamId} title={<span className="flex items-center gap-2"><TeamMark t={t} size={20} />{t.name} — form{pv.ladderPos.get(teamId) ? ` (${pv.ladderPos.get(teamId)} on ladder)` : ""}</span>}>
              {rows.length ? (
                <ul className="space-y-1.5 text-sm">
                  {rows.map((r) => (
                    <li key={r.f.id} className="flex items-center gap-2">
                      <span className={`w-5 rounded text-center text-[11px] font-bold ${resCls(r.result)}`}>{r.result}</span>
                      <Link href={`/sport/${comp.id}/match/${r.f.id}?season=${r.f.season}`} className="flex-1 truncate hover:text-court">
                        {r.home ? "v" : "@"} {r.them.name} <span className="text-[11px] text-ink-500">{r.f.season !== f.season ? `${r.f.season} ` : ""}{r.f.roundLabel}</span>
                      </Link>
                      <span className="num text-xs text-ink-300">{r.us.score}–{r.them.score}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-500">No recent results.</p>
              )}
            </Card>
          );
        })}
      </div>

      <Card title="Head to head (last 3 seasons)">
        {pv.h2h.length ? (
          <ul className="space-y-1.5 text-sm">
            {pv.h2h.map((x) => {
              const w = x.winnerId ? (x.winnerId === x.home.id ? x.home : x.away) : null;
              return (
                <li key={x.id} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-xs text-ink-500">{x.season} {x.roundLabel.replace("Round ", "R")}</span>
                  <Link href={`/sport/${comp.id}/match/${x.id}?season=${x.season}`} className="flex-1 truncate hover:text-court">
                    {x.home.name} {x.home.score}–{x.away.score} {x.away.name}
                  </Link>
                  {w && <TeamMark t={w} size={16} />}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-500">They haven&apos;t met in the last three seasons.</p>
        )}
      </Card>

      <SeasonCompare comp={comp} book={book} f={f} />
    </>
  );
}

function SeasonCompare({ comp, book, f }: { comp: CompDef; book: SeasonBook; f: Fixture }) {
  const th = book.teams.find((t) => t.teamId === f.home.id);
  const ta = book.teams.find((t) => t.teamId === f.away.id);
  if (!th || !ta) return null;
  const keys = new Map<string, string>();
  for (const m of book.files) for (const r of m.teamStats) if (!keys.has(r.key)) keys.set(r.key, r.label);
  const featured = comp.teamFeatured.flatMap((d) => d.keys).filter((k) => keys.has(k));
  const list = (featured.length ? featured : [...keys.keys()]).slice(0, 12);
  const lower = new Set(comp.teamFeatured.filter((d) => d.lowerBetter).flatMap((d) => d.keys));
  return (
    <Card title="Season averages per game">
      <div className="mb-1 flex justify-between text-xs font-semibold">
        <span style={{ color: f.home.color }}>{f.home.abbr}</span>
        <span style={{ color: f.away.color }}>{f.away.abbr}</span>
      </div>
      {list.map((k) => (
        <CompareBar key={k} label={keys.get(k)!} a={th.games ? (th.totals[k] ?? 0) / th.games : null} b={ta.games ? (ta.totals[k] ?? 0) / ta.games : null} colorA={f.home.color} colorB={f.away.color} lowerBetter={lower.has(k)} />
      ))}
    </Card>
  );
}
