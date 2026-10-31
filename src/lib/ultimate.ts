// The Ultimate Bet: scan every game in the next 48 hours across all sports, rate each pick
// with our own models, and build three cross-code multis (one leg per sport code).
import "server-only";
import { getMatchesBetween, type Match } from "./cricket";
import { getUpcoming } from "./espn";
import { localDayKey, shiftDay, todayKey } from "./format";
import { getLeagueTable, projectGame, resolveSeason } from "./league";
import { getLeague } from "@/leagues/registry";
import { COMPS, type CompDef } from "@/sports/comps";
import { defaultSeason, getSeasonBook } from "@/sports/data";
import { pMarginAtLeast, project, pTotalOver, soccerMarkets } from "@/sports/model";
import { keyOf, marketChances, type RaceCard } from "./racing/core";
import { nzShift, nzToday, ratesFor } from "./racing/store";
import { getMeetings, getRace } from "./racing/tab";

export type Code = "basketball" | "rugby-league" | "rugby" | "soccer" | "netball" | "cricket" | "racing";
export const CODE_LABEL: Record<Code, string> = { basketball: "Basketball", "rugby-league": "Rugby league", rugby: "Rugby union", soccer: "Football", netball: "Netball", cricket: "Cricket", racing: "Racing" };

export interface Leg {
  id: string; // unique per game + market
  code: Code;
  comp: string; // "NBA", "A-League Men", "T20I · Pakistan tour of …"
  slipLeague: string; // betslip league key
  gameId: string;
  game: string; // "BOS @ NYK"
  date: string;
  href: string;
  market: "Result" | "Line" | "Total" | "Goals";
  pick: string; // "Celtics to win"
  p: number;
  confidence: "high" | "medium" | "low";
  /** Market disagreement: our chance minus the market's (NBA spreads), when we know it. */
  edge?: number;
  why: string;
}

export interface UltimateOption {
  n: number; // 1–3 = the options, 0 = the Grim Reaper
  name: string;
  blurb: string;
  legs: Leg[];
  p: number;
  fair: number;
}

export interface UltimateResult {
  generatedAt: string;
  windowEnd: string;
  scanned: { code: Code; games: number }[];
  options: UltimateOption[];
  /** "Flipper": a second calculation that ignores every game used in the three options. */
  reaper: UltimateOption | null;
}

const HOURS = 48;
const normCdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const half = (x: number) => Math.round(x) + 0.5;

// ------------------------------------------------------------------ basketball

