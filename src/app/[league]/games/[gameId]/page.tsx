import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamLogo } from "@/components/Img";
import { LeadChart, PeriodBars } from "@/components/LeadChart";
import { PlayerCompare } from "@/components/PlayerCompare";
import { ShotChart } from "@/components/ShotChart";
import { SortableTable, type Column, type Row } from "@/components/SortableTable";
import { Bars, Card, CompareBar, Empty, Stat, Tabs } from "@/components/ui";
import { SHOT_ZONES } from "@/leagues/types";
import { getLeague } from "@/leagues/registry";
import { getGameSummary } from "@/lib/espn";
import { fmt, fmtDayTime, hex } from "@/lib/format";
import { compareRosters, type Split } from "@/lib/compare";
import { getLeagueTable, projectGame, resolveSeason } from "@/lib/league";
import type { BoxTeam } from "@/lib/model";
import {
  boxFromPlays,
  buildCtx,
  clutchStats,
  extractShots,
  findRuns,
  groupBy,
  lineupStats,
  possessionLog,
  scoringEvents,
  scoringFlow,
  shotQuality,
  turnoverBreakdown,
  zoneSummary,
} from "@/lib/pbp";
import { elapsedSeconds, periodLabel, periodSeconds, teamMinutes } from "@/lib/rules";
import {
  astPct,
  astToRatio,
  blkPct,
  drebPct,
  effectiveFg,
  fgPct,
  fourFactors,
  ftPct,
  gameScore,
  offRating,
  orebPct,
  possessions,
  rebPct,
  stlPct,
  tpPct,
  trueShooting,
  usage,
} from "@/lib/stats";

