import Link from "next/link";
import { autoCols, playerRows, teamRows, toColumns, type ColSpec } from "@/components/nbaTable";
import { SortableTable, type Row } from "@/components/SortableTable";
import { Card, Empty, PageTitle, SeasonPicker } from "@/components/ui";
import { getLeague } from "@/leagues/registry";
import { fmtDayTime } from "@/lib/format";
import { resolveSeason } from "@/lib/league";
import {
  CONTEST_LABELS,
  PLAY_TYPE_LABELS,
  TRACKING_LABELS,
  getManifest,
  groups,
  nbaAbbr,
  nbaHeadshot,
  nbaLogo,
  n,
  rows,
  seasonFolder,
  type Rec,
} from "@/lib/nbacom";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "hustle", label: "Hustle" },
  { id: "contests", label: "Shot contests" },
  { id: "playtypes", label: "Play types" },
  { id: "tracking", label: "Player tracking" },
  { id: "defense", label: "Defense" },
  { id: "matchups", label: "Matchups" },
  { id: "lineups", label: "Lineups" },
  { id: "clutch", label: "Clutch" },
  { id: "advanced", label: "Advanced" },
  { id: "scoring", label: "Scoring" },
  { id: "zones", label: "Shot zones" },
] as const;

type SP = { season?: string; type?: string; tab?: string; who?: string; g?: string; side?: string; all?: string; team?: string };

function qualify(recs: Rec[], on: boolean, minMin = 12) {
  if (!on) return recs;
  const gpKey = recs[0] && "GP" in recs[0] ? "GP" : "G";
  const maxGp = Math.max(0, ...recs.map((r) => n(r[gpKey]) ?? 0));
  return recs.filter((r) => (n(r[gpKey]) ?? 0) >= maxGp * 0.3 && (r.MIN == null || (n(r.MIN) ?? 0) >= minMin));
}

