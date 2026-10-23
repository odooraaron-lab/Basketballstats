import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamLogo } from "@/components/Img";
import { Card, Empty, Stat } from "@/components/ui";
import { Suspense } from "react";
import { MAX_OVERS, ballsOf, getMatch, getPreview, inningsStats, type FormResult, type InningsCard, type Match } from "@/lib/cricket";
import { fmt, fmtDayTime } from "@/lib/format";

export const revalidate = 30;

export default async function CricketMatch({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string; eventId: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { leagueId, eventId } = await params;
  const { d } = await searchParams;
  const detail = await getMatch(leagueId, eventId, d);
  if (!detail) notFound();
  const { match: m, innings } = detail;
  const maxOvers = MAX_OVERS[m.format];

  // Live situation for limited-overs: projected total or chase maths
  const last = innings[innings.length - 1];
  let situation: { label: string; value: string; sub?: string }[] = [];
  if (m.state === "in" && last && maxOvers) {
    const s = inningsStats(last);
    const ballsLeft = Math.max(0, maxOvers * 6 - s.balls);
    const wkts = last.total.wickets ?? 0;
    if (innings.length === 1 && s.runRate != null) {
      // simple projection: current rate, trimmed for wickets lost
      const factor = Math.max(0.75, 1 - Math.max(0, wkts - 3) * 0.04);
      situation = [
        { label: "Run rate", value: fmt(s.runRate, "2") },
        { label: "Projected", value: fmt(s.runs + (s.runRate * ballsLeft * factor) / 6, "int"), sub: `at current rate, ${wkts} down` },
        { label: "Balls left", value: String(ballsLeft) },
      ];
    } else if (innings.length >= 2) {
      const target = (innings[0].total.runs ?? 0) + 1;
      const need = target - s.runs;
      situation = [
        { label: "Target", value: String(target) },
        { label: "Need", value: `${Math.max(0, need)}`, sub: `from ${ballsLeft} balls` },
        { label: "Req. rate", value: ballsLeft ? fmt((6 * need) / ballsLeft, "2") : "–", sub: s.runRate != null ? `current ${fmt(s.runRate, "2")}` : undefined },
        { label: "Wickets left", value: String(10 - wkts) },
      ];
    }
  }

  // Top performers across the match
  const bats = innings.flatMap((i) => i.batting.map((b) => ({ ...b, team: i.battingTeam?.abbr ?? "" })));
  const bowls = innings.flatMap((i) => i.bowling.map((b) => ({ ...b, team: i.bowlingTeam?.abbr ?? "" })));
  const topBat = [...bats].sort((a, b) => b.runs - a.runs).slice(0, 3);
  const topBowl = [...bowls].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).slice(0, 3);

  return (
    <div className="space-y-5">
      <Link href={`/cricket${d ? `?date=${d}` : ""}`} className="text-xs text-ink-400 hover:text-court">
        ← All matches
      </Link>
      <div className="card overflow-hidden">
        <div className="border-b border-ink-800 px-4 py-2 text-[11px] text-ink-400">
          {m.leagueName} {m.description && `· ${m.description}`} {m.format !== "Other" && `· ${m.format}`} {m.venue && `· ${m.venue}`}
        </div>
        <div className="space-y-2 p-4">
          {m.teams.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <TeamLogo src={t.logo} alt={t.abbr} size={40} />
              <span className={`display flex-1 text-xl font-bold ${t.winner ? "text-ink-100" : "text-ink-300"}`}>{t.name}</span>
              <span className={`num text-xl ${t.winner ? "font-bold text-court" : "text-ink-200"}`}>{t.score}</span>
            </div>
          ))}
        </div>
        <div className={`border-t border-ink-800 px-4 py-2 text-sm ${m.state === "in" ? "text-loss" : "text-ink-300"}`}>
          {m.summary || m.status || (m.date ? fmtDayTime(m.date) : "")}
        </div>
      </div>

      {situation.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {situation.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} sub={s.sub} tone="accent" />
          ))}
        </div>
      )}

      {innings.length === 0 ? (
        <>
          <Empty>No scorecard yet{m.state === "pre" ? ` — starts ${m.date ? fmtDayTime(m.date) : "soon"}` : ""}. Here's the form guide.</Empty>
          <Suspense fallback={<Empty>Loading form guide — checking the last four weeks of results…</Empty>}>
            <PreviewBlock m={m} />
          </Suspense>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Top batters">
              <ul className="space-y-1.5 text-sm">
                {topBat.map((b, i) => (
                  <li key={b.id + i} className="flex justify-between gap-2">
                    <span>
                      {b.name} <span className="text-[11px] text-ink-500">{b.team}</span>
                    </span>
                    <span className="num">
                      <b className="text-ink-100">{b.runs}{b.notOut ? "*" : ""}</b> <span className="text-ink-500">({b.balls})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Top bowlers">
              <ul className="space-y-1.5 text-sm">
                {topBowl.map((b, i) => (
                  <li key={b.id + i} className="flex justify-between gap-2">
                    <span>
                      {b.name} <span className="text-[11px] text-ink-500">{b.team}</span>
                    </span>
                    <span className="num">
                      <b className="text-ink-100">
                        {b.wickets}/{b.runs}
                      </b>{" "}
                      <span className="text-ink-500">({b.overs} ov)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          {innings.map((inn) => (
            <InningsBlock key={inn.period} inn={inn} />
          ))}
        </>
      )}

      {detail.notes.length > 0 && (
        <Card title="Match notes">
          <ul className="space-y-1 text-sm text-ink-300">
            {detail.notes.map((n, i) => (
              <li key={i}>
                <span className="display mr-2 text-[10px] text-ink-500">{n.type}</span>
                {n.text}
              </li>
            ))}
          </ul>
          {detail.officials.length > 0 && <p className="mt-2 text-xs text-ink-500">Officials: {detail.officials.join(", ")}</p>}
        </Card>
      )}
    </div>
  );
}

function InningsBlock({ inn }: { inn: InningsCard }) {
  const s = inningsStats(inn);
  const overs = inn.total.overs ?? (s.balls ? Math.floor(s.balls / 6) + (s.balls % 6) / 10 : null);
  return (
    <Card
      pad={false}
      title={
        <span className="flex items-center gap-2">
          {inn.battingTeam && <TeamLogo src={inn.battingTeam.logo} alt={inn.battingTeam.abbr} size={20} />}
          {inn.battingTeam?.name ?? "Innings"} · innings {inn.period}
        </span>
      }
      right={
        <span className="num text-sm text-ink-100">
          {inn.total.runs ?? "–"}/{inn.total.wickets ?? "–"} {overs != null && `(${overs} ov)`}
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-2 border-b border-ink-800 p-3 sm:grid-cols-6">
        <Stat label="Run rate" value={fmt(s.runRate, "2")} />
        <Stat label="4s / 6s" value={`${s.fours} / ${s.sixes}`} />
        <Stat label="Boundary %" value={s.boundaryPct != null ? fmt(s.boundaryPct, "pct0") : "–"} sub="of bat runs" />
        <Stat label="Dot balls" value={s.dotPct != null ? fmt(s.dotPct, "pct0") : "–"} />
        <Stat label="Extras" value={s.extras ?? "–"} />
        <Stat label="Balls" value={s.balls || "–"} />
      </div>
      <div className="overflow-x-auto">
        <table className="stat-table compact">
          <thead>
            <tr>
              <th className="!text-left">Batter</th>
              <th className="!text-left">Dismissal</th>
              <th>R</th>
              <th>B</th>
              <th>4s</th>
              <th>6s</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            {inn.batting.map((b, i) => (
              <tr key={b.id + i}>
                <td className="font-sans">
                  {b.name}
                  {b.active && <span className="ml-1 text-court">•</span>}
                </td>
                <td className="!text-left font-sans text-xs text-ink-400">{b.out}</td>
                <td className="font-semibold !text-ink-100">{b.runs}{b.notOut ? "*" : ""}</td>
                <td>{b.balls}</td>
                <td>{b.fours}</td>
                <td>{b.sixes}</td>
                <td>{fmt(b.sr, "1")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {inn.bowling.length > 0 && (
        <div className="overflow-x-auto border-t border-ink-800">
          <table className="stat-table compact">
            <thead>
              <tr>
                <th className="!text-left">Bowler</th>
                <th>O</th>
                <th>M</th>
                <th>R</th>
                <th>W</th>
                <th>ECON</th>
                <th>DOTS</th>
                <th>WD</th>
                <th>NB</th>
              </tr>
            </thead>
            <tbody>
              {inn.bowling.map((b, i) => (
                <tr key={b.id + i}>
                  <td className="font-sans">
                    {b.name}
                    {b.active && <span className="ml-1 text-court">•</span>}
                  </td>
                  <td>{b.overs}</td>
                  <td>{b.maidens}</td>
                  <td>{b.runs}</td>
                  <td className="font-semibold !text-ink-100">{b.wickets}</td>
                  <td>{fmt(b.econ ?? (ballsOf(b.overs) ? (6 * b.runs) / ballsOf(b.overs) : null), "2")}</td>
                  <td>{b.dots ?? "–"}</td>
                  <td>{b.wides ?? "–"}</td>
                  <td>{b.noballs ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

const pill = (r: FormResult["result"]) => (r === "W" ? "bg-win/20 text-win" : r === "L" ? "bg-loss/20 text-loss" : "bg-ink-800 text-ink-300");

async function PreviewBlock({ m }: { m: Match }) {
  const p = await getPreview(m);
  const [a, b] = p.teams;
  const h2hW = p.h2h.filter((r) => r.result === "W").length;
  const h2hL = p.h2h.filter((r) => r.result === "L").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {p.teams.map((t) => (
          <Stat key={t.team.id} label={`${t.team.abbr} last ${t.form.length}`} value={t.form.length ? `${t.form.filter((f) => f.result === "W").length}–${t.form.filter((f) => f.result === "L").length}` : "–"} sub={t.avgFirstInnings != null ? `avg ${fmt(t.avgFirstInnings, "int")} batting` : "no recent games"} tone="accent" />
        ))}
        <Stat label="Head to head" value={p.h2h.length ? `${h2hW}–${h2hL}` : "–"} sub={p.h2h.length && a && b ? `${a.team.abbr} v ${b.team.abbr}, last ${p.daysScanned} days` : "none recently"} />
        <Stat label="Venue 1st inns" value={p.venue.avgFirst != null ? fmt(p.venue.avgFirst, "int") : "–"} sub={p.venue.matches.length ? `${p.venue.matches.length} games · bat 1st won ${p.venue.defendWins}, chase ${p.venue.chaseWins}` : "no recent games here"} />
      </div>

      {p.h2h.length > 0 && (
        <Card title="Head to head (recent)">
          <FormList rows={p.h2h} />
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {p.teams.map((t) => (
          <Card key={t.team.id} title={<span className="flex items-center gap-2"><TeamLogo src={t.team.logo} alt={t.team.abbr} size={20} />{t.team.name} — recent form</span>}>
            {t.form.length ? <FormList rows={t.form} /> : <p className="text-sm text-ink-400">No completed matches in the last {p.daysScanned} days.</p>}
          </Card>
        ))}
      </div>

      {p.teams.map((t) => (
        <Card key={t.team.id} pad={false} title={`${t.team.name} — player form (last ${Math.min(6, t.form.length)} games)`}>
          {!t.batting.length && !t.bowling.length ? (
            <p className="p-3 text-sm text-ink-400">No recent scorecards.</p>
          ) : (
            <div className="grid md:grid-cols-2">
              <div className="overflow-x-auto">
                <table className="stat-table compact">
                  <thead><tr><th className="!text-left">Batter</th><th>Inn</th><th>Runs</th><th>Avg</th><th>SR</th><th>HS</th><th className="!text-left">Recent</th></tr></thead>
                  <tbody>
                    {t.batting.map((r) => (
                      <tr key={r.id}>
                        <td className="font-sans">{r.name}</td><td>{r.inns}</td><td className="font-semibold !text-ink-100">{r.runs}</td>
                        <td>{fmt(r.avg, "1")}</td><td>{fmt(r.sr, "1")}</td><td>{r.hs}</td>
                        <td className="!text-left text-xs text-ink-400">{r.recent.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="overflow-x-auto border-t border-ink-800 md:border-l md:border-t-0">
                <table className="stat-table compact">
                  <thead><tr><th className="!text-left">Bowler</th><th>Inn</th><th>Wkts</th><th>Econ</th><th>Avg</th><th>Best</th></tr></thead>
                  <tbody>
                    {t.bowling.map((r) => (
                      <tr key={r.id}>
                        <td className="font-sans">{r.name}</td><td>{r.inns}</td><td className="font-semibold !text-ink-100">{r.wickets}</td>
                        <td>{fmt(r.econ, "2")}</td><td>{fmt(r.avg, "1")}</td><td>{r.best}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      ))}

      {p.teams.some((t) => t.squad.length) && (
        <div className="grid gap-4 md:grid-cols-2">
          {p.teams.filter((t) => t.squad.length).map((t) => (
            <Card key={t.team.id} title={`${t.team.abbr} squad`}>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                {t.squad.map((pl) => (
                  <li key={pl.id}>{pl.name} {pl.role && <span className="text-[11px] text-ink-500">{pl.role}</span>}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FormList({ rows }: { rows: FormResult[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {rows.map((r) => (
        <li key={r.match.id} className="flex items-center gap-2">
          <span className={`w-5 rounded text-center text-[11px] font-bold ${pill(r.result)}`}>{r.result}</span>
          <Link href={`/cricket/match/${r.match.leagueId}/${r.match.id}`} className="flex-1 truncate hover:text-court">
            v {r.opp} <span className="text-[11px] text-ink-500">{r.match.format !== "Other" ? r.match.format : ""} · {fmtDayTime(r.match.date)}</span>
          </Link>
          <span className="num text-xs text-ink-300">{r.scoreFor || "–"} / {r.scoreAgainst || "–"}</span>
        </li>
      ))}
    </ul>
  );
}
