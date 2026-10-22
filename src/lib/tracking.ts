import "server-only";
import {
  CONTEST_LABELS,
  PLAY_TYPE_LABELS,
  findPlayer,
  findTeam,
  getManifest,
  groups,
  n,
  nbaAbbr,
  normName,
  rows,
  type Rec,
} from "./nbacom";

export interface PlayTypeRow {
  type: string;
  label: string;
  poss: number | null;
  freq: number | null;
  ppp: number | null;
  pctile: number | null;
  fg: number | null;
  efg: number | null;
  tov: number | null;
  score: number | null;
  pts: number | null;
}

export interface ContestRow {
  range: string;
  label: string;
  freq: number | null;
  fga: number | null;
  fgPct: number | null;
  efg: number | null;
  fg3a: number | null;
  fg3Pct: number | null;
}

const playTypes = (grp: Record<string, Rec[]>, match: (rs: Rec[]) => Rec | null): PlayTypeRow[] =>
  Object.keys(PLAY_TYPE_LABELS)
    .map((t) => {
      const r = grp[t] ? match(grp[t]) : null;
      if (!r) return null;
      return {
        type: t,
        label: PLAY_TYPE_LABELS[t],
        poss: n(r.POSS),
        freq: n(r.POSS_PCT),
        ppp: n(r.PPP),
        pctile: n(r.PERCENTILE),
        fg: n(r.FG_PCT),
        efg: n(r.EFG_PCT),
        tov: n(r.TOV_POSS_PCT),
        score: n(r.SCORE_POSS_PCT),
        pts: n(r.PTS),
      } satisfies PlayTypeRow;
    })
    .filter((x): x is PlayTypeRow => Boolean(x))
    .sort((a, b) => (b.poss ?? 0) - (a.poss ?? 0));

const contests = (grp: Record<string, Rec[]>, match: (rs: Rec[]) => Rec | null): ContestRow[] =>
  Object.keys(CONTEST_LABELS)
    .map((range) => {
      const r = grp[range] ? match(grp[range]) : null;
      if (!r) return null;
      return {
        range,
        label: CONTEST_LABELS[range],
        freq: n(r.FGA_FREQUENCY),
        fga: n(r.FGA),
        fgPct: n(r.FG_PCT),
        efg: n(r.EFG_PCT),
        fg3a: n(r.FG3A),
        fg3Pct: n(r.FG3_PCT),
      } satisfies ContestRow;
    })
    .filter((x): x is ContestRow => Boolean(x));

const byGroup = (grp: Record<string, Rec[]>, match: (rs: Rec[]) => Rec | null) =>
  Object.fromEntries(
    Object.entries(grp)
      .map(([k, rs]) => [k, match(rs)] as const)
      .filter(([, r]) => r),
  ) as Record<string, Rec>;

export async function hasSeason(folder: string) {
  return Boolean((await getManifest()).seasons[folder]);
}

export async function playerTracking(folder: string, name: string, espnTeamAbbr?: string) {
  if (!(await hasSeason(folder))) return null;
  const base = await rows(folder, "player_base");
  const me = findPlayer(base, name, espnTeamAbbr) ?? findPlayer(await rows(folder, "player_advanced"), name, espnTeamAbbr);
  const id = me?.PLAYER_ID ?? null;
  const byId = (rs: Rec[]) => (id != null ? rs.find((r) => r.PLAYER_ID === id || r.CLOSE_DEF_PERSON_ID === id) ?? null : findPlayer(rs, name, espnTeamAbbr));

  const [adv, est, hustle, misc, scoring, usage, clutch, zones, matchups] = await Promise.all(
    ["player_advanced", "est_player", "hustle_player", "player_misc", "player_scoring", "player_usage", "clutch_player", "shot_zones_player", "matchups"].map(
      (k) => rows(folder, k),
    ),
  );
  const [trk, cont, synOff, synDef, defend] = await Promise.all(
    ["tracking_player", "contest_player", "synergy_player_off", "synergy_player_def", "defend_player"].map((k) => groups(folder, k)),
  );

  const zoneRow = byId(zones);
  const zoneList = zoneRow
    ? [...new Set(Object.keys(zoneRow).filter((k) => k.includes("|")).map((k) => k.split("|")[0]))]
        .filter((z) => !/backcourt/i.test(z))
        .map((z) => ({ zone: z, fgm: n(zoneRow[`${z}|FGM`]), fga: n(zoneRow[`${z}|FGA`]), pct: n(zoneRow[`${z}|FG_PCT`]) }))
    : [];

  const nm = normName(name);
  const guardedBy = matchups
    .filter((r) => (id != null ? r.OFF_PLAYER_ID === id : normName(String(r.OFF_PLAYER_NAME)) === nm))
    .sort((a, b) => (n(b.PARTIAL_POSS) ?? 0) - (n(a.PARTIAL_POSS) ?? 0));
  const guarded = matchups
    .filter((r) => (id != null ? r.DEF_PLAYER_ID === id : normName(String(r.DEF_PLAYER_NAME)) === nm))
    .sort((a, b) => (n(b.PARTIAL_POSS) ?? 0) - (n(a.PARTIAL_POSS) ?? 0));

  return {
    nbaId: id,
    found: Boolean(me),
    base: me,
    adv: byId(adv),
    est: byId(est),
    hustle: byId(hustle),
    misc: byId(misc),
    scoring: byId(scoring),
    usage: byId(usage),
    clutch: byId(clutch),
    tracking: byGroup(trk, byId),
    contests: contests(cont, byId),
    playOff: playTypes(synOff, byId),
    playDef: playTypes(synDef, byId),
    defend: byGroup(defend, byId),
    zones: zoneList,
    guardedBy: guardedBy.slice(0, 12),
    guarded: guarded.slice(0, 12),
  };
}

