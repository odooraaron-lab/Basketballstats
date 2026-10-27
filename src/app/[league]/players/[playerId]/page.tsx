import Link from "next/link";
import { notFound } from "next/navigation";
import { Headshot, TeamLogo } from "@/components/Img";
import { ShotChart } from "@/components/ShotChart";
import { PlayerTrackingPanel } from "@/components/TrackingPanels";
import { SortableTable, type Column, type Row } from "@/components/SortableTable";
import { Bars, Card, Empty, SeasonPicker, Stat, Tabs } from "@/components/ui";
import { SHOT_ZONES } from "@/leagues/types";
import { getLeague } from "@/leagues/registry";
import { getAthlete, getGameSummary, getPlayerGameLog, getPlayerSeasons } from "@/lib/espn";
import { fmt, fmtDay, hex } from "@/lib/format";
import { getLeagueTable, resolveSeason } from "@/lib/league";
import { findPlayer, nbaHeadshot, rows as nbaRows, seasonFolder } from "@/lib/nbacom";
import { playerTracking } from "@/lib/tracking";
import { buildCtx, extractShots, groupBy, shotQuality, zoneSummary, type Shot } from "@/lib/pbp";
import { teamMinutes } from "@/lib/rules";
import {
  addBox,
  astToRatio,
  effectiveFg,
  emptyBox,
  fgPct,
  ftPct,
  gameScore,
  per,
  tpPct,
  trueShooting,
  usage,
  type BoxLine,
} from "@/lib/stats";

