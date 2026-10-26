import Link from "next/link";
import { Suspense } from "react";
import { TeamLogo } from "@/components/Img";
import { Card, Empty, PageTitle, Stat } from "@/components/ui";
import { getMatch, getMatchesBetween, ballsOf, type Match } from "@/lib/cricket";
import { fmt, fmtDay, fmtTime, localDayKey } from "@/lib/format";
import { t20Ladder, type T20Result } from "@/lib/t20Ladder";

export const revalidate = 300;
export const maxDuration = 60;

const isSmash = (m: Match) => /super smash/i.test(`${m.leagueName} ${m.name}`) && !m.women;
const isFinal = (m: Match) => /final|eliminator|qualifier/i.test(m.description);

/** Season Y runs late November Y to early March Y+1. */
function defaultSeason(now = new Date()) {
  const k = localDayKey(now);
  const y = Number(k.slice(0, 4));
  const m = Number(k.slice(4, 6));
  return m >= 11 ? y : y - 1;
}

const offSeason = () => {
  const m = localDayKey(new Date()).slice(4, 6);
  return m >= "04" && m <= "10";
};

async function seasonMatches(y: number) {
  return getMatchesBetween(`${y}1120`, `${y + 1}0310`, isSmash);
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
  const cur = defaultSeason();
  const season = Number(sp.season) > 2000 ? Number(sp.season) : cur;
  let matches = await seasonMatches(season);
  let shown = season;
  // Off-season and next season's draw not out yet → show the season just finished
  if (!sp.season && !matches.length) {
    shown = season - 1;
    matches = await seasonMatches(shown);
  }
  const done = matches.filter((m) => m.state === "post");
  const ladder = t20Ladder(done.map(toResult));
  const firsts = done.map((m) => m.teams.find((t) => t.innings[0]?.period === 1)?.innings[0]?.runs ?? null).filter((v): v is number => v != null);
  const decided = done.filter((m) => m.teams.some((t) => t.winner));
  const chaseWins = decided.filter((m) => {
    const w = m.teams.find((t) => t.winner)!;
    return !w.innings.some((i) => i.period === 1);
  }).length;
  // Off-season (Apr–Oct) also offers the coming season in case the draw is out
  const seasons = [...new Set([offSeason() ? cur + 1 : cur, cur, cur - 1, cur - 2])];
  const label = (y: number) => `${y}–${String(y + 1).slice(2)}`;
  const live = matches.filter((m) => m.state === "in");
  const upcoming = matches.filter((m) => m.state === "pre").slice(0, 6);
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
              <h2 className="display mb-2 text-lg font-bold text-ink-200">{live.length ? "Live & next" : "Coming up"}</h2>
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
        <span className="ml-auto truncate text-ink-600">{m.description}</span>
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