export const revalidate = 20;

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string; gameId: string }>;
  searchParams: Promise<{ tab?: string; clutch?: string; period?: string; view?: string; split?: string }>;
}) {
  const { league: lid, gameId } = await params;
  const sp = await searchParams;
  const league = getLeague(lid);
  const rules = league.rules;
  const g = await getGameSummary(league, gameId);
  if (!g) notFound();
  const { card } = g;
  const hasBox = g.box.length === 2 && g.box.some((t) => t.players.some((p) => !p.dnp));
  const defaultTab = card.state === "pre" || !hasBox ? "players" : "box";
  const tab = sp.tab ?? defaultTab;
  const base = `/${league.id}/games/${gameId}`;

  const away = g.box.find((t) => t.homeAway === "away");
  const home = g.box.find((t) => t.homeAway === "home");
  const awayColor = hex(card.away.team.color);
  const homeColor = hex(card.home.team.color === card.away.team.color ? card.home.team.altColor : card.home.team.color);
  const colorOf = (id: string) => (id === card.home.team.id ? homeColor : awayColor);
  const abbrOf = (id: string) => (id === card.home.team.id ? card.home.team.abbr : card.away.team.abbr);

  const ctx = buildCtx(league, g.box, card.home.team.id, card.away.team.id);
  const periodsPlayed = Math.max(rules.periods, card.home.linescores.length, card.away.linescores.length, ...g.plays.map((p) => p.period));
  const tm = teamMinutes(rules, periodsPlayed);

  const nameOf = new Map(g.box.flatMap((t) => t.players.map((p) => [p.player.id, p.player] as const)));
  const shortName = (id: string) => nameOf.get(id)?.shortName ?? nameOf.get(id)?.name ?? id;

  const labels = Array.from({ length: periodsPlayed }, (_, i) => periodLabel(rules, i + 1));

  // ---------------------------------------------------------------- header
  const header = (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-3 sm:gap-4 sm:p-5" style={{ background: `linear-gradient(90deg, ${awayColor}30, transparent 35%, transparent 65%, ${homeColor}30)` }}>
        {[card.away, card.home].map((s, i) => (
          <Link key={s.team.id} href={`/${league.id}/teams/${s.team.id}`} className={`flex min-w-0 items-center gap-2 sm:gap-3 ${i === 1 ? "order-3 flex-row-reverse text-right" : ""}`}>
            <TeamLogo src={s.team.logo} alt={s.team.abbr} size={64} className="!h-10 !w-10 sm:!h-16 sm:!w-16" />
            <div className="min-w-0">
              <div className="display truncate text-base font-extrabold leading-none hover:text-court sm:text-2xl">
                <span className="sm:hidden">{s.team.abbr}</span>
                <span className="hidden sm:inline">{s.team.shortName}</span>
              </div>
              <div className="num text-xs text-ink-400">{s.record}</div>
            </div>
            {card.state !== "pre" && (
              <div className={`num ${i === 1 ? "mr-auto" : "ml-auto"} text-2xl font-bold sm:text-4xl ${s.winner || card.state !== "post" ? "text-ink-100" : "text-ink-500"}`}>{s.score}</div>
            )}
          </Link>
        ))}
        <div className="order-2 text-center">
          <div className={`display max-w-[7rem] text-xs font-bold sm:max-w-none sm:text-sm ${card.state === "in" ? "text-loss" : "text-ink-300"}`}>{card.state === "pre" ? fmtDayTime(card.date) : card.detail}</div>
          {card.odds && card.state === "pre" && <div className="mt-1 text-[11px] text-ink-500">{card.odds.details} · O/U {card.odds.overUnder ?? "–"}</div>}
        </div>
      </div>
      {card.state !== "pre" && (
        <div className="overflow-x-auto border-t border-ink-800">
          <table className="stat-table">
            <thead>
              <tr>
                <th>Team</th>
                {labels.map((l) => (
                  <th key={l}>{l}</th>
                ))}
                <th>T</th>
              </tr>
            </thead>
            <tbody>
              {[card.away, card.home].map((s) => (
                <tr key={s.team.id}>
                  <td className="font-sans">{s.team.abbr}</td>
                  {labels.map((l, i) => (
                    <td key={l}>{s.linescores[i] ?? "–"}</td>
                  ))}
                  <td className="font-bold !text-ink-100">{s.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-ink-800 px-4 py-2 text-[11px] text-ink-500">
        {card.venue && <span>{card.venue}</span>}
        {g.attendance ? <span>Att. {g.attendance.toLocaleString()}</span> : null}
        {card.broadcast && <span>{card.broadcast}</span>}
        {g.officials.length > 0 && <span>Refs: {g.officials.join(", ")}</span>}
      </div>
    </div>
  );

  const tabs = [
    ...(card.state === "pre" || !hasBox
      ? [
          { id: "players", label: "Player comparison" },
          { id: "preview", label: "Preview" },
        ]
      : []),
    ...(hasBox
      ? [
          { id: "box", label: "Box score" },
          { id: "advanced", label: "Advanced" },
          { id: "shots", label: "Shot chart" },
          { id: "flow", label: "Flow & runs" },
          { id: "clutch", label: "Clutch" },
          { id: "lineups", label: "Lineups" },
          { id: "turnovers", label: "Turnovers" },
          { id: "pbp", label: "Play-by-play" },
        ]
      : []),
    ...(card.state !== "pre" && hasBox
      ? [
          { id: "players", label: "Season comparison" },
          { id: "preview", label: "Matchup" },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      {header}
      <Tabs base={base} tabs={tabs} active={tab} />
      {tab === "players" && <PlayersTab />}
      {tab === "preview" && <Preview />}
      {tab === "box" && away && home && <BoxTab />}
      {tab === "advanced" && away && home && <AdvancedTab />}
      {tab === "shots" && <ShotsTab />}
      {tab === "flow" && <FlowTab />}
      {tab === "clutch" && <ClutchTab />}
      {tab === "lineups" && <LineupsTab />}
      {tab === "turnovers" && <TurnoversTab />}
      {tab === "pbp" && <PbpTab />}
    </div>
  );

  // ======================================================================
  function boxCols(): Column[] {
    return [
      { key: "min", label: "MIN", fmt: "int" },
      { key: "pts", label: "PTS", group: true },
      { key: "fg", label: "FG", fmt: "text" },
      { key: "tp", label: "3PT", fmt: "text" },
      { key: "ft", label: "FT", fmt: "text" },
      { key: "oreb", label: "OREB", fmt: "int", group: true },
      { key: "dreb", label: "DREB", fmt: "int" },
      { key: "reb", label: "REB", fmt: "int" },
      { key: "ast", label: "AST", fmt: "int" },
      { key: "stl", label: "STL", fmt: "int" },
      { key: "blk", label: "BLK", fmt: "int" },
      { key: "tov", label: "TO", fmt: "int" },
      { key: "pf", label: "PF", fmt: "int" },
      { key: "pm", label: "+/-", fmt: "signed", signed: true, group: true },
    ];
  }

  function BoxTab() {
    return (
      <div className="space-y-5">
        {[away!, home!].map((t) => (
          <Card key={t.team.id} title={<span className="flex items-center gap-2"><TeamLogo src={t.team.logo} alt={t.team.abbr} size={20} />{t.team.name}</span>} pad={false}>
            <SortableTable
              columns={boxCols()}
              rows={t.players.map((p) => ({
                key: p.player.id,
                lead: {
                  label: p.player.name,
                  sub: p.dnp ? `DNP${p.reason ? ` — ${p.reason}` : ""}` : `${p.starter ? "Starter · " : ""}${p.player.pos}`,
                  img: p.player.headshot,
                  href: `/${league.id}/players/${p.player.id}`,
                  muted: p.dnp,
                },
                cells: p.dnp
                  ? ({} as Row["cells"])
                  : {
                      min: p.box.min,
                      pts: p.box.pts,
                      fg: `${p.box.fgm}-${p.box.fga}`,
                      tp: `${p.box.tpm}-${p.box.tpa}`,
                      ft: `${p.box.ftm}-${p.box.fta}`,
                      oreb: p.box.oreb,
                      dreb: p.box.dreb,
                      reb: p.box.reb,
                      ast: p.box.ast,
                      stl: p.box.stl,
                      blk: p.box.blk,
                      tov: p.box.tov,
                      pf: p.box.pf,
                      pm: p.box.pm ?? null,
                    },
              }))}
              footer={{
                _label: "Team",
                pts: t.totals.pts,
                fg: `${t.totals.fgm}-${t.totals.fga} (${fmt(fgPct(t.totals), "pct")})`,
                tp: `${t.totals.tpm}-${t.totals.tpa} (${fmt(tpPct(t.totals), "pct")})`,
                ft: `${t.totals.ftm}-${t.totals.fta} (${fmt(ftPct(t.totals), "pct")})`,
                oreb: t.totals.oreb,
                dreb: t.totals.dreb,
                reb: t.totals.reb,
                ast: t.totals.ast,
                stl: t.totals.stl,
                blk: t.totals.blk,
                tov: t.totals.tov,
                pf: t.totals.pf,
              }}
            />
          </Card>
        ))}
        <TeamCompare />
      </div>
    );
  }

  function TeamCompare() {
    if (!away || !home) return null;
    const a = away.totals;
    const h = home.totals;
    const extra = (t: BoxTeam, name: string) => t.teamStats.find((s) => s.name.toLowerCase() === name.toLowerCase())?.value;
    const extras = [
      ["fastBreakPoints", "Fast break pts"],
      ["pointsInPaint", "Points in paint"],
      ["turnoverPoints", "Points off turnovers"],
      ["largestLead", "Largest lead"],
      ["teamTurnovers", "Team turnovers"],
      ["technicalFouls", "Technical fouls"],
      ["flagrantFouls", "Flagrant fouls"],
    ].filter(([k]) => extra(away, k) != null || extra(home, k) != null);
    return (
      <Card title={<span className="flex w-full justify-between"><span>{away.team.abbr}</span><span>Team stats</span><span>{home.team.abbr}</span></span>}>
        <div className="grid gap-x-10 md:grid-cols-2">
          <div>
            <CompareBar label="FG%" a={fgPct(a)} b={fgPct(h)} fmtKind="pct" colorA={awayColor} colorB={homeColor} />
            <CompareBar label="3P%" a={tpPct(a)} b={tpPct(h)} fmtKind="pct" colorA={awayColor} colorB={homeColor} />
            <CompareBar label="FT%" a={ftPct(a)} b={ftPct(h)} fmtKind="pct" colorA={awayColor} colorB={homeColor} />
            <CompareBar label="2PT made" a={a.fgm - a.tpm} b={h.fgm - h.tpm} fmtKind="int" colorA={awayColor} colorB={homeColor} />
            <CompareBar label="3PT made" a={a.tpm} b={h.tpm} fmtKind="int" colorA={awayColor} colorB={homeColor} />
            <CompareBar label="Assists" a={a.ast} b={h.ast} fmtKind="int" colorA={awayColor} colorB={homeColor} />
            <CompareBar label="Turnovers" a={a.tov} b={h.tov} fmtKind="int" colorA={awayColor} colorB={homeColor} lowerBetter />
          </div>
          <div>
            <CompareBar label="Rebounds" a={a.reb} b={h.reb} fmtKind="int" colorA={awayColor} colorB={homeColor} />
            <CompareBar label="Off. rebounds" a={a.oreb} b={h.oreb} fmtKind="int" colorA={awayColor} colorB={homeColor} />
            <CompareBar label="Def. rebounds" a={a.dreb} b={h.dreb} fmtKind="int" colorA={awayColor} colorB={homeColor} />
            <CompareBar label="Steals" a={a.stl} b={h.stl} fmtKind="int" colorA={awayColor} colorB={homeColor} />
            <CompareBar label="Blocks" a={a.blk} b={h.blk} fmtKind="int" colorA={awayColor} colorB={homeColor} />
            <CompareBar label="Fouls" a={a.pf} b={h.pf} fmtKind="int" colorA={awayColor} colorB={homeColor} lowerBetter />
            {extras.map(([k, l]) => (
              <CompareBar key={k} label={l} a={Number(extra(away, k)) || 0} b={Number(extra(home, k)) || 0} fmtKind="int" colorA={awayColor} colorB={homeColor} />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  function AdvancedTab() {
    const a = away!.totals;
    const h = home!.totals;
    const poss = possessions(a, h);
    const pace = (poss * teamMinutes(rules, rules.periods)) / tm;
    const ffA = fourFactors(a, h);
    const ffH = fourFactors(h, a);
    const cols: Column[] = [
      { key: "min", label: "MIN", fmt: "int" },
      { key: "ts", label: "TS%", fmt: "pct", group: true, heat: true },
      { key: "efg", label: "eFG%", fmt: "pct", heat: true },
      { key: "usg", label: "USG%", heat: true },
      { key: "astp", label: "AST%", heat: true },
      { key: "orbp", label: "OREB%", group: true, heat: true },
      { key: "drbp", label: "DREB%", heat: true },
      { key: "trbp", label: "REB%", heat: true },
      { key: "stlp", label: "STL%", group: true },
      { key: "blkp", label: "BLK%" },
      { key: "astto", label: "AST/TO", fmt: "2", group: true },
      { key: "gmsc", label: "GmSc", heat: true },
      { key: "pm", label: "+/-", fmt: "signed", signed: true },
    ];
    const rows = (t: BoxTeam, o: BoxTeam): Row[] =>
      t.players
        .filter((p) => !p.dnp && p.box.min > 0)
        .map((p) => ({
          key: p.player.id,
          lead: { label: p.player.name, sub: p.player.pos, img: p.player.headshot, href: `/${league.id}/players/${p.player.id}` },
          cells: {
            min: p.box.min,
            ts: trueShooting(p.box),
            efg: effectiveFg(p.box),
            usg: usage(p.box, t.totals, tm),
            astp: astPct(p.box, t.totals, tm),
            orbp: orebPct(p.box, t.totals, o.totals, tm),
            drbp: drebPct(p.box, t.totals, o.totals, tm),
            trbp: rebPct(p.box, t.totals, o.totals, tm),
            stlp: stlPct(p.box, poss, tm),
            blkp: blkPct(p.box, o.totals, tm),
            astto: astToRatio(p.box),
            gmsc: gameScore(p.box),
            pm: p.box.pm ?? null,
          },
        }));
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Possessions" value={fmt(poss, "1")} />
          <Stat label="Pace" value={fmt(pace, "1")} sub="per 48 min" />
          <Stat label={`${away!.team.abbr} ORtg`} value={fmt(offRating(a.pts, poss), "1")} />
          <Stat label={`${home!.team.abbr} ORtg`} value={fmt(offRating(h.pts, poss), "1")} />
          <Stat label={`${away!.team.abbr} TS%`} value={fmt(trueShooting(a), "pct")} />
          <Stat label={`${home!.team.abbr} TS%`} value={fmt(trueShooting(h), "pct")} />
        </div>
        <Card title="Four factors">
          <table className="stat-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>eFG%</th>
                <th>TOV%</th>
                <th>OREB%</th>
                <th>FT/FGA</th>
                <th>ORtg</th>
                <th>DRtg</th>
                <th>NET</th>
              </tr>
            </thead>
            <tbody>
              {[
                [away!, ffA, a.pts, h.pts],
                [home!, ffH, h.pts, a.pts],
              ].map(([t, ff, pf, pa]) => {
                const tt = t as BoxTeam;
                const f = ff as ReturnType<typeof fourFactors>;
                const o = offRating(pf as number, poss);
                const d = offRating(pa as number, poss);
                return (
                  <tr key={tt.team.id}>
                    <td className="font-sans">{tt.team.name}</td>
                    <td>{fmt(f.efg, "pct")}</td>
                    <td>{fmt(f.tovPct, "pct")}</td>
                    <td>{fmt(f.orebPct, "pct")}</td>
                    <td>{fmt(f.ftRate, "3")}</td>
                    <td>{fmt(o, "1")}</td>
                    <td>{fmt(d, "1")}</td>
                    <td className={(o ?? 0) - (d ?? 0) >= 0 ? "!text-win" : "!text-loss"}>{fmt((o ?? 0) - (d ?? 0), "signed1")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        {[
          [away!, home!],
          [home!, away!],
        ].map(([t, o]) => (
          <Card key={t.team.id} title={`${t.team.name} — advanced`} pad={false}>
            <SortableTable columns={cols} rows={rows(t, o)} defaultSort={{ key: "gmsc", dir: "desc" }} />
          </Card>
        ))}
      </div>
    );
  }

  function ShotsTab() {
    const shots = extractShots(g!.plays, ctx);
    if (!shots.length) return <Empty>No shot data in the play-by-play for this game yet.</Empty>;
    const teams = [card.away.team, card.home.team].map((t) => ({ id: t.id, abbr: t.abbr, color: colorOf(t.id) }));
    const players = g!.box.flatMap((t) => t.players.filter((p) => !p.dnp).map((p) => ({ id: p.player.id, name: p.player.name, teamId: t.team.id })));
    const byPlayer = [...groupBy(shots, (s) => s.playerId ?? "?").entries()]
      .filter(([id]) => id !== "?")
      .map(([id, ss]) => {
        const q = shotQuality(ss, league);
        const rim = ss.filter((s) => s.zone === "Restricted Area");
        const mid = ss.filter((s) => s.zone === "Mid-Range");
        const three = ss.filter((s) => s.value === 3);
        const p = nameOf.get(id);
        return {
          key: id,
          lead: { label: p?.name ?? id, sub: abbrOf(ctx.teamOf.get(id) ?? ""), img: p?.headshot, href: `/${league.id}/players/${id}` },
          cells: {
            fga: q.fga,
            fgm: ss.filter((s) => s.made).length,
            rim: `${rim.filter((s) => s.made).length}-${rim.length}`,
            mid: `${mid.filter((s) => s.made).length}-${mid.length}`,
            three: `${three.filter((s) => s.made).length}-${three.length}`,
            ast: ss.filter((s) => s.made).length ? ss.filter((s) => s.assistId).length / ss.filter((s) => s.made).length : null,
            dist: ss.filter((s) => s.dist != null).length ? ss.reduce((a, s) => a + (s.dist ?? 0), 0) / ss.filter((s) => s.dist != null).length : null,
            pps: q.pps,
            xpps: q.xpps,
            making: q.making,
          },
        } satisfies Row;
      });
    return (
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <Card title="Shot chart">
            <ShotChart shots={shots} teams={teams} players={players} />
          </Card>
          <div className="space-y-5">
            {teams.map((t) => {
              const ts = shots.filter((s) => s.teamId === t.id);
              const zones = zoneSummary(ts, league);
              const q = shotQuality(ts, league);
              return (
                <Card key={t.id} title={`${t.abbr} shot zones`} right={`xPPS ${fmt(q.xpps, "2")} · PPS ${fmt(q.pps, "2")}`} pad={false}>
                  <table className="stat-table">
                    <thead>
                      <tr>
                        <th>Zone</th>
                        <th>FG</th>
                        <th>FG%</th>
                        <th>Freq</th>
                        <th>Pts</th>
                        <th>vs exp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SHOT_ZONES.map((z) => {
                        const r = zones.find((x) => x.zone === z)!;
                        return (
                          <tr key={z}>
                            <td className="font-sans">{z}</td>
                            <td>
                              {r.fgm}-{r.fga}
                            </td>
                            <td>{r.fga ? fmt(r.fgm / r.fga, "pct") : "–"}</td>
                            <td>{ts.length ? fmt(r.fga / ts.length, "pct0") : "–"}</td>
                            <td>{r.pts}</td>
                            <td className={r.pts - r.xPts >= 0 ? "!text-win" : "!text-loss"}>{r.fga ? fmt(r.pts - r.xPts, "signed1") : "–"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              );
            })}
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {teams.map((t) => {
            const ts = shots.filter((s) => s.teamId === t.id);
            const cats = [...groupBy(ts, (s) => s.category).entries()].map(([k, v]) => ({ label: k, value: v.length, sub: `${v.filter((x) => x.made).length}/${v.length}` })).sort((a, b) => b.value - a.value);
            return (
              <Card key={t.id} title={`${t.abbr} shot types`} right="Play-type proxy from shot descriptions">
                <Bars items={cats} fmtKind="int" color={t.color} />
              </Card>
            );
          })}
        </div>
        <Card title="Shot quality by player" right="xPPS = expected points per shot at league-average accuracy for those spots" pad={false}>
          <SortableTable
            columns={[
              { key: "fgm", label: "FGM", fmt: "int" },
              { key: "fga", label: "FGA", fmt: "int" },
              { key: "rim", label: "RIM", fmt: "text", group: true },
              { key: "mid", label: "MID", fmt: "text" },
              { key: "three", label: "3PT", fmt: "text" },
              { key: "dist", label: "AVG DIST", fmt: "1", group: true },
              { key: "ast", label: "AST'D", fmt: "pct0", title: "Share of makes that were assisted" },
              { key: "pps", label: "PPS", fmt: "2", group: true },
              { key: "xpps", label: "xPPS", fmt: "2", heat: true },
              { key: "making", label: "MAKING", fmt: "2", signed: true, title: "Points above expected per shot" },
            ]}
            rows={byPlayer}
            defaultSort={{ key: "fga", dir: "desc" }}
          />
        </Card>
      </div>
    );
  }

  function FlowTab() {
    const events = scoringEvents(g!.plays, ctx);
    const flow = scoringFlow(events, ctx, periodsPlayed);
    const runs = findRuns(events);
    const breaks = labels.slice(1).map((l, i) => ({ t: elapsedSeconds(rules, i + 2, periodSeconds(rules, i + 2)), label: l }));
    const mins = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Lead changes" value={flow.leadChanges} />
          <Stat label="Times tied" value={flow.ties} />
          <Stat label={`${card.away.team.abbr} largest lead`} value={flow.largestLead[card.away.team.id] ?? 0} />
          <Stat label={`${card.home.team.abbr} largest lead`} value={flow.largestLead[card.home.team.id] ?? 0} />
          <Stat label={`${card.away.team.abbr} time leading`} value={mins(flow.secondsLeading[card.away.team.id] ?? 0)} />
          <Stat label={`${card.home.team.abbr} time leading`} value={mins(flow.secondsLeading[card.home.team.id] ?? 0)} />
        </div>
        <Card title="Score margin">
          <LeadChart flow={flow} homeColor={homeColor} awayColor={awayColor} homeAbbr={card.home.team.abbr} awayAbbr={card.away.team.abbr} periodBreaks={breaks} />
        </Card>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Scoring by period" right={<span><span style={{ color: awayColor }}>■</span> {card.away.team.abbr} <span style={{ color: homeColor }}>■</span> {card.home.team.abbr}</span>}>
            <PeriodBars labels={labels} away={card.away.linescores} home={card.home.linescores} awayColor={awayColor} homeColor={homeColor} />
          </Card>
          <Card title="Scoring runs" right="8+ point margin, opponent held to ≤25%" pad={false}>
            {runs.length ? (
              <ul>
                {runs.map((r, i) => (
                  <li key={i} className="flex items-center gap-3 border-t border-ink-850 px-4 py-2 text-sm first:border-t-0">
                    <span className="h-6 w-1 rounded" style={{ background: colorOf(r.teamId) }} />
                    <span className="display w-12 font-bold">{abbrOf(r.teamId)}</span>
                    <span className="num text-lg font-semibold">
                      {r.forPts}–{r.againstPts}
                    </span>
                    {r.unanswered && <span className="chip !text-[10px]">unanswered</span>}
                    <span className="ml-auto text-right text-xs text-ink-500">
                      {periodLabel(rules, r.start.period)} {r.start.clock} → {periodLabel(rules, r.end.period)} {r.end.clock}
                      <br />
                      <span className="num">
                        {r.start.away}-{r.start.home} → {r.end.away}-{r.end.home}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4">
                <Empty>No runs of 8+ points.</Empty>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  function ClutchTab() {
    const win = sp.clutch === "2" ? { seconds: 120, margin: 5 } : sp.clutch === "all4" ? { seconds: periodSeconds(rules, rules.periods), margin: 999 } : rules.clutch;
    const c = clutchStats(g!.plays, ctx, win);
    const options = [
      { id: "5", label: `Clutch (last ${rules.clutch.seconds / 60} min, ≤${rules.clutch.margin})` },
      { id: "2", label: "Last 2 min, ≤5" },
      { id: "all4", label: `Whole ${periodLabel(rules, rules.periods)} + OT` },
    ];
    const active = sp.clutch ?? "5";
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <Link key={o.id} href={`${base}?tab=clutch&clutch=${o.id}`} scroll={false} className={`chip ${active === o.id ? "!border-court !text-court" : ""}`}>
              {o.label}
            </Link>
          ))}
        </div>
        {c.plays === 0 ? (
          <Empty>This game never reached that window — no clutch time.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Plays in window" value={c.plays} />
              <Stat label={`${card.away.team.abbr} pts`} value={c.teamPts[card.away.team.id] ?? 0} />
              <Stat label={`${card.home.team.abbr} pts`} value={c.teamPts[card.home.team.id] ?? 0} />
              <Stat
                label="Window margin"
                value={fmt((c.teamPts[card.home.team.id] ?? 0) - (c.teamPts[card.away.team.id] ?? 0), "signed")}
                sub={`${card.home.team.abbr} perspective`}
              />
            </div>
            <Card title="Player stats in window" pad={false}>
              <SortableTable
                columns={[
                  { key: "pts", label: "PTS", fmt: "int" },
                  { key: "fg", label: "FG", fmt: "text" },
                  { key: "tp", label: "3PT", fmt: "text" },
                  { key: "ft", label: "FT", fmt: "text" },
                  { key: "reb", label: "REB", fmt: "int", group: true },
                  { key: "ast", label: "AST", fmt: "int" },
                  { key: "stl", label: "STL", fmt: "int" },
                  { key: "blk", label: "BLK", fmt: "int" },
                  { key: "tov", label: "TOV", fmt: "int" },
                  { key: "pf", label: "PF", fmt: "int" },
                ]}
                rows={c.players.map((p) => ({
                  key: p.id,
                  lead: { label: nameOf.get(p.id)?.name ?? p.id, sub: abbrOf(p.teamId), img: nameOf.get(p.id)?.headshot, href: `/${league.id}/players/${p.id}` },
                  cells: {
                    pts: p.box.pts,
                    fg: `${p.box.fgm}-${p.box.fga}`,
                    tp: `${p.box.tpm}-${p.box.tpa}`,
                    ft: `${p.box.ftm}-${p.box.fta}`,
                    reb: p.box.reb,
                    ast: p.box.ast,
                    stl: p.box.stl,
                    blk: p.box.blk,
                    tov: p.box.tov,
                    pf: p.box.pf,
                  },
                }))}
                defaultSort={{ key: "pts", dir: "desc" }}
              />
            </Card>
          </>
        )}
      </div>
    );
  }

  function LineupsTab() {
    const rows = lineupStats(g!.plays, g!.box, ctx).filter((r) => r.seconds >= 60);
    return (
      <div className="space-y-5">
        <p className="text-xs text-ink-500">
          Lineups are reconstructed from starters and substitution events in the play-by-play (period starters are inferred). Possessions are counted from
          possession-ending events. Minimum 1 minute together.
        </p>
        {[card.away.team, card.home.team].map((t) => {
          const rs = rows.filter((r) => r.teamId === t.id);
          return (
            <Card key={t.id} title={`${t.name} — 5-man lineups`} pad={false}>
              {rs.length ? (
                <SortableTable
                  leadLabel="Lineup"
                  columns={[
                    { key: "min", label: "MIN", fmt: "min" },
                    { key: "pf", label: "PTS F", fmt: "int", group: true },
                    { key: "pa", label: "PTS A", fmt: "int" },
                    { key: "pm", label: "+/-", fmt: "signed", signed: true },
                    { key: "poss", label: "POSS", fmt: "int", group: true },
                    { key: "ortg", label: "ORtg", fmt: "1", heat: true },
                    { key: "drtg", label: "DRtg", fmt: "1", heat: true, invert: true },
                    { key: "net", label: "NET", fmt: "signed1", signed: true },
                  ]}
                  rows={rs.map((r) => ({
                    key: r.ids.join("|"),
                    lead: { label: r.ids.map(shortName).join(", ") },
                    cells: {
                      min: r.seconds / 60,
                      pf: r.ptsFor,
                      pa: r.ptsAgainst,
                      pm: r.ptsFor - r.ptsAgainst,
                      poss: r.possFor,
                      ortg: r.possFor ? (100 * r.ptsFor) / r.possFor : null,
                      drtg: r.possAgainst ? (100 * r.ptsAgainst) / r.possAgainst : null,
                      net: r.possFor && r.possAgainst ? (100 * r.ptsFor) / r.possFor - (100 * r.ptsAgainst) / r.possAgainst : null,
                    },
                  }))}
                  defaultSort={{ key: "min", dir: "desc" }}
                />
              ) : (
                <div className="p-4">
                  <Empty>Not enough substitution data to rebuild lineups.</Empty>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  function TurnoversTab() {
    const rows = turnoverBreakdown(g!.plays, ctx);
    const box = boxFromPlays(g!.plays, ctx);
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        {rows.map((r) => {
          const t = r.teamId === card.home.team.id ? card.home.team : card.away.team;
          const players = [...box.entries()].filter(([id, b]) => ctx.teamOf.get(id) === r.teamId && b.tov > 0).sort((a, b) => b[1].tov - a[1].tov);
          const total = r.live + r.dead;
          return (
            <Card key={r.teamId} title={`${t.name} turnovers`}>
              <div className="mb-4 grid grid-cols-3 gap-3">
                <Stat label="Total" value={total} />
                <Stat label="Live-ball" value={r.live} sub={total ? fmt(r.live / total, "pct0") : ""} tone="loss" />
                <Stat label="Dead-ball" value={r.dead} sub={total ? fmt(r.dead / total, "pct0") : ""} />
              </div>
              <div className="display mb-2 text-xs text-ink-500">By type</div>
              <Bars items={r.byType.map((x) => ({ label: x.type, value: x.n }))} fmtKind="int" color={colorOf(r.teamId)} />
              {players.length > 0 && (
                <>
                  <div className="display mb-2 mt-4 text-xs text-ink-500">By player</div>
                  <Bars items={players.map(([id, b]) => ({ label: nameOf.get(id)?.name ?? id, value: b.tov }))} fmtKind="int" color={colorOf(r.teamId)} />
                </>
              )}
              <p className="mt-3 text-[11px] text-ink-500">Live-ball = turnovers with a steal (opponent can run). Dead-ball = out of bounds, violations, offensive fouls.</p>
            </Card>
          );
        })}
      </div>
    );
  }

  function PbpTab() {
    const view = sp.view === "poss" ? "poss" : "plays";
    const periodSel = Number(sp.period) || 0;
    const plays = g!.plays.filter((p) => !periodSel || p.period === periodSel);
    const poss = view === "poss" ? possessionLog(g!.plays, ctx).filter((p) => !periodSel || p.period === periodSel) : [];
    const link = (o: Record<string, string | number>) => {
      const q = new URLSearchParams({ tab: "pbp", view, period: String(periodSel), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) });
      return `${base}?${q}`;
    };
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <Link href={link({ view: "plays" })} scroll={false} className={`chip ${view === "plays" ? "!border-court !text-court" : ""}`}>
            Every play
          </Link>
          <Link href={link({ view: "poss" })} scroll={false} className={`chip ${view === "poss" ? "!border-court !text-court" : ""}`}>
            By possession
          </Link>
          <span className="mx-1 h-4 w-px self-center bg-ink-700" />
          <Link href={link({ period: 0 })} scroll={false} className={`chip ${!periodSel ? "!border-court !text-court" : ""}`}>
            All
          </Link>
          {labels.map((l, i) => (
            <Link key={l} href={link({ period: i + 1 })} scroll={false} className={`chip ${periodSel === i + 1 ? "!border-court !text-court" : ""}`}>
              {l}
            </Link>
          ))}
        </div>
        <Card pad={false}>
          {view === "plays" ? (
            <ul className="max-h-[75vh] overflow-auto">
              {plays.map((p) => {
                const team = p.teamId ?? (p.athletes[0] ? ctx.teamOf.get(p.athletes[0]) : null);
                return (
                  <li key={p.id} className={`grid grid-cols-[3rem_3.5rem_1fr_4.5rem] items-center gap-3 border-t border-ink-850 px-4 py-1.5 text-sm first:border-t-0 ${p.scoring ? "bg-ink-850/60" : ""}`}>
                    <span className="num text-xs text-ink-500">{periodLabel(rules, p.period)}</span>
                    <span className="num text-xs text-ink-400">{p.clockDisplay}</span>
                    <span className="flex items-center gap-2">
                      {team && <span className="h-4 w-1 shrink-0 rounded" style={{ background: colorOf(team) }} />}
                      <span className={p.scoring ? "font-medium text-ink-100" : "text-ink-300"}>{p.text}</span>
                    </span>
                    <span className="num text-right text-xs text-ink-300">
                      {p.awayScore}-{p.homeScore}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="max-h-[75vh] overflow-auto">
              {poss.map((p) => (
                <li key={p.n} className="border-t border-ink-850 px-4 py-2 first:border-t-0">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="h-5 w-1 rounded" style={{ background: colorOf(p.teamId) }} />
                    <span className="num w-10 text-xs text-ink-500">#{p.n}</span>
                    <span className="display w-12 font-bold">{abbrOf(p.teamId)}</span>
                    <span className="num text-xs text-ink-500">
                      {periodLabel(rules, p.period)} {p.startClock}–{p.endClock}
                    </span>
                    <span className="text-xs text-ink-400">{p.result}</span>
                    <span className={`num ml-auto font-semibold ${p.points ? "text-court" : "text-ink-600"}`}>{p.points} pts</span>
                  </div>
                  <div className="ml-7 mt-1 space-y-0.5 text-xs text-ink-500">
                    {p.playIdx.map((i) => (
                      <div key={i}>{g!.plays[i]?.text}</div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  async function PlayersTab() {
    const splits: { id: Split; label: string }[] = [
      { id: "season", label: "This season" },
      { id: "prev", label: "Last season" },
      { id: "l5", label: "Last 5 games" },
      { id: "l10", label: "Last 10 games" },
    ];
    const split = (splits.find((x) => x.id === sp.split)?.id ?? "season") as Split;
    const cur = await resolveSeason(league, undefined);
    const data = await compareRosters(league, g!, cur.year, split);
    const withStats = data.players.filter((p) => (p.cells.gp ?? 0) > 0).length;
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="display mr-1 text-xs text-ink-500">Stats from</span>
          {splits.map((x) => (
            <Link key={x.id} href={`${base}?tab=players&split=${x.id}`} scroll={false} className={`chip ${x.id === split ? "!border-court !text-court" : "hover:text-ink-100"}`}>
              {x.label}
            </Link>
          ))}
          <span className="ml-2 text-xs text-ink-500">
            {data.splitLabel} · {withStats} of {data.players.length} players have stats
          </span>
        </div>
        {split === "season" && withStats < data.players.length / 3 && (
          <p className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-ink-400">
            It&apos;s early in the season, so many players have only a game or two.{" "}
            <Link href={`${base}?tab=players&split=prev`} className="text-court hover:underline">
              Compare last season instead →
            </Link>
          </p>
        )}
        <PlayerCompare data={data} league={league.id} />
      </div>
    );
  }

  async function Preview() {
    const sel = await resolveSeason(league, undefined);
    let table = await getLeagueTable(league, sel.year, 2);
    if (!table.averages) table = await getLeagueTable(league, sel.year - 1, 2);
    const rowMap = new Map(table.rows.map((r) => [r.team.id, r]));
    const A = rowMap.get(card.away.team.id);
    const H = rowMap.get(card.home.team.id);
    const proj = projectGame(card, rowMap);
    const inj = (id: string) => g!.injuries.find((i) => i.teamId === id)?.items ?? [];
    const l5 = (id: string) => g!.lastFive.find((i) => i.teamId === id)?.games ?? [];
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Projected score" value={proj ? `${fmt(proj.away, "int")}–${fmt(proj.home, "int")}` : "–"} sub={`${card.away.team.abbr}–${card.home.team.abbr}`} />
          <Stat label="Projected total" value={proj ? fmt(proj.away + proj.home, "1") : "–"} tone="accent" sub={table.averages ? `League avg ${fmt(table.averages.total, "1")}` : undefined} />
          <Stat label="Betting line" value={card.odds?.details || "–"} />
          <Stat label="Over/under" value={card.odds?.overUnder ?? "–"} />
        </div>
        {A && H && (
          <Card title={<span className="flex w-full justify-between"><span>{card.away.team.abbr}</span><span>Season comparison</span><span>{card.home.team.abbr}</span></span>}>
            <div className="grid gap-x-10 md:grid-cols-2">
              <div>
                <CompareBar label="PPG" a={A.ppg} b={H.ppg} colorA={awayColor} colorB={homeColor} />
                <CompareBar label="Opp PPG" a={A.oppg} b={H.oppg} colorA={awayColor} colorB={homeColor} lowerBetter />
                <CompareBar label="Net rating" a={A.net} b={H.net} fmtKind="signed1" colorA={awayColor} colorB={homeColor} />
                <CompareBar label="Pace" a={A.pace} b={H.pace} colorA={awayColor} colorB={homeColor} />
                <CompareBar label="Avg game total" a={A.avgTotal} b={H.avgTotal} colorA={awayColor} colorB={homeColor} />
              </div>
              <div>
                <CompareBar label="eFG%" a={A.efg} b={H.efg} fmtKind="pct" colorA={awayColor} colorB={homeColor} />
                <CompareBar label="TS%" a={A.ts} b={H.ts} fmtKind="pct" colorA={awayColor} colorB={homeColor} />
                <CompareBar label="TOV%" a={A.tovPct} b={H.tovPct} fmtKind="pct" colorA={awayColor} colorB={homeColor} lowerBetter />
                <CompareBar label="Rebounds" a={A.season?.perGame.reb ?? null} b={H.season?.perGame.reb ?? null} colorA={awayColor} colorB={homeColor} />
                <CompareBar label="3PA rate" a={A.threeRate} b={H.threeRate} fmtKind="pct" colorA={awayColor} colorB={homeColor} />
              </div>
            </div>
          </Card>
        )}
        <div className="grid gap-5 lg:grid-cols-2">
          {[card.away.team, card.home.team].map((t) => (
            <Card key={t.id} title={`${t.name}`}>
              <div className="display mb-1.5 text-xs text-ink-500">Last five</div>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {l5(t.id).length
                  ? l5(t.id).map((x, i) => (
                      <span key={i} className={`chip num ${x.result === "W" ? "!text-win" : x.result === "L" ? "!text-loss" : ""}`}>
                        {x.result} {x.score} {x.opp}
                      </span>
                    ))
                  : <span className="text-xs text-ink-500">—</span>}
              </div>
              <div className="display mb-1.5 text-xs text-ink-500">Injuries</div>
              {inj(t.id).length ? (
                <ul className="space-y-1 text-xs">
                  {inj(t.id).map((i) => (
                    <li key={i.name} className="flex justify-between">
                      <span>{i.name}</span>
                      <span className="text-loss">
                        {i.status}
                        {i.detail && <span className="text-ink-500"> · {i.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-ink-500">None reported</span>
              )}
            </Card>
          ))}
        </div>
        {g!.seasonSeries.length > 0 && (
          <Card title="Season series">
            <ul className="text-sm text-ink-300">
              {g!.seasonSeries.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }
}
