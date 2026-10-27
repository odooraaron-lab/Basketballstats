import Link from "next/link";
import { Suspense } from "react";
import { TeamLogo } from "@/components/Img";
import { Card, Empty, PageTitle, Stat } from "@/components/ui";
import { getCompetitionSeason, getMatch, ballsOf, type Match } from "@/lib/cricket";
import { fmt, fmtDay, fmtTime, localDayKey } from "@/lib/format";
import { t20Ladder, type T20Result } from "@/lib/t20Ladder";

export const revalidate = 300;
export const maxDuration = 60;

// ESPN files Super Smash as competition 8654 ("New Zealand Domestic Twenty20"); seasons are
// keyed by their starting year (2025 = the 2025–26 summer).
const SMASH_ID = "8654";
const FRANCHISE: Record<string, string> = {
  Auckland: "Auckland Aces",
  Canterbury: "Canterbury Kings",
  "Central Districts": "Central Stags",
  "Northern Districts": "Northern Brave",
  Otago: "Otago Volts",
  Wellington: "Wellington Firebirds",
};
const brand = (m: Match): Match => ({ ...m, teams: m.teams.map((t) => ({ ...t, name: FRANCHISE[t.name] ?? t.name })) });
const isFinal = (m: Match) => /final|eliminator|qualifier/i.test(m.description.split(",")[0]);

async function seasonMatches(y: number) {
  return (await getCompetitionSeason(SMASH_ID, y)).map(brand);
}

function toResult(m: Match): T20Result {
  return {
    id: m.id,
    date: m.date,
    final: isFinal(m),
    noResult: m.state === "post" && /no result|abandon/i.test(`${m.summary} ${m.status}`),
    tie: /tied|tie\b/i.test(m.summary) && !m.teams.some((t) => t.winner),
    teams: m.teams.map((t) => ({ id: t.id, name: t.name, abbr: t.abbr, logo: t.logo, winner: t.winner, innings: t.innings.map((i) => ({ runs: i.runs, wickets: i.wickets, overs: i.overs })) })),
  };
}