async function basketball(id: "nba" | "nbl", until: number): Promise<{ legs: Leg[]; games: number }> {
  const l = getLeague(id);
  const season = await resolveSeason(l, undefined);
  let table = await getLeagueTable(l, season.year, 2);
  if (!table.averages) table = await getLeagueTable(l, season.year - 1, 2);
  const rows = new Map(table.rows.map((r) => [r.team.id, r]));
  const days = await getUpcoming(l, 3);
  const games = days.flatMap((d) => d.games).filter((g) => g.state === "pre" && Date.parse(g.date) > Date.now() && Date.parse(g.date) < until);
  const hca = id === "nba" ? 2.5 : 3;
  const sd = id === "nba" ? 12 : 11;
  const legs: Leg[] = [];
  for (const g of games) {
    const pr = projectGame(g, rows);
    if (!pr) continue;
    const ourMargin = pr.home - pr.away + hca; // home minus away
    // Market line from ESPN ("BOS -5.5"): positive = home favoured
    let market: number | null = null;
    const m = g.odds?.details?.match(/^([A-Z]{2,4})\s*([-+]?\d+(\.\d+)?)/);
    if (m) {
      const n = Math.abs(Number(m[2]));
      market = m[1] === g.home.team.abbr ? n : m[1] === g.away.team.abbr ? -n : null;
    }
    // Blend with the market when we have it: early-season ratings are noisy
    const margin = market != null ? 0.5 * ourMargin + 0.5 * market : ourMargin;
    const pHome = 1 - normCdf((0 - margin) / sd);
    const gp = Math.min(rows.get(g.home.team.id)?.gp ?? 0, rows.get(g.away.team.id)?.gp ?? 0);
    const confidence = gp >= 10 ? "high" : gp >= 4 ? "medium" : "low";
    const game = `${g.away.team.abbr} @ ${g.home.team.abbr}`;
    const base = { code: "basketball" as Code, comp: l.shortName, slipLeague: id, gameId: g.id, game, date: g.date, href: `/${id}/games/${g.id}`, confidence: confidence as Leg["confidence"] };
    for (const [side, p] of [["home", pHome], ["away", 1 - pHome]] as const) {
      const t = side === "home" ? g.home.team : g.away.team;
      legs.push({ ...base, id: `${g.id}:ml:${side}`, market: "Result", pick: `${t.shortName ?? t.abbr} to win`, p, why: `We project ${g.away.team.abbr} ${Math.round(pr.away - hca / 2)}–${Math.round(pr.home + hca / 2)} ${g.home.team.abbr}${market != null ? `; market ${g.odds?.details}` : ""}` });
    }
    // Line: the market's handicap, judged on our blended margin (half ours, half the market's)
    if (market != null) {
      const favHome = market > 0;
      const line = Math.abs(market);
      const favMargin = favHome ? margin : -margin;
      const pCover = 1 - normCdf((line - favMargin) / sd);
      const fav = favHome ? g.home.team : g.away.team;
      const dog = favHome ? g.away.team : g.home.team;
      const ours = favHome ? ourMargin : -ourMargin;
      const why = `We have ${ours >= 0 ? `${fav.abbr} by ${ours.toFixed(1)}` : `${dog.abbr} by ${(-ours).toFixed(1)}`}; market ${fav.abbr} −${line}`;
      legs.push({ ...base, id: `${g.id}:line:fav`, market: "Line", pick: `${fav.abbr} −${line}`, p: pCover, edge: pCover - 0.5, why });
      legs.push({ ...base, id: `${g.id}:line:dog`, market: "Line", pick: `${dog.abbr} +${line}`, p: 1 - pCover, edge: 0.5 - pCover, why });
    }
  }
  return { legs, games: games.length };
}

// ------------------------------------------------------------------ field sports

async function fieldComp(c: CompDef, until: number): Promise<{ legs: Leg[]; games: number }> {
  const season = await defaultSeason(c);
  const book = await getSeasonBook(c, season, false);
  const fx = book.fixtures.filter((f) => f.state === "pre" && Date.parse(f.date) > Date.now() && Date.parse(f.date) < until);
  const legs: Leg[] = [];
  for (const f of fx) {
    const pr = project(book.ratings, c, f.home.id, f.away.id);
    if (!pr) continue;
    const game = `${f.home.abbr || f.home.name} v ${f.away.abbr || f.away.name}`;
    const base = { code: c.sport as Code, comp: c.short, slipLeague: c.id, gameId: f.id, game, date: f.date, href: `/sport/${c.id}/match/${f.id}?season=${f.season}`, confidence: pr.confidence };
    const dp = c.sport === "soccer" ? 1 : 0;
    const why = `We project ${f.home.abbr || f.home.name} ${pr.home.toFixed(dp)}–${pr.away.toFixed(dp)} ${f.away.abbr || f.away.name}`;
    legs.push({ ...base, id: `${f.id}:h2h:home`, market: "Result", pick: `${f.home.name} to win`, p: pr.pHome, why });
    legs.push({ ...base, id: `${f.id}:h2h:away`, market: "Result", pick: `${f.away.name} to win`, p: pr.pAway, why });
    if (c.sport === "soccer") {
      const sm = soccerMarkets(pr);
      legs.push({ ...base, id: `${f.id}:tot:o25`, market: "Goals", pick: "Over 2.5 goals", p: sm.over25, why });
      legs.push({ ...base, id: `${f.id}:tot:u25`, market: "Goals", pick: "Under 2.5 goals", p: 1 - sm.over25, why });
      legs.push({ ...base, id: `${f.id}:btts:y`, market: "Goals", pick: "Both teams to score", p: sm.btts, why });
      // Double chance: favourite or draw
      const favHome = pr.pHome >= pr.pAway;
      legs.push({ ...base, id: `${f.id}:dc:${favHome ? "home" : "away"}`, market: "Result", pick: `${favHome ? f.home.name : f.away.name} or draw`, p: (favHome ? pr.pHome : pr.pAway) + pr.pDraw, why });
    } else {
      const sd = c.marginSd;
      const favHome = pr.margin >= 0;
      const line = half(Math.abs(pr.margin) * 0.6); // a shorter handicap than our margin
      const pp = favHome ? pr : { ...pr, margin: -pr.margin };
      const fav = favHome ? f.home : f.away;
      if (line >= 1.5) legs.push({ ...base, id: `${f.id}:line:${favHome ? "home" : "away"}:${line}`, market: "Line", pick: `${fav.abbr || fav.name} −${line}`, p: pMarginAtLeast(pp, sd, Math.ceil(line)), why });
      const tl = half(pr.total) - 4;
      legs.push({ ...base, id: `${f.id}:tot:o:${tl}`, market: "Total", pick: `Over ${tl} points`, p: pTotalOver(pr, sd, tl), why: `${why}, total ${pr.total.toFixed(0)}` });
    }
  }
  return { legs, games: fx.length };
}

