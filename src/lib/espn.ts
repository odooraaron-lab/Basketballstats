// ESPN public JSON endpoints (no API key). Every function is league-scoped: it takes a
// League and only ever touches that league's sport path, so data never mixes.
import type { League } from "@/leagues/types";
import type {
  BoxPlayer,
  BoxTeam,
  GameCard,
  GameLogRow,
  GameSide,
  GameState,
  GameSummary,
  LeaderRow,
  Play,
  PlayerRef,
  PlayerSeasonRow,
  RosterPlayer,
  Standing,
  TeamRef,
  TeamSeason,
} from "./model";
import { emptyBox, num, parseMadeAtt, type BoxLine } from "./stats";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

const SITE = (l: League) => `https://site.api.espn.com/apis/site/v2/sports/basketball/${l.provider.sportPath}`;
const SITE_V2 = (l: League) => `https://site.api.espn.com/apis/v2/sports/basketball/${l.provider.sportPath}`;
const WEB = (l: League) => `https://site.web.api.espn.com/apis/common/v3/sports/basketball/${l.provider.sportPath}`;

export const TTL = {
  live: 20,
  scoreboard: 60,
  standings: 600,
  teamStats: 3600,
  roster: 6 * 3600,
  teams: 24 * 3600,
  player: 3600,
} as const;

async function getJson(url: string, revalidate: number): Promise<J | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate },
      headers: { "User-Agent": "Mozilla/5.0 (stat-tracker)", Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`[espn] ${res.status} ${url}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`[espn] failed ${url}`, (e as Error).message);
    return null;
  }
}

const qs = (o: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v != null && v !== "" && p.set(k, String(v)));
  const s = p.toString();
  return s ? `?${s}` : "";
};

// ---------------------------------------------------------------------------
// Normalisers
// ---------------------------------------------------------------------------

function pickLogo(t: J, sportPath: string): string {
  if (t?.logo) return t.logo;
  const logos: J[] = t?.logos ?? [];
  const def = logos.find((l) => (l.rel ?? []).includes("default")) ?? logos[0];
  if (def?.href) return def.href;
  return t?.abbreviation
    ? `https://a.espncdn.com/i/teamlogos/${sportPath}/500/${String(t.abbreviation).toLowerCase()}.png`
    : "";
}

export function toTeam(t: J, l: League): TeamRef {
  return {
    id: String(t?.id ?? ""),
    abbr: t?.abbreviation ?? "",
    name: t?.displayName ?? t?.name ?? "",
    shortName: t?.shortDisplayName ?? t?.name ?? "",
    location: t?.location ?? "",
    color: t?.color ?? "333333",
    altColor: t?.alternateColor ?? "777777",
    logo: pickLogo(t, l.provider.sportPath),
  };
}

export function headshotUrl(l: League, id: string) {
  return `https://a.espncdn.com/i/headshots/${l.provider.sportPath}/players/full/${id}.png`;
}

function toPlayerRef(a: J, l: League): PlayerRef {
  const id = String(a?.id ?? "");
  return {
    id,
    name: a?.displayName ?? a?.fullName ?? "",
    shortName: a?.shortName ?? a?.displayName ?? "",
    jersey: a?.jersey ?? "",
    pos: a?.position?.abbreviation ?? "",
    headshot: a?.headshot?.href ?? (id ? headshotUrl(l, id) : ""),
    teamId: a?.team?.id ? String(a.team.id) : a?.teamId ? String(a.teamId) : undefined,
  };
}

function stateOf(s: J): GameState {
  const st = s?.type?.state;
  return st === "in" || st === "post" ? st : "pre";
}

function sideOf(c: J, l: League): GameSide {
  const scoreRaw = typeof c?.score === "object" ? c?.score?.value ?? c?.score?.displayValue : c?.score;
  const rec =
    (c?.records ?? c?.record ?? []).find?.((r: J) => r.type === "total" || r.name === "overall") ??
    (c?.records ?? c?.record ?? [])[0];
  return {
    team: toTeam(c?.team, l),
    score: scoreRaw == null || scoreRaw === "" ? null : num(scoreRaw),
    record: rec?.summary ?? rec?.displayValue ?? "",
    winner: Boolean(c?.winner),
    linescores: (c?.linescores ?? []).map((x: J) => num(x?.value ?? x?.displayValue)),
  };
}