export default async function TrackingPage({ params, searchParams }: { params: Promise<{ league: string }>; searchParams: Promise<SP> }) {
  const { league: lid } = await params;
  const sp = await searchParams;
  const league = getLeague(lid);
  if (!league.features.nbaComTracking) {
    return (
      <div className="space-y-6">
        <PageTitle sub={league.name}>Tracking</PageTitle>
        <Card title={`No tracking feed for the ${league.shortName}`}>
          <p className="text-sm text-ink-300">
            Hustle, Synergy play types, shot contests and matchups come from NBA.com&apos;s tracking system, which only covers the NBA. Everything
            built from play-by-play — shot charts, zones, runs, clutch, lineups and possessions — is on each{" "}
            <Link href={`/${league.id}/games`} className="text-court">
              game page
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }
  const sel = await resolveSeason(league, sp);
  const folder = seasonFolder(sel.year, sel.type);
  const manifest = await getManifest();
  const info = manifest.seasons[folder];
  const tab = (TABS.find((t) => t.id === sp.tab)?.id ?? "hustle") as (typeof TABS)[number]["id"];
  const who = sp.who === "teams" ? "teams" : "players";
  const qualified = sp.all !== "1";
  const base = `/${league.id}/tracking`;

  const href = (o: Partial<SP>) => {
    const q = new URLSearchParams();
    Object.entries({ season: sp.season, type: sp.type, tab, who, g: sp.g, side: sp.side, all: sp.all, team: sp.team, ...o }).forEach(
      ([k, v]) => v && q.set(k, String(v)),
    );
    return `${base}?${q}`;
  };
  const chip = (active: boolean) => `chip ${active ? "!border-court !text-court" : "hover:text-ink-100"}`;

  const header = (
    <>
      <PageTitle
        sub={
          <>
            Official NBA.com tracking data via nba_api · {sel.label}
            {info?.updated ? ` · synced ${fmtDayTime(info.updated)}` : ""}
          </>
        }
        right={<SeasonPicker base={base} current={sel.current} year={sel.year} type={sel.type} extra={{ tab }} />}
      >
        Tracking
      </PageTitle>
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-ink-800 pb-2">
        {TABS.map((t) => (
          <Link key={t.id} href={href({ tab: t.id, g: undefined })} className={`tab ${tab === t.id ? "tab-active" : ""}`}>
            {t.label}
          </Link>
        ))}
      </div>
    </>
  );

  if (!info) {
    return (
      <div>
        {header}
        <NotSynced folder={folder} season={sel.year} playoffs={sel.type === 3} synced={Object.keys(manifest.seasons)} base={base} />
      </div>
    );
  }

  const WhoToggle = ({ teamsOk = true }: { teamsOk?: boolean }) => (
    <>
      <Link href={href({ who: "players" })} className={chip(who === "players")}>
        Players
      </Link>
      {teamsOk && (
        <Link href={href({ who: "teams" })} className={chip(who === "teams")}>
          Teams
        </Link>
      )}
      {who === "players" && (
        <Link href={href({ all: qualified ? "1" : undefined })} className={chip(!qualified)}>
          {qualified ? "Qualified players" : "All players"}
        </Link>
      )}
      <span className="mx-1 h-4 w-px self-center bg-ink-700" />
    </>
  );

  const Groups = ({ names, labels, active }: { names: string[]; labels: Record<string, string>; active: string }) => (
    <>
      {names.map((g) => (
        <Link key={g} href={href({ g })} className={chip(g === active)}>
          {labels[g] ?? g}
        </Link>
      ))}
    </>
  );

  const table = (recs: Rec[], specs: ColSpec[], sort: string, lead = ["GP", "MIN"], note?: string) => {
    const keys = specs.map((s) => s.key);
    const leadKeys = lead.filter((k) => recs.some((r) => k in r));
    const rws = who === "teams" ? teamRows(league.id, recs, [...leadKeys, ...keys]) : playerRows(league.id, recs, [...leadKeys, ...keys]);
    return (
      <Card pad={false} right={note} title={`${recs.length} ${who}`}>
        {recs.length ? (
          <SortableTable columns={toColumns(specs, leadKeys)} rows={rws} leadLabel={who === "teams" ? "Team" : "Player"} defaultSort={{ key: sort, dir: "desc" }} searchable maxHeight={760} dense />
        ) : (
          <div className="p-4">
            <Empty>No rows in this dataset yet.</Empty>
          </div>
        )}
      </Card>
    );
  };

  let body: React.ReactNode = null;

  if (tab === "hustle") {
    const recs = qualify(await rows(folder, who === "teams" ? "hustle_team" : "hustle_player"), who === "players" && qualified);
    const cols = ["CONTESTED_SHOTS", "CONTESTED_SHOTS_2PT", "CONTESTED_SHOTS_3PT", "DEFLECTIONS", "CHARGES_DRAWN", "SCREEN_ASSISTS", "SCREEN_AST_PTS", "LOOSE_BALLS_RECOVERED", "OFF_BOXOUTS", "DEF_BOXOUTS", "BOX_OUTS", "PCT_BOX_OUTS_REB"];
    body = (
      <>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <WhoToggle />
        </div>
        {table(recs, cols.map((key) => ({ key })), "DEFLECTIONS", ["G", "GP", "MIN"], "Per game")}
      </>
    );
  }

  if (tab === "contests") {
    const grp = await groups(folder, who === "teams" ? "contest_team" : "contest_player");
    const ranges = Object.keys(CONTEST_LABELS).filter((r) => grp[r]);
    const merged = new Map<string, Rec>();
    ranges.forEach((r, i) => {
      for (const row of grp[r]) {
        const id = String(row.PLAYER_ID ?? row.TEAM_ID);
        const m = merged.get(id) ?? {
          PLAYER_ID: row.PLAYER_ID ?? null,
          PLAYER_NAME: row.PLAYER_NAME ?? null,
          TEAM_ID: row.TEAM_ID ?? null,
          TEAM_NAME: row.TEAM_NAME ?? null,
          TEAM_ABBREVIATION: row.TEAM_ABBREVIATION ?? row.PLAYER_LAST_TEAM_ABBREVIATION ?? null,
          GP: row.GP ?? null,
        };
        m[`R${i}_FREQ_PCT`] = row.FGA_FREQUENCY ?? null;
        m[`R${i}_FGA`] = row.FGA ?? null;
        m[`R${i}_FG_PCT`] = row.FG_PCT ?? null;
        m[`R${i}_EFG_PCT`] = row.EFG_PCT ?? null;
        merged.set(id, m);
      }
    });
    let recs = [...merged.values()].map((m) => ({
      ...m,
      CONTESTED_PCT: (n(m.R0_FREQ_PCT) ?? 0) + (n(m.R1_FREQ_PCT) ?? 0),
      TOTAL_FGA: ranges.reduce((a, _r, i) => a + (n(m[`R${i}_FGA`]) ?? 0), 0),
    })) as (Rec & { TOTAL_FGA: number })[];
    if (who === "players" && qualified) {
      const max = Math.max(0, ...recs.map((r) => r.TOTAL_FGA));
      recs = recs.filter((r) => r.TOTAL_FGA >= max * 0.25);
    }
    const short = ["V.TIGHT", "TIGHT", "OPEN", "W.OPEN"];
    const specs: ColSpec[] = [
      { key: "TOTAL_FGA", label: "FGA/G", group: true },
      { key: "CONTESTED_PCT", label: "TIGHT SHARE", heat: true },
      ...ranges.flatMap((_r, i) => [
        { key: `R${i}_FREQ_PCT`, label: `${short[i]} FREQ`, group: true },
        { key: `R${i}_FG_PCT`, label: `${short[i]} FG%` },
        { key: `R${i}_EFG_PCT`, label: `${short[i]} eFG%` },
      ]),
    ];
    body = (
      <>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <WhoToggle />
        </div>
        {table(
          recs,
          specs,
          "TOTAL_FGA",
          ["GP"],
          "Closest defender distance at the shot · per game",
        )}
      </>
    );
  }

  if (tab === "playtypes") {
    const side = sp.side === "def" ? "def" : "off";
    const grp = await groups(folder, `synergy_${who === "teams" ? "team" : "player"}_${side}`);
    const names = Object.keys(PLAY_TYPE_LABELS).filter((p) => grp[p]?.length);
    const view = sp.g === "mix" && who === "teams" ? "mix" : sp.g && grp[sp.g] ? sp.g : names[0];
    let content: React.ReactNode;
    if (view === "mix") {
      const teams = new Map<string, Rec>();
      for (const p of names)
        for (const r of grp[p]) {
          const m = teams.get(String(r.TEAM_ID)) ?? { TEAM_ID: r.TEAM_ID, TEAM_NAME: r.TEAM_NAME, TEAM_ABBREVIATION: r.TEAM_ABBREVIATION, GP: r.GP };
          m[`${p}|POSS_PCT`] = r.POSS_PCT;
          m[`${p}|PPP`] = r.PPP;
          teams.set(String(r.TEAM_ID), m);
        }
      const specs: ColSpec[] = names.flatMap((p) => [
        { key: `${p}|POSS_PCT`, label: `${PLAY_TYPE_LABELS[p]} %`, group: true },
        { key: `${p}|PPP`, label: "PPP", invert: side === "def" },
      ]);
      const recs = [...teams.values()];
      content = (
        <Card pad={false} title="Play type mix — frequency and points per possession">
          <SortableTable columns={toColumns(specs, ["GP"])} rows={teamRows(league.id, recs, ["GP", ...specs.map((s) => s.key)])} leadLabel="Team" defaultSort={{ key: `${names[0]}|POSS_PCT`, dir: "desc" }} maxHeight={760} dense />
        </Card>
      );
    } else {
      let recs = grp[view] ?? [];
      if (who === "players" && qualified) recs = recs.filter((r) => (n(r.POSS) ?? 0) >= 25);
      const specs: ColSpec[] = [
        { key: "POSS", group: true },
        { key: "POSS_PCT" },
        { key: "PTS" },
        { key: "PPP", invert: side === "def" },
        { key: "PERCENTILE" },
        { key: "FG_PCT", group: true, invert: side === "def" },
        { key: "EFG_PCT", invert: side === "def" },
        { key: "TOV_POSS_PCT", invert: side === "off" },
        { key: "SF_POSS_PCT" },
        { key: "PLUSONE_POSS_PCT" },
        { key: "SCORE_POSS_PCT", invert: side === "def" },
      ];
      content = table(recs, specs, "POSS", ["GP"], `Synergy · ${side === "off" ? "offense" : "defense (points allowed)"} · season totals`);
    }
    body = (
      <>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <WhoToggle />
          <Link href={href({ side: "off" })} className={chip(side === "off")}>
            Offense
          </Link>
          <Link href={href({ side: "def" })} className={chip(side === "def")}>
            Defense
          </Link>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Groups names={names} labels={PLAY_TYPE_LABELS} active={view} />
          {who === "teams" && (
            <Link href={href({ g: "mix" })} className={chip(view === "mix")}>
              Team mix
            </Link>
          )}
        </div>
        {content}
      </>
    );
  }

  if (tab === "tracking") {
    const grp = await groups(folder, who === "teams" ? "tracking_team" : "tracking_player");
    const names = Object.keys(TRACKING_LABELS).filter((g) => grp[g]?.length);
    const g = sp.g && grp[sp.g] ? sp.g : names[0];
    const recs = qualify(grp[g] ?? [], who === "players" && qualified);
    body = (
      <>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <WhoToggle />
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Groups names={names} labels={TRACKING_LABELS} active={g} />
        </div>
        {table(recs, autoCols(recs, ["MIN"]), autoCols(recs, ["MIN"])[0]?.key ?? "GP", ["GP", "MIN"], `${TRACKING_LABELS[g] ?? g} · per game`)}
      </>
    );
  }

  if (tab === "defense") {
    const grp = await groups(folder, "defend_player");
    const names = Object.keys(grp).filter((k) => grp[k].length);
    const g = sp.g && grp[sp.g] ? sp.g : names[0];
    const recs = qualify(
      (grp[g] ?? []).map((r) => ({ ...r, PLAYER_ID: r.PLAYER_ID ?? r.CLOSE_DEF_PERSON_ID, TEAM_ABBREVIATION: r.TEAM_ABBREVIATION ?? r.PLAYER_LAST_TEAM_ABBREVIATION })),
      qualified,
      0,
    );
    const specs = autoCols(recs, ["FREQ", "AGE"]).map((s) => ({ ...s, invert: /D_FG|_PCT$|PLUSMINUS/.test(s.key) && !/NS_|NORMAL/.test(s.key) }));
    body = (
      <>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {names.map((x) => (
            <Link key={x} href={href({ g: x })} className={chip(x === g)}>
              {x}
            </Link>
          ))}
          <Link href={href({ all: qualified ? "1" : undefined })} className={chip(!qualified)}>
            {qualified ? "Qualified" : "All"}
          </Link>
        </div>
        {table(recs, specs, specs[0]?.key ?? "GP", ["GP", "G"], "Opponent FG% when this player is the closest defender vs their normal FG% · lower is better")}
      </>
    );
  }

  if (tab === "matchups") {
    const recs = await rows(folder, "matchups");
    const rws: Row[] = recs.map((r, i) => ({
      key: `${r.OFF_PLAYER_ID}-${r.DEF_PLAYER_ID}-${i}`,
      lead: {
        label: `${r.OFF_PLAYER_NAME}`,
        sub: `guarded by ${r.DEF_PLAYER_NAME}`,
        img: nbaHeadshot(r.OFF_PLAYER_ID as number),
        href: `/${league.id}/go?player=${encodeURIComponent(String(r.OFF_PLAYER_NAME))}`,
      },
      cells: {
        def: String(r.DEF_PLAYER_NAME ?? ""),
        GP: n(r.GP),
        poss: n(r.PARTIAL_POSS),
        min: n(r.MATCHUP_MIN),
        pts: n(r.PLAYER_PTS),
        fg: `${r.MATCHUP_FGM ?? 0}-${r.MATCHUP_FGA ?? 0}`,
        fgp: n(r.MATCHUP_FG_PCT) != null ? (n(r.MATCHUP_FG_PCT) as number) * 100 : null,
        tp: `${r.MATCHUP_FG3M ?? 0}-${r.MATCHUP_FG3A ?? 0}`,
        ast: n(r.MATCHUP_AST),
        tov: n(r.MATCHUP_TOV),
        blk: n(r.MATCHUP_BLK),
        ppp: n(r.PARTIAL_POSS) ? ((n(r.PLAYER_PTS) ?? 0) / (n(r.PARTIAL_POSS) as number)) * 100 : null,
      },
    }));
    body = (
      <Card pad={false} title={`${recs.length} matchups`} right="Who guarded who · 15+ partial possessions · search a player's name">
        {rws.length ? (
          <SortableTable
            leadLabel="Offensive player"
            searchable
            maxHeight={760}
            dense
            defaultSort={{ key: "poss", dir: "desc" }}
            columns={[
              { key: "def", label: "DEFENDER", fmt: "text" },
              { key: "GP", label: "GP", fmt: "int" },
              { key: "poss", label: "POSS", fmt: "1", group: true },
              { key: "min", label: "MIN", fmt: "1" },
              { key: "pts", label: "PTS", fmt: "int", group: true },
              { key: "fg", label: "FG", fmt: "text" },
              { key: "fgp", label: "FG%", fmt: "1", heat: true },
              { key: "tp", label: "3PT", fmt: "text" },
              { key: "ast", label: "AST", fmt: "int" },
              { key: "tov", label: "TOV", fmt: "int" },
              { key: "blk", label: "BLK", fmt: "int" },
              { key: "ppp", label: "PTS/100", fmt: "1", heat: true, group: true },
            ]}
            rows={rws}
          />
        ) : (
          <div className="p-4">
            <Empty>No matchup data synced.</Empty>
          </div>
        )}
      </Card>
    );
  }

  if (tab === "lineups") {
    const grp = await groups(folder, "lineups");
    const adv = new Map((grp.advanced ?? []).map((r) => [String(r.GROUP_ID), r]));
    let recs: Rec[] = (grp.base ?? []).map((b) => ({ ...b, ...(adv.get(String(b.GROUP_ID)) ?? {}), PLUS_MINUS: b.PLUS_MINUS, PTS: b.PTS }));
    const teamsList = [...new Set(recs.map((r) => String(r.TEAM_ABBREVIATION)))].sort();
    if (sp.team) recs = recs.filter((r) => r.TEAM_ABBREVIATION === nbaAbbr(sp.team!) || r.TEAM_ABBREVIATION === sp.team);
    // Early in a season few lineups reach 50 minutes, so fall back to the 10-minute floor.
    const enough = recs.filter((r) => (n(r.MIN) ?? 0) >= 50).length >= 15;
    const minMin = sp.all === "1" || !enough ? 10 : 50;
    recs = recs.filter((r) => (n(r.MIN) ?? 0) >= minMin);
    const keys = ["MIN", "PTS", "PLUS_MINUS", "OFF_RATING", "DEF_RATING", "NET_RATING", "PACE", "TS_PCT", "EFG_PCT", "AST_PCT", "OREB_PCT", "DREB_PCT", "TM_TOV_PCT", "PIE"].filter((k) => recs.some((r) => k in r));
    const rws: Row[] = recs.map((r) => ({
      key: String(r.GROUP_ID),
      lead: { label: String(r.GROUP_NAME ?? "").replace(/ - /g, ", "), sub: String(r.TEAM_ABBREVIATION ?? ""), img: nbaLogo(r.TEAM_ID as number), imgKind: "team" },
      cells: Object.fromEntries(["GP", ...keys].map((k) => [k, typeof r[k] === "number" && /_PCT$|^PIE$/.test(k) && Math.abs(r[k] as number) <= 1.5 ? (r[k] as number) * 100 : (r[k] as number | null)])),
    }));
    body = (
      <>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Link href={href({ team: undefined })} className={chip(!sp.team)}>
            All teams
          </Link>
          {teamsList.map((t) => (
            <Link key={t} href={href({ team: t })} className={chip(sp.team === t)}>
              {t}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px self-center bg-ink-700" />
          {enough && (
            <Link href={href({ all: sp.all === "1" ? undefined : "1" })} className={chip(sp.all === "1")}>
              {sp.all === "1" ? "10+ min" : "50+ min"}
            </Link>
          )}
        </div>
        <Card pad={false} title={`${recs.length} five-man lineups`} right={`Official NBA.com lineup data · season totals · ${minMin}+ minutes together`}>
          <SortableTable
            leadLabel="Lineup"
            searchable
            maxHeight={760}
            dense
            defaultSort={{ key: "MIN", dir: "desc" }}
            columns={toColumns(
              keys.filter((k) => k !== "MIN").map((key) => ({ key, signed: key === "PLUS_MINUS" || key === "NET_RATING", invert: key === "DEF_RATING" || key === "TM_TOV_PCT" })),
              ["GP", "MIN"],
            )}
            rows={rws}
          />
        </Card>
      </>
    );
  }

  if (tab === "clutch") {
    const recs = qualify(await rows(folder, who === "teams" ? "clutch_team" : "clutch_player"), who === "players" && qualified, 0);
    const cols = ["PTS", "FGM", "FGA", "FG_PCT", "FG3M", "FG3A", "FG3_PCT", "FTM", "FTA", "FT_PCT", "OREB", "DREB", "REB", "AST", "TOV", "STL", "BLK", "PF", "PLUS_MINUS"];
    body = (
      <>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <WhoToggle />
        </div>
        {table(recs, cols.map((key) => ({ key, invert: key === "TOV" || key === "PF", signed: key === "PLUS_MINUS" })), "PTS", ["GP", "W", "L", "MIN"], "Official clutch: last 5 min, score within 5 · per game")}
      </>
    );
  }

  if (tab === "advanced") {
    const main = await rows(folder, who === "teams" ? "team_advanced" : "player_advanced");
    const est = await rows(folder, who === "teams" ? "est_team" : "est_player");
    const estBy = new Map(est.map((r) => [String(r.PLAYER_ID ?? r.TEAM_ID), r]));
    const recs = qualify(
      main.map((r) => {
        const e = estBy.get(String(r.PLAYER_ID ?? r.TEAM_ID)) ?? {};
        return { ...r, E_OFF_RATING: e.E_OFF_RATING ?? null, E_DEF_RATING: e.E_DEF_RATING ?? null, E_NET_RATING: e.E_NET_RATING ?? null };
      }),
      who === "players" && qualified,
    );
    const cols = ["OFF_RATING", "DEF_RATING", "NET_RATING", "USG_PCT", "TS_PCT", "EFG_PCT", "AST_PCT", "AST_TO", "AST_RATIO", "OREB_PCT", "DREB_PCT", "REB_PCT", "TM_TOV_PCT", "PACE", "PIE", "E_OFF_RATING", "E_DEF_RATING", "E_NET_RATING"].filter((k) => recs.some((r) => k in r));
    body = (
      <>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <WhoToggle />
        </div>
        {table(recs, cols.map((key) => ({ key, invert: /DEF_RATING|TOV/.test(key), signed: /NET_RATING/.test(key), group: key === "OFF_RATING" || key === "E_OFF_RATING" })), "NET_RATING", ["GP", "MIN"], "Official on-court ratings + NBA estimated metrics")}
      </>
    );
  }

  if (tab === "scoring") {
    const misc = await rows(folder, who === "teams" ? "team_misc" : "player_misc");
    const scoring = who === "teams" ? [] : await rows(folder, "player_scoring");
    const sBy = new Map(scoring.map((r) => [String(r.PLAYER_ID), r]));
    const recs = qualify(misc.map((r) => ({ ...(sBy.get(String(r.PLAYER_ID)) ?? {}), ...r })), who === "players" && qualified);
    const cols = ["PTS_OFF_TOV", "PTS_2ND_CHANCE", "PTS_FB", "PTS_PAINT", "OPP_PTS_OFF_TOV", "OPP_PTS_2ND_CHANCE", "OPP_PTS_FB", "OPP_PTS_PAINT", "BLKA", "PFD", "PCT_AST_FGM", "PCT_UAST_FGM", "PCT_AST_3PM", "PCT_UAST_3PM", "PCT_PTS_PAINT", "PCT_PTS_MR", "PCT_PTS_3PT", "PCT_PTS_FT", "PCT_PTS_FB", "PCT_PTS_OFF_TOV"].filter((k) => recs.some((r) => k in r));
    body = (
      <>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <WhoToggle />
        </div>
        {table(recs, cols.map((key) => ({ key, group: key === "PTS_OFF_TOV" || key === "PCT_AST_FGM" })), "PTS_PAINT", ["GP", "MIN"], "Points by source + assisted vs unassisted · per game")}
      </>
    );
  }

  if (tab === "zones") {
    const recs = qualify(await rows(folder, "shot_zones_player"), qualified, 0);
    const zoneCols = recs[0] ? Object.keys(recs[0]).filter((k) => k.includes("|") && /\|(FGA|FG_PCT)$/.test(k) && !/Backcourt/i.test(k)) : [];
    body = (
      <>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Link href={href({ all: qualified ? "1" : undefined })} className={chip(!qualified)}>
            {qualified ? "Qualified" : "All"}
          </Link>
        </div>
        {table(recs, zoneCols.map((key, i) => ({ key, group: i % 2 === 0 })), zoneCols[0] ?? "GP", ["GP"], "Season shot zones (official) · per game")}
      </>
    );
  }

  return (
    <div>
      {header}
      {body}
    </div>
  );
}

function NotSynced({ folder, season, playoffs, synced, base }: { folder: string; season: number; playoffs: boolean; synced: string[]; base: string }) {
  const label = `${season - 1}-${String(season).slice(2)}`;
  return (
    <Card title="No NBA.com data synced for this season yet">
      <div className="space-y-3 text-sm text-ink-300">
        <p>
          This section uses official NBA.com tracking data (hustle, shot contests, Synergy play types, matchups, lineups, clutch). NBA.com blocks cloud
          servers, so it&apos;s pulled from your own computer with <span className="text-court">nba_api</span> and pushed to the repo.
        </p>
        <pre className="num overflow-x-auto rounded-lg bg-ink-950 p-3 text-xs text-ink-200">
          {`pip install -r sync/requirements.txt\npython sync/sync_nba.py --season ${label}${playoffs ? " --playoffs" : ""} --push`}
        </pre>
        <p className="text-xs text-ink-500">Looking for folder data/nba/{folder}. Takes about 2–3 minutes; Vercel redeploys automatically after the push.</p>
        {synced.length > 0 && (
          <p className="text-xs">
            Already synced:{" "}
            {synced.map((s) => {
              const y = Number(s.slice(0, 4)) + 1;
              return (
                <Link key={s} href={`${base}?season=${y}${s.endsWith("playoffs") ? "&type=3" : ""}`} className="mr-2 text-court hover:underline">
                  {s}
                </Link>
              );
            })}
          </p>
        )}
      </div>
    </Card>
  );
}