// ------------------------------------------------------------------ cricket

// Rough strength of international sides on a log-odds scale (men's and women's white-ball).
// Used as a prior; recent results move it. Unknown sides sit at 0 (domestic) or -1 (associates).
const MEN: Record<string, number> = { India: 1.0, Australia: 0.9, England: 0.7, "South Africa": 0.7, "New Zealand": 0.7, Pakistan: 0.5, Afghanistan: 0.4, "Sri Lanka": 0.3, "West Indies": 0.2, Bangladesh: 0.2, Ireland: -0.3, Zimbabwe: -0.3, Netherlands: -0.4, Scotland: -0.4, "United States of America": -0.5, USA: -0.5, Namibia: -0.6, Nepal: -0.7, Oman: -0.8, "United Arab Emirates": -0.8, Canada: -0.9 };
const WOMEN: Record<string, number> = { Australia: 1.2, England: 0.8, India: 0.8, "New Zealand": 0.5, "South Africa": 0.5, "West Indies": 0.2, "Sri Lanka": 0, Pakistan: -0.1, Bangladesh: -0.2, Ireland: -0.6, Scotland: -0.7, Thailand: -0.7 };
const LIMITED = new Set(["T20I", "ODI", "T20", "List A"]);
const fam = (f: string) => (f === "T20I" || f === "T20" ? "t20" : "odi");
const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