export function toGameCard(e: J, l: League): GameCard {
  const comp = e?.competitions?.[0] ?? e;
  const cs: J[] = comp?.competitors ?? [];
  const home = cs.find((c) => c.homeAway === "home") ?? cs[0];
  const away = cs.find((c) => c.homeAway === "away") ?? cs[1];
  const status = comp?.status ?? e?.status;
  const odds = comp?.odds?.[0];
  return {
    id: String(e?.id ?? comp?.id ?? ""),
    date: e?.date ?? comp?.date ?? "",
    state: stateOf(status),
    detail: status?.type?.detail ?? "",
    shortDetail: status?.type?.shortDetail ?? "",
    period: num(status?.period),
    clock: status?.displayClock ?? "",
    home: sideOf(home, l),
    away: sideOf(away, l),
    venue: comp?.venue?.fullName ?? "",
    broadcast:
      comp?.broadcast ??
      (comp?.broadcasts ?? []).flatMap((b: J) => b?.names ?? [b?.media?.shortName]).filter(Boolean).join(", ") ??
      "",
    odds: odds
      ? {
          details: odds.details ?? "",
          overUnder: odds.overUnder != null ? num(odds.overUnder) : null,
          spread: odds.spread != null ? num(odds.spread) : null,
        }
      : null,
    seasonType: num(e?.season?.type ?? e?.seasonType?.type ?? 2),
  };
}

// ---------------------------------------------------------------------------
// Season helpers
// ---------------------------------------------------------------------------

export interface SeasonInfo {
  year: number; // ESPN season year = calendar year the season ends (2027 => 2026-27)
  type: number; // 1 pre, 2 regular, 3 post
  label: string;
}

export function seasonLabel(year: number) {
  return `${year - 1}-${String(year).slice(2)}`;
}

export async function getCurrentSeason(l: League): Promise<SeasonInfo> {
  const sb = await getJson(`${SITE(l)}/scoreboard`, 3600);
  const year = num(sb?.season?.year) || num(sb?.leagues?.[0]?.season?.year) || new Date().getFullYear();
  const type = num(sb?.season?.type) || 2;
  return { year, type, label: seasonLabel(year) };
}

// ---------------------------------------------------------------------------
// Teams, rosters, standings
// ---------------------------------------------------------------------------

