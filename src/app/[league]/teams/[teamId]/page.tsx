import Link from "next/link";
import { notFound } from "next/navigation";
import { Headshot, TeamLogo } from "@/components/Img";
import { SortableTable, type Column, type Row } from "@/components/SortableTable";
import { TeamTrackingPanel } from "@/components/TrackingPanels";
import { Card, Empty, GameTile, SeasonPicker, Stat, Tabs } from "@/components/ui";
import { getLeague } from "@/leagues/registry";
import { getInjuries, getPlayerSeasons, getRoster, getTeam, getTeamSchedule } from "@/lib/espn";
import { fmt, fmtDay, hex } from "@/lib/format";
import { getLeagueTable, projectGame, resolveSeason, type TeamRow } from "@/lib/league";
import type { PlayerSeasonRow } from "@/lib/model";
import { seasonFolder } from "@/lib/nbacom";
import { teamTracking } from "@/lib/tracking";
import { regulationMinutes, teamMinutes } from "@/lib/rules";
import {
  astToRatio,
  effectiveFg,
  fgPct,
  fourFactors,
  ftPct,
  gameScore,
  per,
  perMinutes,
  tpPct,
  trueShooting,
  usage,
} from "@/lib/stats";

export const revalidate = 600;

function rankOf(rows: TeamRow[], teamId: string, get: (r: TeamRow) => number | null, lowerBetter = false) {
  const vals = rows.filter((r) => get(r) != null).sort((a, b) => (lowerBetter ? get(a)! - get(b)! : get(b)! - get(a)!));
  const i = vals.findIndex((r) => r.team.id === teamId);
  return i >= 0 ? i + 1 : null;
}