export async function teamTracking(folder: string, espnTeamAbbr: string) {
  if (!(await hasSeason(folder))) return null;
  const abbr = nbaAbbr(espnTeamAbbr);
  const match = (rs: Rec[]) => findTeam(rs, espnTeamAbbr);
  const [adv, opp, est, hustle, misc, clutch, hustleP] = await Promise.all(
    ["team_advanced", "team_opponent", "est_team", "hustle_team", "team_misc", "clutch_team", "hustle_player"].map((k) => rows(folder, k)),
  );
  const [trk, cont, synOff, synDef, lineups] = await Promise.all(
    ["tracking_team", "contest_team", "synergy_team_off", "synergy_team_def", "lineups"].map((k) => groups(folder, k)),
  );
  const advBy = new Map((lineups.advanced ?? []).map((r) => [String(r.GROUP_ID), r]));
  const teamLineups = (lineups.base ?? [])
    .filter((r) => r.TEAM_ABBREVIATION === abbr)
    .map((b) => ({ ...b, ...(advBy.get(String(b.GROUP_ID)) ?? {}), PLUS_MINUS: b.PLUS_MINUS, PTS: b.PTS }) as Rec)
    .sort((a, b) => (n(b.MIN) ?? 0) - (n(a.MIN) ?? 0));

  // League rank helper for a team metric
  const rank = (rs: Rec[], key: string, lowerBetter = false) => {
    const me = match(rs);
    if (!me || n(me[key]) == null) return null;
    const vals = rs.map((r) => n(r[key])).filter((v): v is number => v != null).sort((a, b) => (lowerBetter ? a - b : b - a));
    return vals.indexOf(n(me[key])!) + 1;
  };
  const synergyRanked = (grp: Record<string, Rec[]>, lowerBetter: boolean) =>
    playTypes(grp, match).map((p) => {
      const all = (grp[p.type] ?? []).map((r) => n(r.PPP)).filter((v): v is number => v != null).sort((a, b) => (lowerBetter ? a - b : b - a));
      return { ...p, rank: p.ppp != null ? all.indexOf(p.ppp) + 1 : null, of: all.length };
    });

  return {
    adv: match(adv),
    opp: match(opp),
    est: match(est),
    hustle: match(hustle),
    misc: match(misc),
    clutch: match(clutch),
    ranks: {
      off: rank(adv, "OFF_RATING"),
      def: rank(adv, "DEF_RATING", true),
      net: rank(adv, "NET_RATING"),
      pace: rank(adv, "PACE"),
      deflections: rank(hustle, "DEFLECTIONS"),
      contests: rank(hustle, "CONTESTED_SHOTS"),
    },
    tracking: byGroup(trk, match),
    contests: contests(cont, match),
    playOff: synergyRanked(synOff, false),
    playDef: synergyRanked(synDef, true),
    lineups: teamLineups.slice(0, 15),
    hustlePlayers: hustleP.filter((r) => r.TEAM_ABBREVIATION === abbr).sort((a, b) => (n(b.MIN) ?? 0) - (n(a.MIN) ?? 0)),
  };
}

export type PlayerTracking = NonNullable<Awaited<ReturnType<typeof playerTracking>>>;
export type TeamTracking = NonNullable<Awaited<ReturnType<typeof teamTracking>>>;
