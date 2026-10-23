// Cricket — every match in the world, from ESPN's public cricket feed (the same data and
// match IDs as ESPNcricinfo; Cricinfo's own API blocks server requests).
import "server-only";
import { localDayKey, shiftDay } from "./format";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;
const BASE = "https://site.api.espn.com/apis/site/v2/sports/cricket";

async function getJson(url: string, revalidate: number): Promise<J | null> {
  try {
    const res = await fetch(url, { next: { revalidate }, headers: { "User-Agent": "Mozilla/5.0 (stat-tracker)", Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export type Format = "Test" | "ODI" | "T20I" | "First-class" | "List A" | "T20" | "Other";

export interface Innings {
  period: number;
  runs: number | null;
  wickets: number | null;
  overs: number | null;
  text: string; // e.g. "245/6 (50 ov)"
  batting: boolean;
}

export interface MatchTeam {
  id: string;
  name: string;
  abbr: string;
  logo: string;
  score: string;
  innings: Innings[];
  winner: boolean;
  homeAway: string;
}

export interface Match {
  id: string;
  leagueId: string;
  leagueName: string;
  date: string;
  endDate: string;
  name: string;
  description: string; // e.g. "3rd ODI"
  format: Format;
  international: boolean;
  women: boolean;
  state: "pre" | "in" | "post";
  status: string; // short status line
  summary: string; // result / situation ("NZ need 45 runs from 30 balls")
  venue: string;
  teams: MatchTeam[];
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && String(v ?? "") !== "" ? n : null;
};

/** "245/6 (50 ov)" / "312" / "120/3 (20/20 ov)" → parts */
export function parseScore(s: string): { runs: number | null; wickets: number | null; overs: number | null } {
  const m = String(s ?? "").match(/(\d+)(?:\/(\d+))?(?:\s*\(([\d.]+)(?:\/[\d.]+)?\s*ov)?/i);
  if (!m) return { runs: null, wickets: null, overs: null };
  return { runs: Number(m[1]), wickets: m[2] != null ? Number(m[2]) : 10, overs: m[3] != null ? Number(m[3]) : null };
}

function formatOf(comp: J, leagueName: string): { format: Format; international: boolean } {
  const cls = `${comp?.class?.name ?? ""} ${comp?.class?.generalClassCard ?? ""} ${comp?.class?.eventType ?? ""} ${leagueName}`;
  const intl = /Test matches|One-Day Internationals|Twenty20 Internationals|\bT20I\b|\bODI\b|tour of|ICC|World Cup|Tri-Series|Asia Cup|Champions Trophy/i.test(cls);
  if (/Test matches/i.test(cls) || (/\bTest\b/.test(cls) && intl && !/First-class/i.test(cls))) return { format: "Test", international: true };
  if (/One-Day Internationals|\bODI\b/i.test(cls)) return { format: "ODI", international: true };
  if (/Twenty20 Internationals|\bT20I\b/i.test(cls)) return { format: "T20I", international: true };
  if (/First-class/i.test(cls)) return { format: "First-class", international: intl };
  if (/List A|One-day/i.test(cls)) return { format: "List A", international: intl };
  if (/Twenty20|T20|\bT10\b|Hundred/i.test(cls)) return { format: "T20", international: intl };
  return { format: "Other", international: intl };
}

function toTeam(c: J): MatchTeam {
  const t = c?.team ?? {};
  const scoreStr = typeof c?.score === "string" ? c.score : c?.score?.displayValue ?? "";
  const ls: J[] = Array.isArray(c?.linescores) ? c.linescores : [];
  const innings: Innings[] = ls.length
    ? ls.map((l: J, i: number) => {
        const text = l?.displayValue ?? l?.description ?? (l?.runs != null ? `${l.runs}/${l.wickets ?? 10}${l.overs ? ` (${l.overs} ov)` : ""}` : "");
        const p = parseScore(text);
        return {
          period: num(l?.period) ?? i + 1,
          runs: num(l?.runs) ?? p.runs,
          wickets: num(l?.wickets) ?? p.wickets,
          overs: num(l?.overs) ?? p.overs,
          text,
          batting: Boolean(l?.isBatting),
        };
      })
    : scoreStr
      ? scoreStr.split(/\s*&\s*/).map((part: string, i: number) => ({ period: i + 1, ...parseScore(part), text: part, batting: false }))
      : [];
  return {
    id: String(t.id ?? ""),
    name: t.displayName ?? t.name ?? "",
    abbr: t.abbreviation ?? t.shortDisplayName ?? "",
    logo: t.logo ?? t.logos?.[0]?.href ?? "",
    score: scoreStr,
    innings,
    winner: c?.winner === true || c?.winner === "true",
    homeAway: c?.homeAway ?? "",
  };
}

export function toMatch(e: J, league: { id: string; name: string }): Match {
  const comp = e?.competitions?.[0] ?? {};
  const status = e?.status ?? comp?.status ?? {};
  const state = status?.type?.state === "in" ? "in" : status?.type?.state === "post" ? "post" : "pre";
  const { format, international } = formatOf(comp, league.name);
  return {
    id: String(e?.id ?? ""),
    leagueId: league.id,
    leagueName: league.name,
    date: e?.date ?? comp?.date ?? "",
    endDate: e?.endDate ?? comp?.endDate ?? "",
    name: e?.name ?? "",
    description: e?.description ?? comp?.description ?? "",
    format,
    international,
    women: /women/i.test(`${league.name} ${e?.name ?? ""}`),
    state,
    status: status?.type?.shortDetail ?? status?.type?.detail ?? status?.type?.description ?? "",
    summary: status?.summary ?? comp?.status?.summary ?? e?.note ?? status?.type?.detail ?? "",
    venue: comp?.venue?.fullName ?? comp?.venue?.address?.city ?? "",
    teams: (comp?.competitors ?? []).map(toTeam),
  };
}

function eventsFromPanel(j: J): Match[] {
  const out: Match[] = [];
  for (const s of j?.scores ?? []) {
    const lg = s?.leagues?.[0] ?? {};
    for (const e of s?.events ?? []) out.push(toMatch(e, { id: String(lg.id ?? ""), name: lg.name ?? "" }));
  }
  return out;
}

/** Every match in the world whose start falls on a local (NZ) calendar day, plus multi-day matches in progress. */
export async function getDayMatches(dayKey: string): Promise<Match[]> {
  const keys = [shiftDay(dayKey, -1), dayKey, shiftDay(dayKey, 1)];
  const panels = await Promise.all(keys.map((k) => getJson(`${BASE}/scorepanel?dates=${k}`, 60)));
  const seen = new Set<string>();
  const all = panels.flatMap((p) => (p ? eventsFromPanel(p) : []));
  return all
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      const start = localDayKey(m.date);
      const end = m.endDate ? localDayKey(m.endDate) : start;
      return start === dayKey || (start < dayKey && end >= dayKey); // Tests / first-class span days
    })
    .sort((a, b) => (a.state === "in" ? -1 : 0) - (b.state === "in" ? -1 : 0) || (a.date < b.date ? -1 : 1));
}

// ---------------------------------------------------------------------------- scorecard

export interface BatRow {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  sr: number | null;
  out: string; // dismissal text, "not out"
  notOut: boolean;
  active: boolean;
}

export interface BowlRow {
  id: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  econ: number | null;
  dots: number | null;
  wides: number | null;
  noballs: number | null;
  active: boolean;
}

export interface InningsCard {
  period: number;
  battingTeam: MatchTeam | null;
  bowlingTeam: MatchTeam | null;
  total: { runs: number | null; wickets: number | null; overs: number | null; text: string };
  batting: BatRow[];
  bowling: BowlRow[];
}

export interface MatchDetail {
  match: Match;
  innings: InningsCard[];
  notes: { type: string; text: string }[];
  officials: string[];
  /** Named squads (available before the match starts). */
  squads: { teamId: string; players: { id: string; name: string; role: string }[] }[];
}

const stat = (o: J, ...keys: string[]) => {
  for (const k of keys) {
    if (o?.[k] != null) return num(o[k]);
  }
  const cats: J[] = o?.statistics?.categories ?? [];
  for (const c of cats) for (const s of c?.stats ?? []) if (keys.includes(s?.name)) return num(s?.value ?? s?.displayValue);
  return null;
};

/** Balls in an overs figure like 21.4 (= 21 overs, 4 balls). */
export const ballsOf = (overs: number | null) => (overs == null ? 0 : Math.floor(overs) * 6 + Math.round((overs % 1) * 10));

export async function getMatch(leagueId: string, eventId: string, dayKey?: string): Promise<MatchDetail | null> {
  const j = await getJson(`${BASE}/${leagueId}/summary?event=${eventId}`, 30);
  if (!j) return null;

  // Match header: from the summary if present, otherwise from that day's score panel.
  let match: Match | null = null;
  const hc = j.header?.competitions?.[0];
  if (hc) {
    match = toMatch({ ...j.header, competitions: [hc], status: hc.status ?? j.header.status, id: eventId }, { id: leagueId, name: j.header?.league?.name ?? j.header?.season?.name ?? "" });
  }
  if (!match || !match.teams.length) {
    const days = dayKey ? [dayKey, shiftDay(dayKey, -1), shiftDay(dayKey, 1)] : [];
    for (const d of days) {
      const found = (await getDayMatches(d)).find((m) => m.id === eventId);
      if (found) {
        match = found;
        break;
      }
    }
  }
  const rosters: J[] = j.rosters ?? [];
  if (!match) {
    match = {
      id: eventId,
      leagueId,
      leagueName: "",
      date: "",
      endDate: "",
      name: rosters.map((r) => r.team?.displayName).filter(Boolean).join(" v "),
      description: "",
      format: "Other",
      international: false,
      women: false,
      state: "post",
      status: "",
      summary: "",
      venue: j.gameInfo?.venue?.fullName ?? "",
      teams: rosters.map((r) => toTeam({ team: r.team, homeAway: r.homeAway, winner: r.winner })),
    };
  }
  if (!match.venue) match.venue = j.gameInfo?.venue?.fullName ?? "";

  // Per-player innings lines, keyed by period
  type Line = { team: string; period: number; bat?: BatRow; bowl?: BowlRow };
  const lines: Line[] = [];
  for (const r of rosters) {
    const teamId = String(r.team?.id ?? "");
    for (const p of r.roster ?? []) {
      const a = p.athlete ?? {};
      for (const per of p.linescores ?? []) {
        const period = num(per.period) ?? 1;
        for (const inner of per.linescores ?? [per]) {
          const bat = inner.batting ?? (inner.statistics && stat(inner, "ballsFaced") != null ? inner : null);
          const bowl = inner.bowling ?? null;
          const batStats = inner.batting ? { ...inner, ...inner.batting } : inner;
          if (bat && (stat(batStats, "ballsFaced") != null || stat(batStats, "runs") != null) && !inner.bowling) {
            const outText = inner.batting?.outDetails?.shortText ?? inner.outDetails?.shortText ?? "";
            const balls = stat(batStats, "ballsFaced") ?? 0;
            const runs = stat(batStats, "runs") ?? 0;
            lines.push({
              team: teamId,
              period,
              bat: {
                id: String(a.id ?? ""),
                name: a.battingName ?? a.shortName ?? a.displayName ?? "",
                runs,
                balls,
                fours: stat(batStats, "fours") ?? 0,
                sixes: stat(batStats, "sixes") ?? 0,
                sr: stat(batStats, "strikeRate") ?? (balls ? (100 * runs) / balls : null),
                out: outText || "not out",
                notOut: !outText || /not out/i.test(outText),
                active: Boolean(inner.active || a.active === "batting"),
              },
            });
          }
          if (bowl || stat(inner, "conceded") != null) {
            const b = { ...inner, ...(bowl ?? {}) };
            const overs = stat(b, "overs") ?? 0;
            const conceded = stat(b, "conceded") ?? 0;
            lines.push({
              team: teamId,
              period,
              bowl: {
                id: String(a.id ?? ""),
                name: a.shortName ?? a.displayName ?? "",
                overs,
                maidens: stat(b, "maidens") ?? 0,
                runs: conceded,
                wickets: stat(b, "wickets") ?? 0,
                econ: stat(b, "economyRate") ?? (overs ? conceded / (ballsOf(overs) / 6) : null),
                dots: stat(b, "dots"),
                wides: stat(b, "wides"),
                noballs: stat(b, "noballs"),
                active: /bowler/i.test(String(inner.activeName ?? p.activeName ?? "")),
              },
            });
          }
        }
      }
    }
  }

  const periods = [...new Set(lines.map((l) => l.period))].sort((a, b) => a - b);
  const teamById = new Map(match.teams.map((t) => [t.id, t]));
  const innings: InningsCard[] = periods
    .map((period) => {
      const batting = lines.filter((l) => l.period === period && l.bat && l.bat.balls + l.bat.runs > 0 || (l.period === period && l.bat && !l.bat.notOut));
      const bowling = lines.filter((l) => l.period === period && l.bowl && l.bowl.overs > 0);
      const batTeamId = batting[0]?.team ?? (bowling[0] ? match!.teams.find((t) => t.id !== bowling[0].team)?.id : undefined);
      const bowlTeamId = bowling[0]?.team ?? match!.teams.find((t) => t.id !== batTeamId)?.id;
      const battingTeam = (batTeamId && teamById.get(batTeamId)) || null;
      const bowlingTeam = (bowlTeamId && teamById.get(bowlTeamId)) || null;
      // team's innings number = how many earlier periods this team batted
      const teamInningsIdx = periods.filter((p) => p < period && lines.some((l) => l.period === p && l.bat && l.team === batTeamId)).length;
      const fromHeader = battingTeam?.innings[teamInningsIdx];
      const sumRuns = bowling.reduce((a, l) => a + (l.bowl?.runs ?? 0), 0);
      const sumWk = batting.filter((l) => l.bat && !l.bat.notOut).length;
      const sumOvers = bowling.reduce((a, l) => a + ballsOf(l.bowl?.overs ?? 0), 0);
      const oversFromBalls = sumOvers ? Math.floor(sumOvers / 6) + (sumOvers % 6) / 10 : null;
      return {
        period,
        battingTeam,
        bowlingTeam,
        total: {
          runs: fromHeader?.runs ?? (sumRuns || null),
          wickets: fromHeader?.wickets ?? sumWk,
          overs: fromHeader?.overs ?? oversFromBalls,
          text: fromHeader?.text ?? "",
        },
        batting: batting.map((l) => l.bat!),
        bowling: bowling.map((l) => l.bowl!).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs),
      };
    })
    .filter((i) => i.batting.length || i.bowling.length);

  return {
    match,
    innings,
    notes: (j.notes ?? []).map((n: J) => ({ type: String(n.type ?? ""), text: String(n.text ?? "") })).filter((n: { text: string }) => n.text),
    officials: (j.gameInfo?.officials ?? []).map((o: J) => o.displayName ?? o.fullName).filter(Boolean),
    squads: rosters.map((r) => ({
      teamId: String(r.team?.id ?? ""),
      players: (r.roster ?? []).map((p: J) => ({
        id: String(p.athlete?.id ?? ""),
        name: p.athlete?.shortName ?? p.athlete?.displayName ?? "",
        role: [p.captain ? "c" : "", p.keeper ? "wk" : "", p.athlete?.position?.name ?? p.position?.name ?? ""].filter(Boolean).join(" · "),
      })),
    })),
  };
}

// ---------------------------------------------------------------------------- analytics

export const MAX_OVERS: Partial<Record<Format, number>> = { ODI: 50, "List A": 50, T20I: 20, T20: 20 };

export function inningsStats(c: InningsCard) {
  // The official innings overs win; summing bowlers is the fallback.
  const balls = ballsOf(c.total.overs) || c.bowling.reduce((a, b) => a + ballsOf(b.overs), 0);
  const runs = c.total.runs ?? c.bowling.reduce((a, b) => a + b.runs, 0);
  const fours = c.batting.reduce((a, b) => a + b.fours, 0);
  const sixes = c.batting.reduce((a, b) => a + b.sixes, 0);
  const dots = c.bowling.every((b) => b.dots != null) ? c.bowling.reduce((a, b) => a + (b.dots ?? 0), 0) : null;
  const batRuns = c.batting.reduce((a, b) => a + b.runs, 0);
  return {
    runs,
    balls,
    runRate: balls ? (6 * runs) / balls : null,
    fours,
    sixes,
    boundaryRuns: 4 * fours + 6 * sixes,
    boundaryPct: batRuns ? (4 * fours + 6 * sixes) / batRuns : null,
    dotPct: dots != null && balls ? dots / balls : null,
    extras: c.total.runs != null ? Math.max(0, c.total.runs - batRuns) : null,
    top: [...c.batting].sort((a, b) => b.runs - a.runs)[0] ?? null,
    best: c.bowling[0] ?? null,
  };
}

// ---------------------------------------------------------------------------- pre-match preview

const family = (f: Format) => (f === "T20I" || f === "T20" ? "t20" : f === "ODI" || f === "List A" ? "odi" : f === "Test" || f === "First-class" ? "long" : "other");

export interface FormResult {
  match: Match;
  opp: string;
  result: "W" | "L" | "D";
  scoreFor: string;
  scoreAgainst: string;
}
export interface BatForm { id: string; name: string; inns: number; runs: number; balls: number; notOuts: number; hs: number; recent: string[]; avg: number | null; sr: number | null }
export interface BowlForm { id: string; name: string; inns: number; balls: number; runs: number; wickets: number; best: string; econ: number | null; avg: number | null }
export interface TeamPreview {
  team: MatchTeam;
  form: FormResult[];
  batting: BatForm[];
  bowling: BowlForm[];
  avgFirstInnings: number | null;
  squad: { id: string; name: string; role: string }[];
}
export interface Preview {
  teams: TeamPreview[];
  h2h: FormResult[]; // from teams[0]'s point of view
  venue: { matches: Match[]; avgFirst: number | null; chaseWins: number; defendWins: number };
  daysScanned: number;
}

/** The side that batted first, when the feed makes it unambiguous. */
const battedFirst = (m: Match) => {
  const firsts = m.teams.filter((t) => t.innings.some((i) => i.period === 1));
  return firsts.length === 1 ? firsts[0] : null;
};
const firstInningsRuns = (m: Match) => battedFirst(m)?.innings.find((i) => i.period === 1)?.runs ?? null;

/** Built from the last few weeks of results: each side's form, player form, head-to-head and venue history. */
export async function getPreview(m: Match, days = 28): Promise<Preview> {
  const start = localDayKey(m.date || new Date().toISOString());
  const keys = Array.from({ length: days }, (_, i) => shiftDay(start, -(i + 1)));
  const panels = await Promise.all(keys.map((k) => getJson(`${BASE}/scorepanel?dates=${k}`, 6 * 3600)));
  const seen = new Set<string>();
  const past = panels
    .flatMap((p) => (p ? eventsFromPanel(p) : []))
    .filter((x) => x.state === "post" && x.id !== m.id && !seen.has(x.id) && (seen.add(x.id), true))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const fam = family(m.format);
  const vsTeam = (x: Match, id: string): FormResult | null => {
    const me = x.teams.find((t) => t.id === id);
    const op = x.teams.find((t) => t.id !== id);
    if (!me || !op) return null;
    return { match: x, opp: op.abbr || op.name, result: me.winner ? "W" : op.winner ? "L" : "D", scoreFor: me.score, scoreAgainst: op.score };
  };

  // squads: from this match's own summary when announced
  const own = await getMatch(m.leagueId, m.id).catch(() => null);

  const teams = await Promise.all(
    m.teams.map(async (team): Promise<TeamPreview> => {
      const mine = past.filter((x) => x.teams.some((t) => t.id === team.id));
      const same = mine.filter((x) => family(x.format) === fam);
      const pool = (same.length >= 3 ? same : mine).slice(0, 8);
      const form = pool.map((x) => vsTeam(x, team.id)!).filter(Boolean);
      const details = await Promise.all(pool.slice(0, 6).map((x) => getMatch(x.leagueId, x.id).catch(() => null)));
      const bat = new Map<string, BatForm>();
      const bowl = new Map<string, BowlForm & { bestW: number; bestR: number }>();
      for (const d of details) {
        for (const inn of d?.innings ?? []) {
          if (inn.battingTeam?.id === team.id)
            for (const b of inn.batting) {
              if (!b.balls && !b.runs && !b.out) continue;
              const r = bat.get(b.id) ?? { id: b.id, name: b.name, inns: 0, runs: 0, balls: 0, notOuts: 0, hs: 0, recent: [], avg: null, sr: null };
              r.inns++; r.runs += b.runs; r.balls += b.balls; if (b.notOut) r.notOuts++;
              r.hs = Math.max(r.hs, b.runs); r.recent.push(`${b.runs}${b.notOut ? "*" : ""}`);
              bat.set(b.id, r);
            }
          if (inn.bowlingTeam?.id === team.id)
            for (const b of inn.bowling) {
              const r = bowl.get(b.id) ?? { id: b.id, name: b.name, inns: 0, balls: 0, runs: 0, wickets: 0, best: "", econ: null, avg: null, bestW: -1, bestR: 0 };
              r.inns++; r.balls += ballsOf(b.overs); r.runs += b.runs; r.wickets += b.wickets;
              if (b.wickets > r.bestW || (b.wickets === r.bestW && b.runs < r.bestR)) { r.bestW = b.wickets; r.bestR = b.runs; r.best = `${b.wickets}/${b.runs}`; }
              bowl.set(b.id, r);
            }
        }
      }
      const batting = [...bat.values()]
        .map((r) => ({ ...r, avg: r.inns - r.notOuts ? r.runs / (r.inns - r.notOuts) : null, sr: r.balls ? (100 * r.runs) / r.balls : null }))
        .sort((a, b) => b.runs - a.runs).slice(0, 8);
      const bowling = [...bowl.values()]
        .map(({ bestW: _w, bestR: _r, ...r }) => ({ ...r, econ: r.balls ? (6 * r.runs) / r.balls : null, avg: r.wickets ? r.runs / r.wickets : null }))
        .sort((a, b) => b.wickets - a.wickets || (a.econ ?? 99) - (b.econ ?? 99)).slice(0, 8);
      const firsts = pool.map((x) => {
        const me = x.teams.find((t) => t.id === team.id);
        return me?.innings[0]?.runs ?? null;
      }).filter((v): v is number => v != null);
      return {
        team, form, batting, bowling,
        avgFirstInnings: firsts.length ? firsts.reduce((a, b) => a + b, 0) / firsts.length : null,
        squad: own?.squads.find((s) => s.teamId === team.id)?.players ?? [],
      };
    }),
  );

  const [a, b] = m.teams;
  const h2h = a && b ? past.filter((x) => x.teams.some((t) => t.id === a.id) && x.teams.some((t) => t.id === b.id)).map((x) => vsTeam(x, a.id)!) : [];
  const atVenue = m.venue ? past.filter((x) => x.venue === m.venue && family(x.format) === fam).slice(0, 10) : [];
  const vFirsts = atVenue.map(firstInningsRuns).filter((v): v is number => v != null);
  let chaseWins = 0, defendWins = 0;
  for (const x of atVenue) {
    const w = x.teams.find((t) => t.winner);
    if (!w) continue;
    const bf = battedFirst(x);
    if (!bf) continue;
    if (bf.id === w.id) defendWins++; else chaseWins++;
  }
  return { teams, h2h, venue: { matches: atVenue, avgFirst: vFirsts.length ? vFirsts.reduce((s, v) => s + v, 0) / vFirsts.length : null, chaseWins, defendWins }, daysScanned: days };
}