async function cricket(until: number): Promise<{ legs: Leg[]; games: number }> {
  const today = todayKey();
  // Skip novelty formats (Sixes, T10, The Hundred) — form and strength don't carry over
  const NOVELTY = /sixes|t10|\b10s\b|hundred|super series of/i;
  const upcoming = await getMatchesBetween(today, shiftDay(today, 2), (m) => m.state === "pre" && LIMITED.has(m.format) && m.teams.length === 2 && !NOVELTY.test(`${m.leagueName} ${m.name}`));
  const games = upcoming.filter((m) => Date.parse(m.date) > Date.now() && Date.parse(m.date) < until && m.teams.every((t) => t.name && !/^(tba|tbc|tbd)$/i.test(t.name)));
  if (!games.length) return { legs: [], games: 0 };
  // Recent form: every completed limited-overs match in the last 45 days
  const past = await getMatchesBetween(shiftDay(today, -45), shiftDay(today, -1), (m) => m.state === "post" && LIMITED.has(m.format) && !NOVELTY.test(`${m.leagueName} ${m.name}`));
  const form = (teamId: string, f: string) => {
    let w = 0, n = 0;
    for (const m of past) {
      if (fam(m.format) !== fam(f)) continue;
      const me = m.teams.find((t) => t.id === teamId);
      if (!me) continue;
      const op = m.teams.find((t) => t.id !== teamId);
      if (!me.winner && !op?.winner) continue; // no result
      n++;
      if (me.winner) w++;
    }
    return { w, n, rate: (w + 3) / (n + 6) };
  };
  const legs: Leg[] = [];
  for (const m of games) {
    const [a, b] = m.teams;
    const table = m.women ? WOMEN : MEN;
    const strip = (s: string) => s.replace(/\s+Women$/i, "").trim();
    const prior = (name: string) => (m.international ? (table[strip(name)] ?? -1) : 0);
    const fa = form(a.id, m.format);
    const fb = form(b.id, m.format);
    const home = (t: typeof a) => (t.homeAway === "home" ? 0.25 : 0);
    const x = 1.0 * (prior(a.name) - prior(b.name)) + 0.5 * (logit(fa.rate) - logit(fb.rate)) + home(a) - home(b);
    const pA = Math.min(0.85, Math.max(0.15, sigmoid(x)));
    const known = (m.international && (strip(a.name) in table || strip(b.name) in table)) || fa.n + fb.n >= 6;
    const confidence: Leg["confidence"] = m.international && strip(a.name) in table && strip(b.name) in table && fa.n + fb.n >= 4 ? "high" : known ? "medium" : "low";
    const game = `${a.abbr || a.name} v ${b.abbr || b.name}`;
    const comp = `${m.format}${m.leagueName ? ` · ${m.leagueName}` : ""}`;
    const href = `/cricket/match/${m.leagueId}/${m.id}?d=${localDayKey(m.date).replace(/-/g, "")}`;
    const base = { code: "cricket" as Code, comp, slipLeague: "cricket", gameId: m.id, game, date: m.date, href, market: "Result" as const, confidence };
    const why = (t: Match["teams"][number], f: { w: number; n: number }) => `${t.abbr || t.name} won ${f.w} of last ${f.n} ${fam(m.format) === "t20" ? "T20s" : "one-dayers"}`;
    legs.push({ ...base, id: `${m.id}:win:${a.id}`, pick: `${a.name} to win`, p: pA, why: `${why(a, fa)}; ${why(b, fb)}` });
    legs.push({ ...base, id: `${m.id}:win:${b.id}`, pick: `${b.name} to win`, p: 1 - pA, why: `${why(b, fb)}; ${why(a, fa)}` });
  }
  return { legs, games: games.length };
}

// ------------------------------------------------------------------ horse racing

/**
 * NZ races in the window: the favourite to win and to place, with the chance implied by the
 * fixed-odds market once the bookmaker's margin is removed, nudged by the jockey's and
 * trainer's recent strike rates from our results database.
 */