export async function getTeams(l: League): Promise<TeamRef[]> {
  const j = await getJson(`${SITE(l)}/teams`, TTL.teams);
  const list: J[] = j?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return list.map((t) => toTeam(t.team ?? t, l)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTeam(l: League, teamId: string) {
  const j = await getJson(`${SITE(l)}/teams/${teamId}`, TTL.standings);
  const t = j?.team;
  if (!t) return null;
  return {
    team: toTeam(t, l),
    standingSummary: t.standingSummary ?? "",
    record: t.record?.items?.[0]?.summary ?? "",
    nextEventId: t.nextEvent?.[0]?.id ? String(t.nextEvent[0].id) : null,
  };
}

export async function getRoster(l: League, teamId: string): Promise<RosterPlayer[]> {
  const j = await getJson(`${SITE(l)}/teams/${teamId}/roster`, TTL.roster);
  const athletes: J[] = Array.isArray(j?.athletes)
    ? j.athletes.flatMap((a: J) => (Array.isArray(a?.items) ? a.items : [a]))
    : [];
  return athletes.map((a) => ({
    ...toPlayerRef(a, l),
    teamId,
    age: a.age ?? null,
    height: a.displayHeight ?? "",
    weight: a.displayWeight ?? "",
    experience: a.experience?.years ?? null,
    college: a.college?.shortName ?? a.college?.name ?? "",
    status: a.status?.name ?? "",
    injury: a.injuries?.[0] ? `${a.injuries[0].status ?? ""} ${a.injuries[0].type?.description ?? ""}`.trim() : null,
  }));
}

export async function getStandings(l: League, season?: number): Promise<Standing[]> {
  const j = await getJson(`${SITE_V2(l)}/standings${qs({ season })}`, TTL.standings);
  const groups: J[] = j?.children ?? [];
  const out: Standing[] = [];
  for (const g of groups) {
    const conf = g.abbreviation ?? g.name ?? "";
    for (const e of g?.standings?.entries ?? []) {
      const stats: Record<string, J> = {};
      for (const s of e.stats ?? []) {
        stats[String(s.name ?? s.type ?? "").toLowerCase()] = s;
        if (s.type) stats[String(s.type).toLowerCase()] = stats[String(s.type).toLowerCase()] ?? s;
      }
      const v = (k: string) => num(stats[k.toLowerCase()]?.value ?? stats[k.toLowerCase()]?.displayValue);
      const d = (...ks: string[]) => {
        for (const k of ks) {
          const s = stats[k.toLowerCase()];
          if (s) return s.summary ?? s.displayValue ?? "";
        }
        return "";
      };
      out.push({
        team: toTeam(e.team, l),
        conference: conf.replace(/ern Conference| Conference/i, "").trim() || conf,
        wins: v("wins"),
        losses: v("losses"),
        pct: v("winPercent"),
        gb: v("gamesBehind"),
        seed: v("playoffSeed"),
        streak: d("streak"),
        home: d("home"),
        road: d("road", "away"),
        last10: d("last ten games", "lasttengames"),
        confRecord: d("vs. conf.", "vsconf"),
        ppg: v("avgPointsFor"),
        oppg: v("avgPointsAgainst"),
        diff: v("differential"),
      });
    }
  }
  return out;
}

export async function getInjuries(l: League) {
  const j = await getJson(`${SITE(l)}/injuries`, TTL.standings);
  const map: Record<string, { playerId: string; name: string; status: string; detail: string; date: string }[]> = {};
  for (const t of j?.injuries ?? []) {
    const tid = String(t.id ?? t.team?.id ?? "");
    map[tid] = (t.injuries ?? []).map((i: J) => ({
      playerId: String(i.athlete?.id ?? ""),
      name: i.athlete?.displayName ?? "",
      status: i.status ?? i.type?.description ?? "",
      detail: i.shortComment ?? i.details?.type ?? "",
      date: i.date ?? "",
    }));
  }
  return map;
}

// ---------------------------------------------------------------------------
// Team season stats
// ---------------------------------------------------------------------------

function boxFromStatMap(m: Record<string, number>, gp: number): { perGame: BoxLine; totals: BoxLine } {
  const g = (total: string, avg: string) => {
    if (m[total] != null && gp > 0) return [m[total], m[total] / gp];
    if (m[avg] != null) return [m[avg] * gp, m[avg]];
    return [0, 0];
  };
  const fields: [keyof BoxLine, string, string][] = [
    ["pts", "points", "avgPoints"],
    ["fgm", "fieldGoalsMade", "avgFieldGoalsMade"],
    ["fga", "fieldGoalsAttempted", "avgFieldGoalsAttempted"],
    ["tpm", "threePointFieldGoalsMade", "avgThreePointFieldGoalsMade"],
    ["tpa", "threePointFieldGoalsAttempted", "avgThreePointFieldGoalsAttempted"],
    ["ftm", "freeThrowsMade", "avgFreeThrowsMade"],
    ["fta", "freeThrowsAttempted", "avgFreeThrowsAttempted"],
    ["oreb", "offensiveRebounds", "avgOffensiveRebounds"],
    ["dreb", "defensiveRebounds", "avgDefensiveRebounds"],
    ["reb", "rebounds", "avgRebounds"],
    ["ast", "assists", "avgAssists"],
    ["stl", "steals", "avgSteals"],
    ["blk", "blocks", "avgBlocks"],
    ["tov", "turnovers", "avgTurnovers"],
    ["pf", "fouls", "avgFouls"],
  ];
  const perGame = emptyBox();
  const totals = emptyBox();
  for (const [k, t, a] of fields) {
    const [tot, avg] = g(t, a);
    totals[k] = tot;
    perGame[k] = avg;
  }
  if (!perGame.reb) {
    perGame.reb = perGame.oreb + perGame.dreb;
    totals.reb = totals.oreb + totals.dreb;
  }
  if (!perGame.dreb && perGame.reb) {
    perGame.dreb = perGame.reb - perGame.oreb;
    totals.dreb = totals.reb - totals.oreb;
  }
  return { perGame, totals };
}

export async function getTeamSeason(
  l: League,
  teamId: string,
  season: number,
  seasonType = 2,
): Promise<TeamSeason | null> {
  const j = await getJson(
    `${SITE(l)}/teams/${teamId}/statistics${qs({ season, seasontype: seasonType })}`,
    TTL.teamStats,
  );
  const cats: J[] = j?.results?.stats?.categories ?? j?.statistics?.splits?.categories ?? [];
  if (!cats.length) return null;
  const raw: Record<string, number> = {};
  for (const c of cats) for (const s of c.stats ?? []) if (raw[s.name] == null) raw[s.name] = num(s.value ?? s.displayValue);
  const gp = raw.gamesPlayed ?? 0;
  if (!gp) return null;
  const { perGame, totals } = boxFromStatMap(raw, gp);
  return { gp, perGame, totals, raw };
}

export async function getTeamSchedule(l: League, teamId: string, season: number, seasonType = 2): Promise<GameCard[]> {
  const j = await getJson(`${SITE(l)}/teams/${teamId}/schedule${qs({ season, seasontype: seasonType })}`, TTL.scoreboard);
  return (j?.events ?? []).map((e: J) => toGameCard(e, l));
}

// ---------------------------------------------------------------------------
// Scoreboard & games
// ---------------------------------------------------------------------------

export function espnDate(d: Date): string {
  // ESPN game days are US Eastern.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return parts.replace(/-/g, "");
}

export async function getScoreboard(l: League, yyyymmdd?: string): Promise<GameCard[]> {
  const j = await getJson(`${SITE(l)}/scoreboard${qs({ dates: yyyymmdd })}`, TTL.live);
  return (j?.events ?? []).map((e: J) => toGameCard(e, l));
}

/** Games for the next `days` ESPN game days, starting today. */
export async function getUpcoming(l: League, days = 7): Promise<{ date: string; games: GameCard[] }[]> {
  const now = Date.now();
  const dates = Array.from({ length: days }, (_, i) => espnDate(new Date(now + i * 86400_000)));
  const unique = [...new Set(dates)];
  const res = await Promise.all(unique.map((d) => getScoreboard(l, d)));
  const seen = new Set<string>();
  return unique.map((d, i) => ({
    date: d,
    games: res[i].filter((g) => (seen.has(g.id) ? false : (seen.add(g.id), true))),
  }));
}

const BOX_ALIASES: Record<keyof BoxLine, string[]> = {
  min: ["minutes", "min"],
  pts: ["points", "pts"],
  fgm: [],
  fga: [],
  tpm: [],
  tpa: [],
  ftm: [],
  fta: [],
  oreb: ["offensiverebounds", "oreb", "or"],
  dreb: ["defensiverebounds", "dreb", "dr"],
  reb: ["rebounds", "totalrebounds", "reb"],
  ast: ["assists", "ast"],
  stl: ["steals", "stl"],
  blk: ["blocks", "blk"],
  tov: ["turnovers", "to", "tov"],
  pf: ["fouls", "pf"],
  pm: ["plusminus", "+/-"],
};
const MA_ALIASES = {
  fg: ["fieldgoalsmade-fieldgoalsattempted", "fg"],
  tp: ["threepointfieldgoalsmade-threepointfieldgoalsattempted", "3pt", "3p"],
  ft: ["freethrowsmade-freethrowsattempted", "ft"],
};

function parseMinutes(v: string | undefined): number {
  if (!v) return 0;
  if (v.includes(":")) {
    const [m, s] = v.split(":");
    return Number(m) + Number(s) / 60;
  }
  return num(v);
}

function boxFromRow(cols: string[], stats: string[]): BoxLine {
  const b = emptyBox();
  const idx = (aliases: string[]) => cols.findIndex((c) => aliases.includes(c));
  (Object.keys(BOX_ALIASES) as (keyof BoxLine)[]).forEach((k) => {
    const al = BOX_ALIASES[k];
    if (!al.length) return;
    const i = idx(al);
    if (i >= 0) b[k] = k === "min" ? parseMinutes(stats[i]) : num(stats[i]);
  });
  const ma = (al: string[]) => {
    const i = idx(al);
    return i >= 0 ? parseMadeAtt(stats[i]) : [0, 0];
  };
  [b.fgm, b.fga] = ma(MA_ALIASES.fg);
  [b.tpm, b.tpa] = ma(MA_ALIASES.tp);
  [b.ftm, b.fta] = ma(MA_ALIASES.ft);
  if (!b.reb) b.reb = b.oreb + b.dreb;
  if (!b.pts) b.pts = 2 * (b.fgm - b.tpm) + 3 * b.tpm + b.ftm;
  return b;
}

function columnsOf(s: J): string[] {
  const keys: string[] = s?.keys ?? [];
  const names: string[] = s?.names ?? s?.labels ?? [];
  const n = Math.max(keys.length, names.length);
  return Array.from({ length: n }, (_, i) => {
    const k = String(keys[i] ?? "").toLowerCase();
    // prefer keys (stable), fall back to label
    return k || String(names[i] ?? "").toLowerCase();
  });
}

function teamTotalsFromTeamStats(stats: J[], fallback: BoxLine, pts: number | null): BoxLine {
  const m: Record<string, string> = {};
  for (const s of stats) m[String(s.name).toLowerCase()] = String(s.displayValue ?? "");
  const b = { ...fallback };
  const ma = (k: string) => (m[k] ? parseMadeAtt(m[k]) : null);
  const fg = ma("fieldgoalsmade-fieldgoalsattempted");
  const tp = ma("threepointfieldgoalsmade-threepointfieldgoalsattempted");
  const ft = ma("freethrowsmade-freethrowsattempted");
  if (fg) [b.fgm, b.fga] = fg;
  if (tp) [b.tpm, b.tpa] = tp;
  if (ft) [b.ftm, b.fta] = ft;
  const n = (k: string) => (m[k] != null && m[k] !== "" ? num(m[k]) : null);
  b.reb = n("totalrebounds") ?? n("rebounds") ?? b.reb;
  b.oreb = n("offensiverebounds") ?? b.oreb;
  b.dreb = n("defensiverebounds") ?? b.dreb;
  b.tov = n("totalturnovers") ?? n("turnovers") ?? b.tov;
  b.ast = n("assists") ?? b.ast;
  b.stl = n("steals") ?? b.stl;
  b.blk = n("blocks") ?? b.blk;
  b.pf = n("fouls") ?? n("totalfouls") ?? b.pf;
  if (pts != null) b.pts = pts;
  return b;
}

function toPlay(p: J): Play {
  const x = p?.coordinate?.x;
  const y = p?.coordinate?.y;
  const valid = (v: J) => typeof v === "number" && v > -1000 && v < 1000;
  return {
    id: String(p.id ?? ""),
    seq: num(p.sequenceNumber),
    period: num(p.period?.number ?? p.period),
    clock: (() => {
      const d = p.clock?.displayValue ?? "";
      if (String(d).includes(":")) {
        const [m, s] = String(d).split(":");
        return Number(m) * 60 + Number(s);
      }
      return num(p.clock?.value ?? d);
    })(),
    clockDisplay: p.clock?.displayValue ?? "",
    type: p.type?.text ?? "",
    typeId: String(p.type?.id ?? ""),
    text: p.text ?? "",
    teamId: p.team?.id ? String(p.team.id) : p.team?.$ref ? String(p.team.$ref).match(/teams\/(\d+)/)?.[1] ?? null : null,
    athletes: (p.participants ?? [])
      .map((x: J) => x?.athlete?.id ?? String(x?.athlete?.$ref ?? "").match(/athletes\/(\d+)/)?.[1])
      .filter(Boolean)
      .map(String),
    scoring: Boolean(p.scoringPlay),
    scoreValue: num(p.scoreValue),
    shooting: Boolean(p.shootingPlay),
    pointsAttempted: p.pointsAttempted != null ? num(p.pointsAttempted) : null,
    homeScore: num(p.homeScore),
    awayScore: num(p.awayScore),
    x: valid(x) ? x : null,
    y: valid(y) ? y : null,
  };
}

export async function getGameSummary(l: League, gameId: string): Promise<GameSummary | null> {
  const j = await getJson(`${SITE(l)}/summary${qs({ event: gameId })}`, TTL.live);
  if (!j?.header) return null;
  const comp = j.header.competitions?.[0] ?? {};
  const card = toGameCard({ ...comp, id: gameId, date: comp.date, season: j.header.season }, l);

  const teamStats: J[] = j.boxscore?.teams ?? [];
  const box: BoxTeam[] = (j.boxscore?.players ?? []).map((entry: J) => {
    const s = entry.statistics?.[0] ?? {};
    const cols = columnsOf(s);
    const team = toTeam(entry.team, l);
    const players: BoxPlayer[] = (s.athletes ?? []).map((a: J) => ({
      player: { ...toPlayerRef(a.athlete, l), teamId: team.id },
      starter: Boolean(a.starter),
      dnp: Boolean(a.didNotPlay) || !(a.stats ?? []).length,
      reason: a.reason ?? "",
      box: boxFromRow(cols, a.stats ?? []),
    }));
    const sum = players.reduce((acc, p) => {
      (Object.keys(acc) as (keyof BoxLine)[]).forEach((k) => (acc[k] = (acc[k] ?? 0) + (p.box[k] ?? 0)));
      return acc;
    }, emptyBox());
    const ts = teamStats.find((t: J) => String(t.team?.id) === team.id);
    const side = card.home.team.id === team.id ? card.home : card.away;
    return {
      team,
      homeAway: card.home.team.id === team.id ? "home" : "away",
      players,
      totals: teamTotalsFromTeamStats(ts?.statistics ?? [], sum, side.score),
      teamStats: (ts?.statistics ?? []).map((x: J) => ({
        name: x.name ?? "",
        label: x.label ?? x.abbreviation ?? x.name ?? "",
        value: String(x.displayValue ?? ""),
      })),
    } satisfies BoxTeam;
  });

  const injuries = (j.injuries ?? []).map((t: J) => ({
    teamId: String(t.team?.id ?? ""),
    items: (t.injuries ?? []).map((i: J) => ({
      name: i.athlete?.displayName ?? "",
      status: i.status ?? "",
      detail: i.details?.type ?? i.type?.description ?? "",
    })),
  }));

  const lastFive = (j.lastFiveGames ?? []).map((t: J) => ({
    teamId: String(t.team?.id ?? ""),
    games: (t.events ?? []).map((e: J) => ({
      result: e.gameResult ?? "",
      score: e.score ?? "",
      opp: e.opponent?.abbreviation ?? "",
      date: e.gameDate ?? "",
    })),
  }));

  return {
    card,
    box,
    plays: (j.plays ?? []).map(toPlay).sort((a: Play, b: Play) => a.seq - b.seq),
    officials: (j.gameInfo?.officials ?? []).map((o: J) => o.displayName ?? o.fullName).filter(Boolean),
    attendance: j.gameInfo?.attendance ?? null,
    winProb: (j.winprobability ?? []).map((w: J) => ({ playId: String(w.playId), home: num(w.homeWinPercentage) })),
    injuries,
    seasonSeries: (j.seasonseries ?? []).map((s: J) => s.summary ?? s.description ?? "").filter(Boolean),
    lastFive,
  };
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export async function getAthlete(l: League, id: string) {
  const j = await getJson(`${WEB(l)}/athletes/${id}`, TTL.player);
  const a = j?.athlete;
  if (!a) return null;
  return {
    ...toPlayerRef(a, l),
    team: a.team ? toTeam(a.team, l) : null,
    height: a.displayHeight ?? "",
    weight: a.displayWeight ?? "",
    age: a.age ?? null,
    dob: a.displayDOB ?? "",
    birthPlace: a.displayBirthPlace ?? "",
    draft: a.displayDraft ?? "",
    experience: a.displayExperience ?? "",
    college: a.college?.name ?? "",
    status: a.status?.name ?? "",
    injury: a.injuries?.[0] ? `${a.injuries[0].status ?? ""} — ${a.injuries[0].details?.type ?? a.injuries[0].type?.description ?? ""}` : null,
  };
}

const AVG_LABELS: Record<string, keyof BoxLine | "gp" | "gs" | "fg" | "3pt" | "ft"> = {
  GP: "gp",
  GS: "gs",
  MIN: "min",
  FG: "fg",
  "3PT": "3pt",
  FT: "ft",
  OR: "oreb",
  DR: "dreb",
  REB: "reb",
  AST: "ast",
  BLK: "blk",
  STL: "stl",
  PF: "pf",
  TO: "tov",
  PTS: "pts",
};

function rowFromLabels(labels: string[], stats: (string | number)[]) {
  const b = emptyBox();
  let gp = 0;
  let gs = 0;
  labels.forEach((lab, i) => {
    const k = AVG_LABELS[lab];
    const v = stats[i];
    if (!k) return;
    if (k === "gp") gp = num(v);
    else if (k === "gs") gs = num(v);
    else if (k === "fg") [b.fgm, b.fga] = parseMadeAtt(v);
    else if (k === "3pt") [b.tpm, b.tpa] = parseMadeAtt(v);
    else if (k === "ft") [b.ftm, b.fta] = parseMadeAtt(v);
    else if (k === "min") b.min = parseMinutes(String(v));
    else b[k] = num(v);
  });
  if (!b.reb) b.reb = b.oreb + b.dreb;
  return { box: b, gp, gs };
}

/** Season-by-season per-game averages (regular season by default). */
export async function getPlayerSeasons(l: League, id: string, seasonType = 2): Promise<PlayerSeasonRow[]> {
  const j = await getJson(`${WEB(l)}/athletes/${id}/stats${qs({ seasontype: seasonType })}`, TTL.player);
  const cat = (j?.categories ?? []).find((c: J) => c.name === "averages");
  if (!cat) return [];
  const labels: string[] = cat.labels ?? [];
  const teams: Record<string, J> = j?.teams ?? {};
  const byId: Record<string, string> = {};
  Object.values(teams).forEach((t: J) => (byId[String(t.id)] = t.abbreviation));
  return (cat.statistics ?? []).map((s: J) => {
    const { box, gp, gs } = rowFromLabels(labels, s.stats ?? []);
    return {
      season: s.season?.displayName ?? "",
      year: num(s.season?.year),
      teamId: s.teamId ? String(s.teamId) : "",
      teamAbbr: s.teamId ? byId[String(s.teamId)] ?? "" : s.displayName ?? "TOT",
      gp,
      gs,
      avg: box,
    } satisfies PlayerSeasonRow;
  });
}

export async function getPlayerGameLog(l: League, id: string, season?: number): Promise<GameLogRow[]> {
  const j = await getJson(`${WEB(l)}/athletes/${id}/gamelog${qs({ season })}`, TTL.player);
  if (!j) return [];
  const labels: string[] = j.labels ?? [];
  const meta: Record<string, J> = j.events ?? {};
  const seen = new Map<string, GameLogRow>();
  const walk = (cats: J[]) => {
    for (const c of cats ?? []) {
      for (const e of c.events ?? []) {
        const id = String(e.eventId ?? "");
        if (!id || seen.has(id)) continue;
        const m = meta[id] ?? {};
        const b = emptyBox();
        labels.forEach((lab, i) => {
          const v = e.stats?.[i];
          switch (lab) {
            case "MIN": b.min = parseMinutes(String(v ?? "")); break;
            case "FG": [b.fgm, b.fga] = parseMadeAtt(v); break;
            case "3PT": [b.tpm, b.tpa] = parseMadeAtt(v); break;
            case "FT": [b.ftm, b.fta] = parseMadeAtt(v); break;
            case "OR": case "OREB": b.oreb = num(v); break;
            case "DR": case "DREB": b.dreb = num(v); break;
            case "REB": b.reb = num(v); break;
            case "AST": b.ast = num(v); break;
            case "BLK": b.blk = num(v); break;
            case "STL": b.stl = num(v); break;
            case "PF": b.pf = num(v); break;
            case "TO": b.tov = num(v); break;
            case "PTS": b.pts = num(v); break;
            case "+/-": b.pm = num(v); break;
          }
        });
        seen.set(id, {
          eventId: id,
          date: m.gameDate ?? "",
          opp: m.opponent?.abbreviation ?? "",
          oppLogo: m.opponent?.logo ?? "",
          atVs: m.atVs ?? "",
          result: m.gameResult ?? "",
          score: m.score ?? "",
          box: b,
        });
      }
    }
  };
  for (const st of j.seasonTypes ?? []) walk(st.categories ?? []);
  return [...seen.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const LEADER_SORTS: Record<string, { label: string; sort: string }> = {
  pts: { label: "Points", sort: "offensive.avgPoints:desc" },
  reb: { label: "Rebounds", sort: "general.avgRebounds:desc" },
  ast: { label: "Assists", sort: "offensive.avgAssists:desc" },
  stl: { label: "Steals", sort: "defensive.avgSteals:desc" },
  blk: { label: "Blocks", sort: "defensive.avgBlocks:desc" },
  tpm: { label: "3PM", sort: "offensive.avgThreePointFieldGoalsMade:desc" },
  fgp: { label: "FG%", sort: "offensive.fieldGoalPct:desc" },
  tpp: { label: "3P%", sort: "offensive.threePointFieldGoalPct:desc" },
  ftp: { label: "FT%", sort: "offensive.freeThrowPct:desc" },
  tov: { label: "Turnovers", sort: "offensive.avgTurnovers:desc" },
  min: { label: "Minutes", sort: "general.avgMinutes:desc" },
  dd2: { label: "Double-doubles", sort: "general.doubleDouble:desc" },
};

export async function getLeaders(
  l: League,
  opts: { season: number; seasonType?: number; sortKey?: string; limit?: number; page?: number; qualified?: boolean },
): Promise<{ rows: LeaderRow[]; pages: number; count: number }> {
  const sort = LEADER_SORTS[opts.sortKey ?? "pts"]?.sort ?? LEADER_SORTS.pts.sort;
  const j = await getJson(
    `${WEB(l)}/statistics/byathlete${qs({
      region: "us",
      lang: "en",
      contentorigin: "espn",
      isqualified: opts.qualified === false ? "false" : "true",
      season: opts.season,
      seasontype: opts.seasonType ?? 2,
      sort,
      limit: opts.limit ?? 50,
      page: opts.page ?? 1,
    })}`,
    TTL.teamStats,
  );
  if (!j) return { rows: [], pages: 0, count: 0 };
  const catDefs: Record<string, string[]> = {};
  for (const c of j.categories ?? []) catDefs[c.name] = c.names ?? [];
  const rows: LeaderRow[] = (j.athletes ?? []).map((a: J) => {
    const values: Record<string, number> = {};
    for (const c of a.categories ?? []) {
      const names = catDefs[c.name] ?? [];
      (c.values ?? []).forEach((v: number, i: number) => {
        const n = names[i];
        if (n && values[n] == null) values[n] = num(v);
      });
    }
    const ath = a.athlete ?? {};
    return {
      player: { ...toPlayerRef(ath, l), teamId: ath.teamId ? String(ath.teamId) : undefined },
      teamAbbr: ath.teamShortName ?? "",
      teamLogo: ath.teamLogos?.[0]?.href ?? "",
      values,
    };
  });
  return { rows, pages: num(j.pagination?.pages), count: num(j.pagination?.count) };
}