export default async function SuperSmash({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const y = Number(localDayKey(new Date()).slice(0, 4));
  const candidates = [y, y - 1, y - 2, y - 3];
  const all = await Promise.all(candidates.map((c) => seasonMatches(c).catch(() => [] as Match[])));
  const available = candidates.filter((_, i) => all[i].length);
  // Default: the newest season that has results (the next draw is shown as "coming up")
  const withResults = candidates.find((_, i) => all[i].some((m) => m.state !== "pre")) ?? available[0] ?? y;
  const shown = Number(sp.season) > 2000 ? Number(sp.season) : withResults;
  const matches = all[candidates.indexOf(shown)] ?? (await seasonMatches(shown));
  const next = available.find((c) => c > shown && all[candidates.indexOf(c)].some((m) => m.state === "pre"));
  const nextFirst = next != null ? all[candidates.indexOf(next)].find((m) => m.state === "pre") : undefined;
  const done = matches.filter((m) => m.state === "post");
  const ladder = t20Ladder(done.map(toResult));
  const firsts = done.map((m) => m.teams.find((t) => t.innings[0]?.period === 1)?.innings[0]?.runs ?? null).filter((v): v is number => v != null);
  const decided = done.filter((m) => m.teams.some((t) => t.winner));
  const chaseWins = decided.filter((m) => {
    const w = m.teams.find((t) => t.winner)!;
    return !w.innings.some((i) => i.period === 1);
  }).length;
  // Off-season (Apr–Oct) also offers the coming season in case the draw is out
  const seasons = available;
  const label = (y: number) => `${y}–${String(y + 1).slice(2)}`;
  const live = matches.filter((m) => m.state === "in");
  const upcoming = matches.filter((m) => m.state === "pre").slice(0, done.length ? 6 : 40);
  const results = [...done].reverse();

  return (
    <div className="space-y-6">
      <PageTitle
        sub={`New Zealand's men's T20 competition · ${label(shown)} season · times in NZ`}
        right={
          <div className="flex gap-1.5">
            {seasons.map((y) => (
              <Link key={y} href={`/cricket/super-smash?season=${y}`} className={`chip ${y === shown ? "!border-court !text-court" : "hover:text-ink-100"}`}>
                {label(y)}
              </Link>
            ))}
          </div>
        }
      >
        Super Smash
      </PageTitle>
      {next != null && nextFirst && (
        <Link href={`/cricket/super-smash?season=${next}`} className="card flex items-center justify-between gap-3 px-4 py-3 text-sm hover:border-ink-600">
          <span>
            <b className="text-court">{label(next)} draw is out</b> — starts {fmtDay(nextFirst.date)} with {nextFirst.teams.map((t) => t.name).join(" v ")}
          </span>
          <span className="text-ink-400">See fixtures →</span>
        </Link>
      )}
      {!matches.length ? (
        <Empty>No Super Smash matches found for {label(shown)}. The draw usually appears in November.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Matches played" value={done.length} sub={`of ${matches.length}`} />
            <Stat label="Avg 1st-innings score" value={firsts.length ? fmt(firsts.reduce((a, b) => a + b, 0) / firsts.length, "int") : "–"} />
            <Stat label="Chasing wins" value={decided.length ? fmt(chaseWins / decided.length, "pct0") : "–"} sub={`${chaseWins} of ${decided.length}`} />
            <Stat label="Top of table" value={ladder[0]?.abbr || ladder[0]?.name || "–"} sub={ladder[0] ? `${ladder[0].points} pts` : undefined} tone="accent" />
          </div>

          {(live.length > 0 || upcoming.length > 0) && (
            <section>
              <h2 className="display mb-2 text-lg font-bold text-ink-200">{live.length ? "Live & next" : done.length ? "Coming up" : "Fixtures"}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[...live, ...upcoming].map((m) => (
                  <Tile key={m.id} m={m} />
                ))}
              </div>
            </section>
          )}

          <Card pad={false} title="Points table" right="win 4 · tie/NR 2 · bonus point for 1.25× run rate · top 3 to the finals">
            <div className="overflow-x-auto">
              <table className="stat-table compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="!text-left">Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>L</th>
                    <th>T/NR</th>
                    <th>BP</th>
                    <th>Pts</th>
                    <th>NRR</th>
                    <th className="!text-left">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {ladder.map((r) => (
                    <tr key={r.id} className={r.pos === 3 ? "border-b-2 border-b-court/60" : ""}>
                      <td className={r.pos <= 3 ? "font-semibold !text-court" : ""}>{r.pos}</td>
                      <td className="!text-left font-sans">
                        <span className="flex items-center gap-2">
                          <TeamLogo src={r.logo} alt={r.abbr} size={20} /> {r.name}
                        </span>
                      </td>
                      <td>{r.played}</td>
                      <td>{r.won}</td>
                      <td>{r.lost}</td>
                      <td>{r.nr}</td>
                      <td>{r.bonus}</td>
                      <td className="font-bold !text-ink-100">{r.points}</td>
                      <td className={(r.nrr ?? 0) >= 0 ? "!text-win" : "!text-loss"}>{r.nrr != null ? (r.nrr >= 0 ? "+" : "") + r.nrr.toFixed(3) : "–"}</td>
                      <td className="!text-left">
                        <span className="inline-flex gap-0.5">
                          {r.form.map((x, i) => (
                            <span key={i} className={`w-4 rounded text-center text-[10px] font-bold ${x === "W" ? "bg-win/25 text-win" : x === "L" ? "bg-loss/25 text-loss" : "bg-ink-700 text-ink-300"}`}>
                              {x}
                            </span>
                          ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Suspense fallback={<Card title="Season leaders"><p className="text-sm text-ink-500">Adding up every scorecard…</p></Card>}>
            <Leaders matches={done} />
          </Suspense>

          {results.length > 0 && (
            <section>
              <h2 className="display mb-2 text-lg font-bold text-ink-200">Results</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((m) => (
                  <Tile key={m.id} m={m} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Tile({ m }: { m: Match }) {
  return (
    <Link href={`/cricket/match/${m.leagueId}/${m.id}?d=${localDayKey(m.date)}`} className="card block p-3 hover:border-ink-600">
      <div className="mb-2 flex items-center gap-2 text-[11px]">
        {m.state === "in" ? <span className="font-semibold text-loss">LIVE</span> : <span className="text-ink-400">{fmtDay(m.date)} · {fmtTime(m.date)}</span>}
        <span className="ml-auto truncate text-ink-600">{m.description.split(",")[0]}</span>
      </div>
      {m.teams.map((t) => (
        <div key={t.id} className="flex items-center gap-2.5 py-0.5">
          <TeamLogo src={t.logo} alt={t.abbr} size={22} />
          <span className={`flex-1 truncate text-sm ${t.winner ? "font-semibold text-ink-100" : "text-ink-300"}`}>{t.name}</span>
          <span className="num text-sm">{t.score}</span>
        </div>
      ))}
      {m.summary && <div className="mt-1.5 border-t border-ink-800 pt-1.5 text-[11px] text-ink-400">{m.summary}</div>}
    </Link>
  );
}

interface Bat { id: string; name: string; team: string; inns: number; no: number; runs: number; balls: number; fours: number; sixes: number; hs: number; fifties: number }
interface Bowl { id: string; name: string; team: string; inns: number; balls: number; runs: number; wickets: number; dots: number; best: [number, number] }

async function Leaders({ matches }: { matches: Match[] }) {
  const details = await Promise.all(matches.map((m) => getMatch(m.leagueId, m.id, localDayKey(m.date)).catch(() => null)));
  const bat = new Map<string, Bat>();
  const bowl = new Map<string, Bowl>();
  for (const d of details)
    for (const inn of d?.innings ?? []) {
      for (const b of inn.batting) {
        if (!b.balls && !b.runs && !b.out) continue;
        const r = bat.get(b.id) ?? { id: b.id, name: b.name, team: inn.battingTeam?.abbr ?? "", inns: 0, no: 0, runs: 0, balls: 0, fours: 0, sixes: 0, hs: 0, fifties: 0 };
        r.inns++;
        if (b.notOut) r.no++;
        r.runs += b.runs;
        r.balls += b.balls;
        r.fours += b.fours;
        r.sixes += b.sixes;
        r.hs = Math.max(r.hs, b.runs);
        if (b.runs >= 50) r.fifties++;
        bat.set(b.id, r);
      }
      for (const b of inn.bowling) {
        const r = bowl.get(b.id) ?? { id: b.id, name: b.name, team: inn.bowlingTeam?.abbr ?? "", inns: 0, balls: 0, runs: 0, wickets: 0, dots: 0, best: [0, 999] as [number, number] };
        r.inns++;
        r.balls += ballsOf(b.overs);
        r.runs += b.runs;
        r.wickets += b.wickets;
        r.dots += b.dots ?? 0;
        if (b.wickets > r.best[0] || (b.wickets === r.best[0] && b.runs < r.best[1])) r.best = [b.wickets, b.runs];
        bowl.set(b.id, r);
      }
    }
  const bats = [...bat.values()];
  const bowls = [...bowl.values()];
  if (!bats.length) return null;
  const list = <T,>(title: string, rows: T[], line: (r: T) => [string, string, string]) => (
    <div>
      <div className="display mb-1 text-[11px] font-semibold text-ink-500">{title}</div>
      <ul className="space-y-1 text-sm">
        {rows.map((r, i) => {
          const [name, val, sub] = line(r);
          return (
            <li key={i} className="flex items-baseline gap-2">
              <span className="flex-1 truncate">{name}</span>
              <span className="text-[11px] text-ink-500">{sub}</span>
              <span className="num font-semibold text-ink-100">{val}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
  const sr = (b: Bat) => (b.balls ? (100 * b.runs) / b.balls : 0);
  const econ = (b: Bowl) => (b.balls ? (6 * b.runs) / b.balls : 99);
  return (
    <Card title="Season leaders">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list("Most runs", [...bats].sort((a, b) => b.runs - a.runs).slice(0, 5), (b) => [`${b.name}`, String(b.runs), `${b.team} · avg ${b.inns - b.no ? (b.runs / (b.inns - b.no)).toFixed(1) : "–"} · SR ${sr(b).toFixed(0)}`])}
        {list("Most wickets", [...bowls].sort((a, b) => b.wickets - a.wickets || econ(a) - econ(b)).slice(0, 5), (b) => [b.name, String(b.wickets), `${b.team} · econ ${econ(b).toFixed(2)} · best ${b.best[0]}/${b.best[1]}`])}
        {list("Most sixes", [...bats].sort((a, b) => b.sixes - a.sixes).slice(0, 5), (b) => [b.name, String(b.sixes), `${b.team} · ${b.fours} fours`])}
        {list("Strike rate (60+ balls)", bats.filter((b) => b.balls >= 60).sort((a, b) => sr(b) - sr(a)).slice(0, 5), (b) => [b.name, sr(b).toFixed(1), `${b.team} · ${b.runs} off ${b.balls}`])}
        {list("Economy (12+ overs)", bowls.filter((b) => b.balls >= 72).sort((a, b) => econ(a) - econ(b)).slice(0, 5), (b) => [b.name, econ(b).toFixed(2), `${b.team} · ${b.wickets} wkts`])}
        {list("Highest scores", [...bats].sort((a, b) => b.hs - a.hs).slice(0, 5), (b) => [b.name, String(b.hs), `${b.team} · ${b.fifties} fifties`])}
      </div>
    </Card>
  );
}