export const revalidate = 900;

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string; playerId: string }>;
  searchParams: Promise<{ season?: string; type?: string; tab?: string }>;
}) {
  const { league: lid, playerId } = await params;
  const sp = await searchParams;
  const league = getLeague(lid);
  const sel = await resolveSeason(league, sp);
  const tab = sp.tab ?? "overview";

  const [a, regSeasons, poSeasons, log] = await Promise.all([
    getAthlete(league, playerId),
    getPlayerSeasons(league, playerId, 2),
    getPlayerSeasons(league, playerId, 3),
    getPlayerGameLog(league, playerId, sel.year),
  ]);
  if (!a) notFound();

  const folder = seasonFolder(sel.year, sel.type);
  const hasTracking = league.features.nbaComTracking;
  const nbaRow = hasTracking ? findPlayer(await nbaRows(folder, "player_base"), a.name, a.team?.abbr) : null;
  const tracking = hasTracking && tab === "tracking" ? await playerTracking(folder, a.name, a.team?.abbr) : null;

  const seasons = sel.type === 3 ? poSeasons : regSeasons;
  const thisSeasonRows = seasons.filter((s) => s.year === sel.year);
  const cur = thisSeasonRows.find((s) => s.teamId === a.team?.id) ?? thisSeasonRows[thisSeasonRows.length - 1] ?? null;
  const teamColor = hex(a.team?.color);

  const table = await getLeagueTable(league, sel.year, sel.type);
  const teamRow = table.rows.find((r) => r.team.id === (cur?.teamId || a.team?.id)) ?? null;
  const tmMin = teamMinutes(league.rules, league.rules.periods);
  const b = cur?.avg ?? null;
  const usg = b && teamRow?.season ? usage(b, teamRow.season.perGame, tmMin) : null;
  const perVal = b && teamRow?.season && table.context ? per(b, { totals: teamRow.season.perGame, pace: teamRow.pace }, table.context) : null;

  const games = log.filter((g) => g.seasonType !== 1); // skip preseason
  const last = (n: number) => {
    const g = games.slice(0, n);
    if (!g.length) return null;
    const sum = g.reduce((acc, x) => addBox(acc, x.box), emptyBox());
    const avg = emptyBox();
    (Object.keys(avg) as (keyof BoxLine)[]).forEach((k) => (avg[k] = (sum[k] ?? 0) / g.length));
    return { n: g.length, avg, ts: trueShooting(sum) };
  };
  const l5 = last(5);
  const l10 = last(10);

  // Recent-games shot chart (last 5 games' play-by-play)
  let shots: Shot[] = [];
  if (tab === "shots" || tab === "overview") {
    const recent = games.slice(0, tab === "shots" ? 10 : 5);
    const sums = await Promise.all(recent.map((g) => getGameSummary(league, g.eventId)));
    for (const s of sums) {
      if (!s) continue;
      const ctx = buildCtx(league, s.box, s.card.home.team.id, s.card.away.team.id);
      shots = shots.concat(extractShots(s.plays, ctx).filter((x) => x.playerId === playerId));
    }
  }
  const zones = zoneSummary(shots, league);
  const sq = shotQuality(shots, league);
  const byCat = [...groupBy(shots, (s) => s.category).entries()]
    .map(([k, v]) => ({ k, fga: v.length, fgm: v.filter((x) => x.made).length, pts: v.reduce((acc, x) => acc + (x.made ? x.value : 0), 0) }))
    .sort((x, y) => y.fga - x.fga);
  const assistedMakes = shots.filter((s) => s.made && s.assistId).length;
  const makes = shots.filter((s) => s.made).length;

  const base = `/${league.id}/players/${playerId}`;

  const logCols: Column[] = [
    { key: "opp", label: "OPP", fmt: "text" },
    { key: "res", label: "RES", fmt: "text" },
    { key: "min", label: "MIN", fmt: "int" },
    { key: "pts", label: "PTS", group: true, heat: true },
    { key: "fg", label: "FG", fmt: "text" },
    { key: "fgp", label: "FG%", fmt: "pct" },
    { key: "tp", label: "3PT", fmt: "text" },
    { key: "ft", label: "FT", fmt: "text" },
    { key: "reb", label: "REB", group: true, heat: true },
    { key: "ast", label: "AST", heat: true },
    { key: "stl", label: "STL", heat: true },
    { key: "blk", label: "BLK", heat: true },
    { key: "tov", label: "TOV", heat: true, invert: true },
    { key: "pf", label: "PF" },
    { key: "pm", label: "+/-", fmt: "signed", signed: true },
    { key: "ts", label: "TS%", fmt: "pct", group: true },
    { key: "gmsc", label: "GmSc", heat: true },
  ];
  const logRows: Row[] = games.map((g) => ({
    key: g.eventId,
    lead: { label: fmtDay(g.date), sub: g.score, href: `/${league.id}/games/${g.eventId}` },
    cells: {
      opp: `${g.atVs} ${g.opp}`,
      res: g.result,
      min: g.box.min,
      pts: g.box.pts,
      fg: `${g.box.fgm}-${g.box.fga}`,
      fgp: fgPct(g.box),
      tp: `${g.box.tpm}-${g.box.tpa}`,
      ft: `${g.box.ftm}-${g.box.fta}`,
      reb: g.box.reb,
      ast: g.box.ast,
      stl: g.box.stl,
      blk: g.box.blk,
      tov: g.box.tov,
      pf: g.box.pf,
      pm: g.box.pm ?? null,
      ts: trueShooting(g.box),
      gmsc: gameScore(g.box),
    },
  }));

  const careerCols: Column[] = [
    { key: "team", label: "TEAM", fmt: "text" },
    { key: "gp", label: "GP", fmt: "int" },
    { key: "gs", label: "GS", fmt: "int" },
    { key: "min", label: "MIN" },
    { key: "pts", label: "PTS", group: true, heat: true },
    { key: "fgp", label: "FG%", fmt: "pct", group: true },
    { key: "tpm", label: "3PM" },
    { key: "tpp", label: "3P%", fmt: "pct" },
    { key: "ftp", label: "FT%", fmt: "pct" },
    { key: "oreb", label: "OREB", group: true },
    { key: "dreb", label: "DREB" },
    { key: "reb", label: "REB", heat: true },
    { key: "ast", label: "AST", heat: true },
    { key: "stl", label: "STL" },
    { key: "blk", label: "BLK" },
    { key: "tov", label: "TOV", invert: true },
    { key: "pf", label: "PF" },
    { key: "ts", label: "TS%", fmt: "pct", group: true, heat: true },
    { key: "efg", label: "eFG%", fmt: "pct" },
    { key: "astto", label: "AST/TO", fmt: "2" },
  ];
  const careerRows = (rows: typeof seasons): Row[] =>
    rows
      .slice()
      .reverse()
      .map((s, i) => ({
        key: `${s.year}-${s.teamId}-${i}`,
        lead: { label: s.season, href: `${base}?season=${s.year}&type=${sel.type}` },
        cells: {
          team: s.teamAbbr || "TOT",
          gp: s.gp,
          gs: s.gs,
          min: s.avg.min,
          pts: s.avg.pts,
          fgp: fgPct(s.avg),
          tpm: s.avg.tpm,
          tpp: tpPct(s.avg),
          ftp: ftPct(s.avg),
          oreb: s.avg.oreb,
          dreb: s.avg.dreb,
          reb: s.avg.reb,
          ast: s.avg.ast,
          stl: s.avg.stl,
          blk: s.avg.blk,
          tov: s.avg.tov,
          pf: s.avg.pf,
          ts: trueShooting(s.avg),
          efg: effectiveFg(s.avg),
          astto: astToRatio(s.avg),
        },
      }));

  // Points trend (oldest → newest)
  const trend = games.slice(0, 20).reverse();
  const tMax = Math.max(10, ...trend.map((g) => g.box.pts));

  return (
    <div className="space-y-5">
      <div className="card relative overflow-hidden" style={{ background: `linear-gradient(110deg, ${teamColor}40 0%, rgb(var(--ink-900)) 60%)` }}>
        <div className="flex flex-wrap items-end gap-6 p-5">
          <Headshot src={a.headshot} fallback={nbaHeadshot(nbaRow?.PLAYER_ID as number)} name={a.name} size={132} ring={teamColor} />
          <div className="min-w-[14rem] flex-1">
            {a.team && (
              <Link href={`/${league.id}/teams/${a.team.id}`} className="mb-1 flex items-center gap-2 text-sm text-ink-300 hover:text-court">
                <TeamLogo src={a.team.logo} alt={a.team.abbr} size={22} />
                {a.team.name}
              </Link>
            )}
            <h1 className="display text-4xl font-extrabold leading-none sm:text-5xl">{a.name}</h1>
            <div className="mt-2 text-sm text-ink-300">
              {a.jersey && <span className="num mr-2">#{a.jersey}</span>}
              {a.pos}
              {a.status && a.status !== "Active" && <span className="ml-2 text-loss">{a.status}</span>}
            </div>
            {a.injury && <div className="mt-1 text-xs text-loss">Injury: {a.injury}</div>}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-4">
            {(
              [
                ["Height", a.height],
                ["Weight", a.weight],
                ["Age", a.age],
                ["Born", a.dob],
                ["From", a.birthPlace],
                ["College", a.college],
                ["Draft", a.draft],
                ["Experience", a.experience],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="display text-[10px] text-ink-500">{k}</dt>
                  <dd className="text-ink-200">{v}</dd>
                </div>
              ))}
          </dl>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SeasonPicker base={base} current={sel.current} year={sel.year} type={sel.type} extra={{ tab }} />
      </div>

      <Tabs
        base={base}
        active={tab}
        params={{ season: sp.season, type: sp.type }}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "log", label: "Game log" },
          { id: "shots", label: "Shot chart" },
          { id: "career", label: "Career" },
          ...(hasTracking ? [{ id: "tracking", label: "Tracking" }] : []),
        ]}
      />

      {tab === "overview" && (
        <div className="space-y-5">
          {b ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              <Stat label="PTS" value={fmt(b.pts, "1")} sub={`${cur?.gp} GP · ${fmt(b.min, "1")} MIN`} tone="accent" />
              <Stat label="REB" value={fmt(b.reb, "1")} sub={`${fmt(b.oreb, "1")} off · ${fmt(b.dreb, "1")} def`} />
              <Stat label="AST" value={fmt(b.ast, "1")} sub={`AST/TO ${fmt(astToRatio(b), "2")}`} />
              <Stat label="STL / BLK" value={`${fmt(b.stl, "1")} / ${fmt(b.blk, "1")}`} />
              <Stat label="TOV" value={fmt(b.tov, "1")} sub={`PF ${fmt(b.pf, "1")}`} />
              <Stat label="TS%" value={fmt(trueShooting(b), "pct")} sub={`eFG ${fmt(effectiveFg(b), "pct")}`} />
              <Stat label="USG%" value={fmt(usg, "1")} sub="Possessions used" />
              <Stat label="PER (est.)" value={fmt(perVal, "1")} sub="League avg = 15" />
            </div>
          ) : (
            <Empty>No {sel.label} stats for this player yet. Pick another season above.</Empty>
          )}

          {b && (
            <div className="grid gap-5 lg:grid-cols-3">
              <Card title="Shooting splits">
                {(
                  [
                    ["FG", b.fgm, b.fga, fgPct(b)],
                    ["2PT", b.fgm - b.tpm, b.fga - b.tpa, b.fga - b.tpa > 0 ? (b.fgm - b.tpm) / (b.fga - b.tpa) : null],
                    ["3PT", b.tpm, b.tpa, tpPct(b)],
                    ["FT", b.ftm, b.fta, ftPct(b)],
                  ] as const
                ).map(([l, m, at, p]) => (
                  <div key={l} className="mb-2.5">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="display text-ink-400">{l}</span>
                      <span className="num">
                        {fmt(m, "1")}-{fmt(at, "1")} · <span className="font-semibold">{fmt(p, "pct")}%</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                      <div className="h-full rounded-full bg-court" style={{ width: `${(p ?? 0) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </Card>
              <Card title="Recent form">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div />
                  <div className="display text-ink-500">Last {l5?.n ?? 5}</div>
                  <div className="display text-ink-500">Last {l10?.n ?? 10}</div>
                  {(["pts", "reb", "ast", "stl", "blk", "tov"] as const).map((k) => (
                    <div key={k} className="contents">
                      <div className="display text-left text-ink-400">{k.toUpperCase()}</div>
                      <div className="num">{fmt(l5?.avg[k], "1")}</div>
                      <div className="num">{fmt(l10?.avg[k], "1")}</div>
                    </div>
                  ))}
                  <div className="display text-left text-ink-400">TS%</div>
                  <div className="num">{fmt(l5?.ts, "pct")}</div>
                  <div className="num">{fmt(l10?.ts, "pct")}</div>
                </div>
              </Card>
              <Card title="Points — last 20 games">
                {trend.length ? (
                  <div className="flex h-36 items-end gap-1">
                    {trend.map((g) => (
                      <Link
                        key={g.eventId}
                        href={`/${league.id}/games/${g.eventId}`}
                        title={`${fmtDay(g.date)} ${g.atVs} ${g.opp}: ${g.box.pts} pts`}
                        className="group flex flex-1 flex-col items-center justify-end"
                      >
                        <span className="num mb-0.5 text-[9px] text-ink-500 group-hover:text-ink-100">{g.box.pts}</span>
                        <span
                          className={`w-full rounded-t ${g.result === "W" ? "bg-win/70" : "bg-loss/60"} group-hover:bg-court`}
                          style={{ height: `${(g.box.pts / tMax) * 110}px` }}
                        />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Empty>No games logged.</Empty>
                )}
              </Card>
            </div>
          )}

          {shots.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Shot chart — last 5 games" right={<Link href={`${base}?tab=shots&season=${sel.year}`} className="hover:text-court">Last 10 →</Link>}>
                <ShotChart three={{ arc: league.rules.threePointFt, corner: league.rules.cornerThreeFt }} shots={shots} teams={[{ id: shots[0].teamId ?? "", abbr: "", color: teamColor }]} players={[]} compact />
              </Card>
              <ZonesCard zones={zones} sq={sq} />
            </div>
          )}
        </div>
      )}

      {tab === "log" && (
        <Card title={`Game log · ${sel.label.replace(" Playoffs", "")}`} right="Includes regular season and playoffs" pad={false}>
          {logRows.length ? <SortableTable columns={logCols} rows={logRows} leadLabel="Date" maxHeight={760} /> : <div className="p-4"><Empty>No games.</Empty></div>}
        </Card>
      )}

      {tab === "shots" && (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Card title="Shot chart — last 10 games">
            {shots.length ? (
              <ShotChart three={{ arc: league.rules.threePointFt, corner: league.rules.cornerThreeFt }} shots={shots} teams={[{ id: shots[0].teamId ?? "", abbr: a.team?.abbr ?? "", color: teamColor }]} players={[]} />
            ) : (
              <Empty>No shot data for recent games.</Empty>
            )}
          </Card>
          <div className="space-y-5">
            <ZonesCard zones={zones} sq={sq} />
            <Card title="Shot types (play-type proxy)">
              <Bars items={byCat.map((c) => ({ label: c.k, value: c.fga, sub: `${c.fgm}/${c.fga}` }))} fmtKind="int" />
              <p className="mt-3 text-[11px] text-ink-500">
                Assisted makes: {makes ? `${assistedMakes}/${makes} (${Math.round((assistedMakes / makes) * 100)}%)` : "–"}. Categories come from the shot
                description; catch-and-shoot vs off-the-dribble is estimated from whether the make was assisted.
              </p>
            </Card>
          </div>
        </div>
      )}

      {hasTracking && tab === "tracking" &&
        (tracking ? (
          <PlayerTrackingPanel t={tracking} league={league.id} season={sel.label} />
        ) : (
          <Empty>
            NBA.com tracking data for {sel.label} hasn&apos;t been synced yet — see the{" "}
            <Link href={`/${league.id}/tracking?season=${sel.year}&type=${sel.type}`} className="text-court">
              Tracking page
            </Link>{" "}
            for the one-line sync command.
          </Empty>
        ))}

      {tab === "career" && (
        <div className="space-y-5">
          <Card title="Regular season — per game" pad={false}>
            {regSeasons.length ? <SortableTable columns={careerCols} rows={careerRows(regSeasons)} leadLabel="Season" /> : <div className="p-4"><Empty>No data.</Empty></div>}
          </Card>
          {poSeasons.length > 0 && (
            <Card title="Playoffs — per game" pad={false}>
              <SortableTable columns={careerCols} rows={careerRows(poSeasons)} leadLabel="Season" />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ZonesCard({ zones, sq }: { zones: ReturnType<typeof zoneSummary>; sq: ReturnType<typeof shotQuality> }) {
  return (
    <Card title="Shot zones" right="xPts = league-average make rate from that zone">
      <table className="stat-table">
        <thead>
          <tr>
            <th>Zone</th>
            <th>FG</th>
            <th>FG%</th>
            <th>Freq</th>
            <th>Pts</th>
            <th>xPts</th>
            <th>+/-</th>
          </tr>
        </thead>
        <tbody>
          {SHOT_ZONES.map((z) => {
            const r = zones.find((x) => x.zone === z)!;
            const tot = zones.reduce((a, x) => a + x.fga, 0);
            return (
              <tr key={z}>
                <td className="font-sans">{z}</td>
                <td>
                  {r.fgm}-{r.fga}
                </td>
                <td>{r.fga ? fmt(r.fgm / r.fga, "pct") : "–"}</td>
                <td>{tot ? fmt(r.fga / tot, "pct0") : "–"}</td>
                <td>{r.pts}</td>
                <td>{fmt(r.xPts, "1")}</td>
                <td className={r.pts - r.xPts >= 0 ? "!text-win" : "!text-loss"}>{r.fga ? fmt(r.pts - r.xPts, "signed1") : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="PPS" value={fmt(sq.pps, "2")} sub="Points per shot" />
        <Stat label="xPPS" value={fmt(sq.xpps, "2")} sub="Shot quality" />
        <Stat label="Shot making" value={fmt(sq.making, "signed1") === "–" ? "–" : (sq.making! >= 0 ? "+" : "") + sq.making!.toFixed(2)} tone={(sq.making ?? 0) >= 0 ? "win" : "loss"} sub="vs expected" />
      </div>
    </Card>
  );
}