async function racing(until: number): Promise<{ legs: Leg[]; games: number }> {
  const today = nzToday();
  const meetings = await getMeetings(today, nzShift(today, 1));
  const soon = meetings
    .flatMap((m) => m.races.map((r) => ({ m, r })))
    .filter(({ r }) => Date.parse(r.start) > Date.now() + 5 * 60_000 && Date.parse(r.start) < until && !/abandon|final/i.test(r.status))
    .sort((a, b) => (a.r.start < b.r.start ? -1 : 1))
    .slice(0, 36);
  const cards = (await Promise.all(soon.map(({ r }) => getRace(r.id).catch(() => null)))).filter((c): c is RaceCard => Boolean(c));
  const jockeys = await ratesFor("jockey", [...new Set(cards.flatMap((c) => c.runners.map((r) => keyOf(r.jockey))))], 90).catch(() => new Map());
  const trainers = await ratesFor("trainer", [...new Set(cards.flatMap((c) => c.runners.map((r) => keyOf(r.trainer))))], 90).catch(() => new Map());
  const legs: Leg[] = [];
  for (const c of cards) {
    const starters = c.runners.filter((r) => !r.scratched && r.winOdds);
    if (starters.length < 5) continue;
    const ch = marketChances(c.runners);
    const fav = [...starters].sort((a, b) => (a.winOdds ?? 99) - (b.winOdds ?? 99))[0];
    const m = ch.get(fav.number);
    if (!fav || !m?.win) continue;
    const j = jockeys.get(keyOf(fav.jockey));
    const t = trainers.get(keyOf(fav.trainer));
    // Small nudge (max ±10% relative) when the jockey/trainer is running well above or below 15%
    const form = [j, t].filter((x) => x && x.starts >= 15).map((x) => Math.max(-0.1, Math.min(0.1, (x!.winPct - 0.15) * 0.5)));
    const nudge = 1 + form.reduce((a, b) => a + b, 0) / Math.max(1, form.length);
    const game = `${c.meetingName} R${c.number}`;
    const comp = `${c.category === "H" ? "Harness" : "Thoroughbred"} · ${c.meetingName}`;
    const people = [j && j.starts >= 10 ? `${fav.jockey} ${Math.round(j.winPct * 100)}% (90d)` : fav.jockey, t && t.starts >= 10 ? `${fav.trainer} ${Math.round(t.winPct * 100)}%` : fav.trainer].filter(Boolean).join(" / ");
    const why = `Favourite at $${fav.winOdds?.toFixed(2)}${fav.placeOdds ? ` / $${fav.placeOdds.toFixed(2)} place` : ""}; ${people}`;
    const base = { code: "racing" as Code, comp, slipLeague: "racing", gameId: c.id, game, date: c.start, href: `/racing/race/${c.id}`, confidence: "medium" as const };
    legs.push({ ...base, id: `${c.id}:win:${fav.number}`, market: "Result", pick: `${fav.number}. ${fav.name} to win`, p: Math.min(0.9, m.win * nudge), why });
    if (m.place) legs.push({ ...base, id: `${c.id}:place:${fav.number}`, market: "Result", pick: `${fav.number}. ${fav.name} to place`, p: Math.min(0.95, m.place * nudge), why });
  }
  return { legs, games: cards.length };
}

// ------------------------------------------------------------------ building the three options

const confW = { high: 1, medium: 0.97, low: 0.9 } as const;

function pickOne(cands: Leg[], score: (l: Leg) => number, avoid: Set<string>): Leg | null {
  const fresh = cands.filter((l) => !avoid.has(l.gameId));
  const pool = fresh.length ? fresh : cands;
  let best: Leg | null = null;
  let bs = -Infinity;
  for (const l of pool) {
    const s = score(l);
    if (s > bs) (bs = s), (best = l);
  }
  return bs > -Infinity ? best : null;
}

function buildOption(n: 1 | 2 | 3, byCode: Map<Code, Leg[]>, avoid: Set<string>): UltimateOption | null {
  const spec = {
    1: { name: "Banker", blurb: "The strongest pick in each sport. Highest chance of landing, shortest price.", lo: 0.5, hi: 1, score: (l: Leg) => l.p * confW[l.confidence] },
    2: { name: "Balanced", blurb: "Solid favourites and lines from different games. A better price without going wild.", lo: 0.58, hi: 0.8, score: (l: Leg) => l.p * confW[l.confidence] - (l.market === "Result" ? 0 : -0.02) },
    3: { name: "Big Price", blurb: "Lines, totals and closer calls where our numbers still lean one way. Longer odds, more risk.", lo: 0.5, hi: 0.66, score: (l: Leg) => l.p * confW[l.confidence] + (l.edge ?? 0) * 0.5 + (l.market === "Result" ? -0.03 : 0.02) },
  }[n];
  const legs: Leg[] = [];
  for (const [, cands] of byCode) {
    const inBand = cands.filter((l) => l.p >= spec.lo && l.p <= spec.hi);
    const chosen = pickOne(inBand.length ? inBand : cands.filter((l) => l.p >= 0.5), spec.score, avoid);
    if (chosen) legs.push(chosen);
  }
  // Only one sport has games? Take the best three games from it instead.
  if (legs.length === 1) {
    const only = [...byCode.values()][0];
    const used = new Set([legs[0].gameId, ...avoid]);
    for (let i = 0; i < 2; i++) {
      const more = pickOne(only.filter((l) => !used.has(l.gameId) && l.p >= spec.lo && l.p <= spec.hi), spec.score, new Set());
      if (more) (legs.push(more), used.add(more.gameId));
    }
  }
  if (!legs.length) return null;
  legs.sort((a, b) => (a.date < b.date ? -1 : 1));
  const p = legs.reduce((s, l) => s * l.p, 1);
  return { n, name: spec.name, blurb: spec.blurb, legs, p, fair: 1 / p };
}