const ord = (n: number | null) => (n == null ? "" : `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? "th"}`);

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string; teamId: string }>;
  searchParams: Promise<{ season?: string; type?: string; tab?: string }>;
}) {
  const { league: lid, teamId } = await params;
  const sp = await searchParams;
  const league = getLeague(lid);
  const sel = await resolveSeason(league, sp);
  const tab = sp.tab ?? "overview";

  const [info, roster, table, schedule, injuries] = await Promise.all([
    getTeam(league, teamId),
    getRoster(league, teamId),
    getLeagueTable(league, sel.year, sel.type),
    getTeamSchedule(league, teamId, sel.year, sel.type),
    getInjuries(league),
  ]);
  if (!info) notFound();
  const { team } = info;
  const hasTracking = league.features.nbaComTracking;
  const tracking = hasTracking && tab === "tracking" ? await teamTracking(seasonFolder(sel.year, sel.type), team.abbr) : null;
  const row = table.rows.find((r) => r.team.id === teamId) ?? null;
  const rowMap = new Map(table.rows.map((r) => [r.team.id, r]));
  const color = hex(team.color);
  const base = `/${league.id}/teams/${teamId}`;
  const qp = { season: sp.season, type: sp.type };

  // Player season rows for this team
  const seasonsByPlayer = await Promise.all(roster.map((p) => getPlayerSeasons(league, p.id, sel.type)));
  const playerRows = roster.map((p, i) => {
    const rows = seasonsByPlayer[i].filter((r) => r.year === sel.year);
    const pick: PlayerSeasonRow | undefined = rows.find((r) => r.teamId === teamId) ?? rows[0];
    return { p, s: pick ?? null };
  });

  const tmPerGame = row?.season?.perGame;
  const tmMin = teamMinutes(league.rules, league.rules.periods);
  const regMin = regulationMinutes(league.rules);

  const played = schedule.filter((g) => g.state === "post");
  const upcoming = schedule.filter((g) => g.state !== "post").slice(0, 6);
  const sideOf = (g: (typeof schedule)[number]) => (g.home.team.id === teamId ? { me: g.home, opp: g.away, home: true } : { me: g.away, opp: g.home, home: false });
  const results = played.map((g) => {
    const { me, opp, home } = sideOf(g);
    const total = (me.score ?? 0) + (opp.score ?? 0);
    return { g, me, opp, home, total, margin: (me.score ?? 0) - (opp.score ?? 0), win: (me.score ?? 0) > (opp.score ?? 0) };
  });
  const avgTotal = results.length ? results.reduce((a, r) => a + r.total, 0) / results.length : null;
  const avgMargin = results.length ? results.reduce((a, r) => a + r.margin, 0) / results.length : null;
  const lgTotal = table.averages?.total ?? null;
  const overLg = lgTotal != null ? results.filter((r) => r.total > lgTotal).length : null;

  const homeRes = results.filter((r) => r.home);
  const awayRes = results.filter((r) => !r.home);
  const rec = (rs: typeof results) => `${rs.filter((r) => r.win).length}-${rs.filter((r) => !r.win).length}`;

  const teamInj = injuries[teamId] ?? [];

  // -------- player stat tables --------
  const basicCols: Column[] = [
    { key: "gp", label: "GP", fmt: "int" },
    { key: "gs", label: "GS", fmt: "int" },
    { key: "min", label: "MIN" },
    { key: "pts", label: "PTS", group: true, heat: true },
    { key: "fgm", label: "FGM", group: true },
    { key: "fga", label: "FGA" },
    { key: "fgp", label: "FG%", fmt: "pct" },
    { key: "tpm", label: "3PM" },
    { key: "tpa", label: "3PA" },
    { key: "tpp", label: "3P%", fmt: "pct" },
    { key: "ftm", label: "FTM" },
    { key: "fta", label: "FTA" },
    { key: "ftp", label: "FT%", fmt: "pct" },
    { key: "oreb", label: "OREB", group: true },
    { key: "dreb", label: "DREB" },
    { key: "reb", label: "REB", heat: true },
    { key: "ast", label: "AST", heat: true },
    { key: "stl", label: "STL", heat: true },
    { key: "blk", label: "BLK", heat: true },
    { key: "tov", label: "TOV", heat: true, invert: true },
    { key: "pf", label: "PF" },
  ];
  const advCols: Column[] = [
    { key: "gp", label: "GP", fmt: "int" },
    { key: "min", label: "MIN" },
    { key: "per", label: "PER", title: "Player Efficiency Rating (estimated)", group: true, heat: true },
    { key: "ts", label: "TS%", fmt: "pct", heat: true },
    { key: "efg", label: "eFG%", fmt: "pct", heat: true },
    { key: "usg", label: "USG%", heat: true },
    { key: "astto", label: "AST/TO", fmt: "2", heat: true },
    { key: "gmsc", label: "GmSc", title: "Average game score (from averages)", heat: true },
    { key: "p36", label: "PTS/36", group: true, heat: true },
    { key: "r36", label: "REB/36", heat: true },
    { key: "a36", label: "AST/36", heat: true },
    { key: "s36", label: "STL/36" },
    { key: "b36", label: "BLK/36" },
    { key: "t36", label: "TOV/36", invert: true },
    { key: "ftr", label: "FTr", fmt: "3", group: true },
    { key: "tpr", label: "3PAr", fmt: "3" },
  ];

  const mkRows = (adv: boolean): Row[] =>
    playerRows.map(({ p, s }) => {
      const b = s?.avg;
      const p36 = b ? perMinutes(b, 36) : null;
      const cells: Row["cells"] = adv
        ? {
            gp: s?.gp ?? null,
            min: b?.min ?? null,
            per: b && tmPerGame && table.context && row ? per(b, { totals: tmPerGame, pace: row.pace }, table.context) : null,
            ts: b ? trueShooting(b) : null,
            efg: b ? effectiveFg(b) : null,
            usg: b && tmPerGame ? usage(b, tmPerGame, tmMin) : null,
            astto: b ? astToRatio(b) : null,
            gmsc: b ? gameScore(b) : null,
            p36: p36?.pts ?? null,
            r36: p36?.reb ?? null,
            a36: p36?.ast ?? null,
            s36: p36?.stl ?? null,
            b36: p36?.blk ?? null,
            t36: p36?.tov ?? null,
            ftr: b && b.fga ? b.fta / b.fga : null,
            tpr: b && b.fga ? b.tpa / b.fga : null,
          }
        : {
            gp: s?.gp ?? null,
            gs: s?.gs ?? null,
            min: b?.min ?? null,
            pts: b?.pts ?? null,
            fgm: b?.fgm ?? null,
            fga: b?.fga ?? null,
            fgp: b ? fgPct(b) : null,
            tpm: b?.tpm ?? null,
            tpa: b?.tpa ?? null,
            tpp: b ? tpPct(b) : null,
            ftm: b?.ftm ?? null,
            fta: b?.fta ?? null,
            ftp: b ? ftPct(b) : null,
            oreb: b?.oreb ?? null,
            dreb: b?.dreb ?? null,
            reb: b?.reb ?? null,
            ast: b?.ast ?? null,
            stl: b?.stl ?? null,
            blk: b?.blk ?? null,
            tov: b?.tov ?? null,
            pf: b?.pf ?? null,
          };
      return {
        key: p.id,
        lead: {
          label: p.name,
          sub: [p.jersey && `#${p.jersey}`, p.pos, p.injury].filter(Boolean).join(" · "),
          img: p.headshot,
          href: `/${league.id}/players/${p.id}`,
          muted: !s,
        },
        cells,
      };
    });

  const ff = tmPerGame ? fourFactors(tmPerGame, tmPerGame) : null;
  const topBy = (k: "pts" | "reb" | "ast") =>
    playerRows.filter((x) => x.s && x.s.gp > 0).sort((a, b) => (b.s!.avg[k] ?? 0) - (a.s!.avg[k] ?? 0))[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="card relative overflow-hidden p-5"
        style={{ background: `linear-gradient(110deg, ${color}33 0%, rgb(var(--ink-900)) 55%)` }}
      >
        <div className="flex flex-wrap items-center gap-5">
          <TeamLogo src={team.logo} alt={team.abbr} size={84} />
          <div className="flex-1">
            <div className="display text-sm font-semibold text-ink-400">{team.location}</div>
            <h1 className="display text-4xl font-extrabold leading-none">{team.shortName}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {row?.standing && (
                <span className="chip num">
                  {row.standing.wins}-{row.standing.losses}
                </span>
              )}
              {info.standingSummary && <span className="chip">{info.standingSummary}</span>}
              {row?.standing?.streak && <span className="chip">Streak {row.standing.streak}</span>}
            </div>
          </div>
          <SeasonPicker base={base} current={sel.current} year={sel.year} type={sel.type} extra={{ tab }} />
        </div>
      </div>

      <Tabs
        base={base}
        active={tab}
        params={qp}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "players", label: "Player stats" },
          { id: "advanced", label: "Advanced" },
          { id: "schedule", label: "Schedule & results" },
          { id: "roster", label: "Roster" },
          ...(hasTracking ? [{ id: "tracking", label: "Tracking" }] : []),
        ]}
      />

      {tab === "overview" && (
        <div className="space-y-5">
          {!row?.season && <Empty>No team stats yet for {sel.label}. Try the previous season above.</Empty>}
          {row?.season && tmPerGame && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                <Stat label="PPG" value={fmt(row.ppg, "1")} sub={ord(rankOf(table.rows, teamId, (r) => (r.season ? r.ppg : null)))} />
                <Stat label="Opp PPG" value={fmt(row.oppg, "1")} sub={ord(rankOf(table.rows, teamId, (r) => r.oppg, true))} />
                <Stat label="Net rtg" value={fmt(row.net, "signed1")} tone={(row.net ?? 0) >= 0 ? "win" : "loss"} sub={ord(rankOf(table.rows, teamId, (r) => r.net))} />
                <Stat label="Off rtg" value={fmt(row.ortg, "1")} sub={ord(rankOf(table.rows, teamId, (r) => r.ortg))} />
                <Stat label="Def rtg" value={fmt(row.drtg, "1")} sub={ord(rankOf(table.rows, teamId, (r) => r.drtg, true))} />
                <Stat label="Pace" value={fmt(row.pace, "1")} sub={ord(rankOf(table.rows, teamId, (r) => (r.season ? r.pace : null)))} />
                <Stat label="TS%" value={fmt(row.ts, "pct")} sub={ord(rankOf(table.rows, teamId, (r) => r.ts))} />
                <Stat label="Avg game total" value={fmt(avgTotal ?? row.avgTotal, "1")} sub={lgTotal ? `League ${fmt(lgTotal, "1")}` : undefined} tone="accent" />
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <Card title="Per game">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {(
                      [
                        ["FG", `${fmt(tmPerGame.fgm, "1")}-${fmt(tmPerGame.fga, "1")}`, fmt(fgPct(tmPerGame), "pct") + "%"],
                        ["3PT", `${fmt(tmPerGame.tpm, "1")}-${fmt(tmPerGame.tpa, "1")}`, fmt(tpPct(tmPerGame), "pct") + "%"],
                        ["FT", `${fmt(tmPerGame.ftm, "1")}-${fmt(tmPerGame.fta, "1")}`, fmt(ftPct(tmPerGame), "pct") + "%"],
                        ["OREB", fmt(tmPerGame.oreb, "1"), ord(rankOf(table.rows, teamId, (r) => r.season?.perGame.oreb ?? null))],
                        ["DREB", fmt(tmPerGame.dreb, "1"), ord(rankOf(table.rows, teamId, (r) => r.season?.perGame.dreb ?? null))],
                        ["REB", fmt(tmPerGame.reb, "1"), ord(rankOf(table.rows, teamId, (r) => r.season?.perGame.reb ?? null))],
                        ["AST", fmt(tmPerGame.ast, "1"), ord(rankOf(table.rows, teamId, (r) => r.season?.perGame.ast ?? null))],
                        ["STL", fmt(tmPerGame.stl, "1"), ord(rankOf(table.rows, teamId, (r) => r.season?.perGame.stl ?? null))],
                        ["BLK", fmt(tmPerGame.blk, "1"), ord(rankOf(table.rows, teamId, (r) => r.season?.perGame.blk ?? null))],
                        ["TOV", fmt(tmPerGame.tov, "1"), ord(rankOf(table.rows, teamId, (r) => r.season?.perGame.tov ?? null, true))],
                        ["PF", fmt(tmPerGame.pf, "1"), ord(rankOf(table.rows, teamId, (r) => r.season?.perGame.pf ?? null, true))],
                        ["AST/TO", fmt(astToRatio(tmPerGame), "2"), ""],
                      ] as const
                    ).map(([l, v, s]) => (
                      <div key={l} className="rounded-md bg-ink-950/60 px-2 py-2">
                        <div className="display text-[11px] text-ink-500">{l}</div>
                        <div className="num text-sm font-semibold">{v}</div>
                        <div className="num text-[10px] text-ink-500">{s}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Four factors (offense)">
                  {ff && (
                    <div className="space-y-3 text-sm">
                      {(
                        [
                          ["Shooting · eFG%", ff.efg, (r: TeamRow) => r.efg, false],
                          ["Turnovers · TOV%", ff.tovPct, (r: TeamRow) => r.tovPct, true],
                          ["Free throws · FT/FGA", ff.ftRate, (r: TeamRow) => (r.season ? r.season.perGame.ftm / r.season.perGame.fga : null), false],
                        ] as const
                      ).map(([l, v, get, low]) => (
                        <div key={l} className="flex items-center justify-between">
                          <span className="text-ink-400">{l}</span>
                          <span>
                            <span className="num font-semibold">{fmt(v, "pct")}</span>
                            <span className="num ml-2 text-xs text-ink-500">{ord(rankOf(table.rows, teamId, get, low))}</span>
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between">
                        <span className="text-ink-400">3PT rate · 3PA/FGA</span>
                        <span className="num font-semibold">{fmt(row.threeRate, "pct")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-400">Possessions / game</span>
                        <span className="num font-semibold">{fmt(row.poss, "1")}</span>
                      </div>
                      <p className="pt-1 text-[11px] text-ink-500">
                        Offensive rebound % needs opponent rebounding, which is available per game in each box score.
                      </p>
                    </div>
                  )}
                </Card>

                <Card title="Team leaders">
                  <div className="space-y-3">
                    {(["pts", "reb", "ast"] as const).map((k) => {
                      const t = topBy(k);
                      if (!t) return null;
                      return (
                        <Link key={k} href={`/${league.id}/players/${t.p.id}`} className="flex items-center gap-3 hover:text-court">
                          <Headshot src={t.p.headshot} name={t.p.name} size={44} ring={color} />
                          <div className="flex-1">
                            <div className="display text-[11px] text-ink-500">{k.toUpperCase()}</div>
                            <div className="text-sm font-medium">{t.p.name}</div>
                          </div>
                          <span className="num text-xl font-semibold">{fmt(t.s!.avg[k], "1")}</span>
                        </Link>
                      );
                    })}
                  </div>
                  {teamInj.length > 0 && (
                    <div className="mt-4 border-t border-ink-800 pt-3">
                      <div className="display mb-1.5 text-xs text-ink-500">Injury report</div>
                      <ul className="space-y-1 text-xs">
                        {teamInj.map((i) => (
                          <li key={i.playerId + i.status} className="flex justify-between gap-2">
                            <span className="text-ink-200">{i.name}</span>
                            <span className="text-right text-loss">
                              {i.status}
                              {i.detail && <span className="text-ink-500"> · {i.detail}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Recent results" right={<Link href={`${base}?tab=schedule`} className="hover:text-court">All →</Link>}>
              {results.length ? (
                <ul className="space-y-1.5 text-sm">
                  {results.slice(-6).reverse().map((r) => (
                    <li key={r.g.id}>
                      <Link href={`/${league.id}/games/${r.g.id}`} className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-ink-850">
                        <span className={`display w-4 font-bold ${r.win ? "text-win" : "text-loss"}`}>{r.win ? "W" : "L"}</span>
                        <span className="w-20 text-xs text-ink-500">{fmtDay(r.g.date)}</span>
                        <span className="text-xs text-ink-500">{r.home ? "vs" : "@"}</span>
                        <TeamLogo src={r.opp.team.logo} alt={r.opp.team.abbr} size={20} />
                        <span className="flex-1">{r.opp.team.shortName}</span>
                        <span className="num">
                          {r.me.score}-{r.opp.score}
                        </span>
                        <span className="num w-12 text-right text-xs text-ink-500">{r.total}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No completed games this season yet.</Empty>
              )}
            </Card>
            <Card title="Next up">
              {upcoming.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {upcoming.slice(0, 4).map((g) => (
                    <GameTile key={g.id} g={g} league={league.id} projection={projectGame(g, rowMap)} />
                  ))}
                </div>
              ) : (
                <Empty>No upcoming games scheduled.</Empty>
              )}
            </Card>
          </div>
        </div>
      )}

      {(tab === "players" || tab === "advanced") && (
        <Card
          title={tab === "players" ? `Player stats — per game · ${sel.label}` : `Advanced — ${sel.label}`}
          right={tab === "advanced" ? "PER is estimated from league team totals · per-36 = per 36 minutes" : "Click any column to sort"}
          pad={false}
        >
          <SortableTable
            columns={tab === "players" ? basicCols : advCols}
            rows={mkRows(tab === "advanced")}
            defaultSort={{ key: tab === "players" ? "pts" : "per", dir: "desc" }}
            footer={
              tab === "players" && tmPerGame
                ? {
                    _label: "Team per game",
                    gp: row?.gp ?? null,
                    min: regMin,
                    pts: tmPerGame.pts,
                    fgm: tmPerGame.fgm,
                    fga: tmPerGame.fga,
                    fgp: fgPct(tmPerGame),
                    tpm: tmPerGame.tpm,
                    tpa: tmPerGame.tpa,
                    tpp: tpPct(tmPerGame),
                    ftm: tmPerGame.ftm,
                    fta: tmPerGame.fta,
                    ftp: ftPct(tmPerGame),
                    oreb: tmPerGame.oreb,
                    dreb: tmPerGame.dreb,
                    reb: tmPerGame.reb,
                    ast: tmPerGame.ast,
                    stl: tmPerGame.stl,
                    blk: tmPerGame.blk,
                    tov: tmPerGame.tov,
                    pf: tmPerGame.pf,
                  }
                : undefined
            }
          />
        </Card>
      )}

      {tab === "schedule" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Record" value={rec(results)} />
            <Stat label="Home" value={rec(homeRes)} />
            <Stat label="Away" value={rec(awayRes)} />
            <Stat label="Avg margin" value={fmt(avgMargin, "signed1")} tone={(avgMargin ?? 0) >= 0 ? "win" : "loss"} />
            <Stat label="Avg game total" value={fmt(avgTotal, "1")} tone="accent" />
            <Stat label="Over league avg" value={overLg != null ? `${overLg}/${results.length}` : "–"} sub={lgTotal ? `> ${fmt(lgTotal, "1")} pts` : undefined} />
          </div>
          <Card title="Results" pad={false}>
            {results.length ? (
              <div className="overflow-x-auto">
                <table className="stat-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="!text-left">Opponent</th>
                      <th>Result</th>
                      <th>Score</th>
                      <th>Margin</th>
                      <th>Total</th>
                      <th>vs Lg avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...results].reverse().map((r) => (
                      <tr key={r.g.id}>
                        <td>
                          <Link href={`/${league.id}/games/${r.g.id}`} className="hover:text-court">
                            {fmtDay(r.g.date)}
                          </Link>
                        </td>
                        <td className="!text-left">
                          <span className="flex items-center gap-2 font-sans">
                            <span className="w-4 text-ink-500">{r.home ? "vs" : "@"}</span>
                            <TeamLogo src={r.opp.team.logo} alt={r.opp.team.abbr} size={18} />
                            {r.opp.team.name}
                          </span>
                        </td>
                        <td className={r.win ? "!text-win" : "!text-loss"}>{r.win ? "W" : "L"}</td>
                        <td>
                          {r.me.score}-{r.opp.score}
                        </td>
                        <td className={r.margin > 0 ? "!text-win" : "!text-loss"}>{fmt(r.margin, "signed")}</td>
                        <td>{r.total}</td>
                        <td className={lgTotal && r.total > lgTotal ? "!text-court-soft" : ""}>{lgTotal ? fmt(r.total - lgTotal, "signed1") : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <Empty>No completed games yet.</Empty>
              </div>
            )}
          </Card>
          <Card title="Upcoming">
            {upcoming.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {schedule
                  .filter((g) => g.state !== "post")
                  .map((g) => (
                    <GameTile key={g.id} g={g} league={league.id} projection={projectGame(g, rowMap)} />
                  ))}
              </div>
            ) : (
              <Empty>No upcoming games.</Empty>
            )}
          </Card>
        </div>
      )}

      {hasTracking && tab === "tracking" &&
        (tracking ? (
          <TeamTrackingPanel t={tracking} league={league.id} />
        ) : (
          <Empty>
            NBA.com tracking data for {sel.label} hasn&apos;t been synced yet — see the{" "}
            <Link href={`/${league.id}/tracking?season=${sel.year}&type=${sel.type}`} className="text-court">
              Tracking page
            </Link>{" "}
            for the sync command.
          </Empty>
        ))}

      {tab === "roster" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {roster.map((p) => (
            <Link key={p.id} href={`/${league.id}/players/${p.id}`} className="card flex items-center gap-3 p-3 hover:border-ink-600">
              <Headshot src={p.headshot} name={p.name} size={64} ring={color} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="num text-xs text-ink-500">#{p.jersey || "–"}</span>
                  <span className="truncate font-semibold">{p.name}</span>
                </div>
                <div className="text-xs text-ink-400">
                  {p.pos} · {p.height} · {p.weight}
                </div>
                <div className="text-[11px] text-ink-500">
                  {p.age ? `Age ${p.age}` : ""}
                  {p.experience != null ? ` · ${p.experience ? `${p.experience} yrs` : "Rookie"}` : ""}
                  {p.college ? ` · ${p.college}` : ""}
                </div>
                {p.injury && <div className="mt-0.5 text-[11px] text-loss">{p.injury}</div>}
              </div>
            </Link>
          ))}
          {!roster.length && <Empty>Roster unavailable.</Empty>}
        </div>
      )}
    </div>
  );
}