/**
 * The Grim Reaper: throw away every game the three options used, then rebuild one multi from
 * what's left — the best remaining pick in each sport (still 50%+ by our numbers).
 */
function buildReaper(byCode: Map<Code, Leg[]>, used: Set<string>): UltimateOption | null {
  const score = (l: Leg) => l.p * confW[l.confidence] + (l.edge ?? 0) * 0.3;
  const left = new Map<Code, Leg[]>();
  for (const [code, cands] of byCode) {
    const rest = cands.filter((l) => !used.has(l.gameId) && l.p >= 0.5);
    if (rest.length) left.set(code, rest);
  }
  const legs: Leg[] = [];
  for (const [, cands] of left) {
    const best = [...cands].sort((a, b) => score(b) - score(a))[0];
    if (best) legs.push(best);
  }
  if (legs.length === 1) {
    const only = [...left.values()][0];
    const taken = new Set([legs[0].gameId]);
    for (const l of [...only].sort((a, b) => score(b) - score(a))) {
      if (legs.length >= 3) break;
      if (!taken.has(l.gameId)) (legs.push(l), taken.add(l.gameId));
    }
  }
  if (!legs.length) return null;
  legs.sort((a, b) => (a.date < b.date ? -1 : 1));
  const p = legs.reduce((x, l) => x * l.p, 1);
  return { n: 0, name: "The Grim Reaper", blurb: "The Flipper threw out every game used in Options 1–3 and recalculated from what was left: the best remaining pick in each sport.", legs, p, fair: 1 / p };
}

// The 48-hour pool of rated legs is cached; each request picks from its own time window.
let pool: { at: number; v: Promise<Leg[]> } | null = null;

function getPool(): Promise<Leg[]> {
  if (pool && Date.now() - pool.at < 10 * 60_000) return pool.v;
  const v = buildPool();
  pool = { at: Date.now(), v };
  v.catch(() => (pool = null));
  return v;
}

async function buildPool(): Promise<Leg[]> {
  const until = Date.now() + HOURS * 3600_000;
  const safe = <T,>(p: Promise<T>, fb: T) => p.catch(() => fb);
  const empty = { legs: [] as Leg[], games: 0 };
  const parts = await Promise.all([
    safe(basketball("nba", until), empty),
    safe(basketball("nbl", until), empty),
    ...COMPS.map((c) => safe(fieldComp(c, until), empty)),
    safe(cricket(until), empty),
    safe(racing(until), empty),
  ]);
  return parts.flatMap((x) => x.legs).filter((l) => Number.isFinite(l.p) && l.p > 0 && l.p < 1);
}

/** Three options from games starting within the next `hours` (0.25–48). */
export async function getUltimate(hours = HOURS): Promise<UltimateResult> {
  const h = Math.min(HOURS, Math.max(0.25, hours || HOURS));
  const now = Date.now();
  const until = now + h * 3600_000;
  const all = (await getPool()).filter((l) => {
    const t = Date.parse(l.date);
    return t > now + 60_000 && t <= until;
  });
  const byCode = new Map<Code, Leg[]>();
  for (const l of all) byCode.set(l.code, [...(byCode.get(l.code) ?? []), l]);
  const scanned = [...byCode.entries()].map(([code, legs]) => ({ code, games: new Set(legs.map((l) => l.gameId)).size }));
  const options: UltimateOption[] = [];
  const avoid = new Set<string>();
  for (const n of [1, 2, 3] as const) {
    const o = buildOption(n, byCode, avoid);
    if (o) {
      options.push(o);
      o.legs.forEach((l) => avoid.add(l.gameId));
    }
  }
  return { generatedAt: new Date().toISOString(), windowEnd: new Date(until).toISOString(), scanned, options, reaper: buildReaper(byCode, avoid) };
}
