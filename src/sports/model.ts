// Pure field-sport maths: normalised types, ladder, season aggregates, team ratings and
// match projections. No fetching here, so it's unit-tested directly.
import type { CompDef, PointsRule } from "./comps.ts";

export interface Side {
  id: string;
  name: string;
  abbr: string;
  logo: string;
  color: string;
  score: number | null;
}

export interface Fixture {
  id: string;
  comp: string;
  season: number;
  round: number | null;
  roundLabel: string;
  date: string; // ISO UTC
  state: "pre" | "in" | "post";
  status: string;
  venue: string;
  home: Side;
  away: Side;
  winnerId: string | null; // null = draw or not finished
  final: boolean; // finals series
  /** Source-specific ids needed to fetch the match file. */
  ref: string;
}

export interface PlayerLine {
  id: string;
  name: string;
  teamId: string;
  number?: string;
  position?: string;
  starter?: boolean;
  headshot?: string;
  stats: Record<string, number>;
}

export interface MatchEvent {
  clock: string;
  period?: number;
  teamId: string;
  kind: string; // "try", "goal", "conversion", "penalty goal", "field goal", "yellow card", "sub", …
  text: string;
  scoring: boolean;
  homeScore?: number;
  awayScore?: number;
}

export interface TeamStatRow {
  key: string;
  label: string;
  home: number | null;
  away: number | null;
  homeText?: string;
  awayText?: string;
  lowerBetter?: boolean;
}

export interface MatchFile {
  fixture: Fixture;
  teamStats: TeamStatRow[];
  players: PlayerLine[];
  events: MatchEvent[];
  periods: { home: number | null; away: number | null }[];
  officials: string[];
  notes: string[];
}

// ---------------------------------------------------------------------------- ladder

export interface LadderRow {
  teamId: string;
  team: Side;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  byes: number;
  pf: number;
  pa: number;
  diff: number;
  bonus: number;
  points: number;
  form: ("W" | "D" | "L")[]; // most recent last
  homeRec: string;
  awayRec: string;
  pos: number;
  note?: string;
}

const isRegular = (f: Fixture) => !f.final;

/** Ladder from results. Byes count only in rounds where everyone else has finished. */
export function buildLadder(fixtures: Fixture[], rule: PointsRule, extraBonus?: (f: Fixture, teamId: string) => number): LadderRow[] {
  const rows = new Map<string, LadderRow & { hw: number; hl: number; hd: number; aw: number; al: number; ad: number }>();
  const row = (side: Side) => {
    let r = rows.get(side.id);
    if (!r) {
      r = { teamId: side.id, team: side, played: 0, won: 0, drawn: 0, lost: 0, byes: 0, pf: 0, pa: 0, diff: 0, bonus: 0, points: 0, form: [], homeRec: "", awayRec: "", pos: 0, hw: 0, hl: 0, hd: 0, aw: 0, al: 0, ad: 0 };
      rows.set(side.id, r);
    }
    return r;
  };
  const regular = fixtures.filter(isRegular);
  regular.forEach((f) => (row(f.home), row(f.away)));
  const done = regular.filter((f) => f.state === "post" && f.home.score != null && f.away.score != null).sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const f of done) {
    const h = row(f.home);
    const a = row(f.away);
    const hs = f.home.score!;
    const as = f.away.score!;
    const res: "W" | "D" | "L" = f.winnerId === f.home.id || (f.winnerId == null && hs > as) ? "W" : f.winnerId === f.away.id || (f.winnerId == null && as > hs) ? "L" : "D";
    for (const [r, us, them, out, home] of [
      [h, hs, as, res, true],
      [a, as, hs, res === "W" ? "L" : res === "L" ? "W" : "D", false],
    ] as const) {
      r.played++;
      r.pf += us;
      r.pa += them;
      r.form.push(out);
      if (out === "W") (r.won++, (r.points += rule.win), home ? r.hw++ : r.aw++);
      else if (out === "D") (r.drawn++, (r.points += rule.draw), home ? r.hd++ : r.ad++);
      else {
        r.lost++;
        r.points += rule.loss;
        home ? r.hl++ : r.al++;
        if (rule.lossBonusMargin != null && them - us <= rule.lossBonusMargin) (r.bonus++, r.points++);
      }
      const extra = extraBonus?.(f, r.teamId) ?? 0;
      if (extra) ((r.bonus += extra), (r.points += extra));
    }
  }
  if (rule.bye) {
    const rounds = new Map<number, Fixture[]>();
    for (const f of regular) if (f.round != null) rounds.set(f.round, [...(rounds.get(f.round) ?? []), f]);
    const allTeams = [...rows.keys()];
    for (const [, fs] of rounds) {
      if (!fs.every((f) => f.state === "post")) continue;
      const playing = new Set(fs.flatMap((f) => [f.home.id, f.away.id]));
      for (const t of allTeams) if (!playing.has(t)) {
        const r = rows.get(t)!;
        r.byes++;
        r.points += rule.bye;
      }
    }
  }
  const out = [...rows.values()].map(({ hw, hl, hd, aw, al, ad, ...r }) => ({
    ...r,
    diff: r.pf - r.pa,
    form: r.form.slice(-5),
    homeRec: `${hw}-${hd ? `${hd}-` : ""}${hl}`,
    awayRec: `${aw}-${ad ? `${ad}-` : ""}${al}`,
  }));
  out.sort((x, y) => y.points - x.points || y.diff - x.diff || y.pf - x.pf || x.team.name.localeCompare(y.team.name));
  out.forEach((r, i) => (r.pos = i + 1));
  return out;
}

// ---------------------------------------------------------------------------- season aggregates

export interface PlayerSeason {
  id: string;
  name: string;
  teamId: string;
  position?: string;
  headshot?: string;
  games: number;
  totals: Record<string, number>;
  logs: { fixtureId: string; date: string; oppId: string; home: boolean; result: "W" | "D" | "L" | ""; stats: Record<string, number> }[];
}

export interface TeamSeason {
  teamId: string;
  games: number;
  totals: Record<string, number>;
  against: Record<string, number>;
}

export function aggregate(files: MatchFile[]): { players: PlayerSeason[]; teams: TeamSeason[] } {
  const players = new Map<string, PlayerSeason>();
  const teams = new Map<string, TeamSeason>();
  const sorted = [...files].sort((a, b) => (a.fixture.date < b.fixture.date ? -1 : 1));
  for (const m of sorted) {
    const f = m.fixture;
    const resOf = (teamId: string): "W" | "D" | "L" | "" =>
      f.state !== "post" ? "" : f.winnerId ? (f.winnerId === teamId ? "W" : "L") : f.home.score === f.away.score ? "D" : (teamId === f.home.id) === (f.home.score! > f.away.score!) ? "W" : "L";
    for (const p of m.players) {
      if (!p.id) continue;
      const played = Object.values(p.stats).some((v) => v > 0) || p.starter;
      if (!played) continue;
      let r = players.get(p.id);
      if (!r) players.set(p.id, (r = { id: p.id, name: p.name, teamId: p.teamId, position: p.position, headshot: p.headshot, games: 0, totals: {}, logs: [] }));
      r.games++;
      r.teamId = p.teamId; // latest team
      if (p.position) r.position = p.position;
      for (const [k, v] of Object.entries(p.stats)) if (Number.isFinite(v)) r.totals[k] = (r.totals[k] ?? 0) + v;
      const home = p.teamId === f.home.id;
      r.logs.push({ fixtureId: f.id, date: f.date, oppId: home ? f.away.id : f.home.id, home, result: resOf(p.teamId), stats: p.stats });
    }
    const sides = [f.home.id, f.away.id];
    for (const [i, id] of sides.entries()) {
      let t = teams.get(id);
      if (!t) teams.set(id, (t = { teamId: id, games: 0, totals: {}, against: {} }));
      t.games++;
      for (const row of m.teamStats) {
        const us = i === 0 ? row.home : row.away;
        const them = i === 0 ? row.away : row.home;
        if (us != null) t.totals[row.key] = (t.totals[row.key] ?? 0) + us;
        if (them != null) t.against[row.key] = (t.against[row.key] ?? 0) + them;
      }
    }
  }
  return { players: [...players.values()], teams: [...teams.values()] };
}

/** Team stat rows summed from player lines, for feeds without team totals. */
export function teamStatsFromPlayers(players: PlayerLine[], homeId: string, awayId: string, labels: (k: string) => string): TeamStatRow[] {
  const sum = (id: string) => {
    const t: Record<string, number> = {};
    for (const p of players) if (p.teamId === id) for (const [k, v] of Object.entries(p.stats)) t[k] = (t[k] ?? 0) + v;
    return t;
  };
  const h = sum(homeId);
  const a = sum(awayId);
  const keys = [...new Set([...Object.keys(h), ...Object.keys(a)])];
  return keys.filter((k) => !/^minutes|^netPoints$|^fantasy|supercoach/i.test(k)).map((k) => ({ key: k, label: labels(k), home: h[k] ?? 0, away: a[k] ?? 0 }));
}

// ---------------------------------------------------------------------------- ratings & projections

export interface Ratings {
  base: number; // average score per team per game
  homeAdv: number; // points added to the home margin
  att: Map<string, number>;
  def: Map<string, number>; // + = concedes more
  games: Map<string, number>;
  n: number;
}

/**
 * Additive attack/defence model fitted to completed results:
 *   home score = base + homeAdv/2 + att[home] + def[away]
 *   away score = base - homeAdv/2 + att[away] + def[home]
 * Shrunk toward zero with `prior` phantom average games so early-season ratings stay sane.
 */
export function fitRatings(fixtures: Fixture[], prior = 4): Ratings {
  const done = fixtures.filter((f) => f.state === "post" && f.home.score != null && f.away.score != null);
  const att = new Map<string, number>();
  const def = new Map<string, number>();
  const games = new Map<string, number>();
  for (const f of fixtures) for (const id of [f.home.id, f.away.id]) (att.set(id, 0), def.set(id, 0), games.set(id, 0));
  if (!done.length) return { base: 0, homeAdv: 0, att, def, games, n: 0 };
  for (const f of done) for (const id of [f.home.id, f.away.id]) games.set(id, (games.get(id) ?? 0) + 1);
  const base = done.reduce((s, f) => s + f.home.score! + f.away.score!, 0) / (2 * done.length);
  let homeAdv = done.reduce((s, f) => s + f.home.score! - f.away.score!, 0) / done.length;
  homeAdv = (homeAdv * done.length) / (done.length + 20); // heavy shrink: home edge is noisy
  for (let iter = 0; iter < 30; iter++) {
    const aSum = new Map<string, number>();
    const dSum = new Map<string, number>();
    for (const f of done) {
      const h = f.home.id;
      const a = f.away.id;
      aSum.set(h, (aSum.get(h) ?? 0) + (f.home.score! - base - homeAdv / 2 - def.get(a)!));
      aSum.set(a, (aSum.get(a) ?? 0) + (f.away.score! - base + homeAdv / 2 - def.get(h)!));
      dSum.set(a, (dSum.get(a) ?? 0) + (f.home.score! - base - homeAdv / 2 - att.get(h)!));
      dSum.set(h, (dSum.get(h) ?? 0) + (f.away.score! - base + homeAdv / 2 - att.get(a)!));
    }
    for (const id of att.keys()) {
      const g = games.get(id) ?? 0;
      att.set(id, (aSum.get(id) ?? 0) / (g + prior));
      def.set(id, (dSum.get(id) ?? 0) / (g + prior));
    }
  }
  return { base, homeAdv, att, def, games, n: done.length };
}

export interface Projection {
  home: number;
  away: number;
  margin: number; // home - away
  total: number;
  pHome: number;
  pAway: number;
  pDraw: number;
  confidence: "low" | "medium" | "high";
}

const erf = (x: number) => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
};
export const normCdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));

const poisson = (k: number, l: number) => {
  let p = Math.exp(-l);
  for (let i = 1; i <= k; i++) p *= l / i;
  return p;
};

/** Score grid for low-scoring sports (soccer): P[h][a]. */
export function scoreGrid(lh: number, la: number, max = 10): number[][] {
  return Array.from({ length: max + 1 }, (_, h) => Array.from({ length: max + 1 }, (_, a) => poisson(h, lh) * poisson(a, la)));
}

export function project(r: Ratings, comp: Pick<CompDef, "sport" | "marginSd">, homeId: string, awayId: string, neutral = false): Projection | null {
  if (!r.n) return null;
  const ha = neutral ? 0 : r.homeAdv;
  let home = r.base + ha / 2 + (r.att.get(homeId) ?? 0) + (r.def.get(awayId) ?? 0);
  let away = r.base - ha / 2 + (r.att.get(awayId) ?? 0) + (r.def.get(homeId) ?? 0);
  const floor = comp.sport === "soccer" ? 0.15 : 1;
  home = Math.max(floor, home);
  away = Math.max(floor, away);
  const gp = Math.min(r.games.get(homeId) ?? 0, r.games.get(awayId) ?? 0);
  const confidence = gp >= 8 ? "high" : gp >= 4 ? "medium" : "low";
  if (comp.sport === "soccer") {
    const g = scoreGrid(home, away);
    let pH = 0, pD = 0, pA = 0;
    g.forEach((row, h) => row.forEach((p, a) => (h > a ? (pH += p) : h === a ? (pD += p) : (pA += p))));
    const tot = pH + pD + pA;
    return { home, away, margin: home - away, total: home + away, pHome: pH / tot, pDraw: pD / tot, pAway: pA / tot, confidence };
  }
  const margin = home - away;
  // Netball has no draws (extra time); for the footy codes a draw is ~1–2%.
  const drawBand = comp.sport === "netball" ? 0 : 0.5;
  const pHome = 1 - normCdf((drawBand - margin) / comp.marginSd);
  const pAway = normCdf((-drawBand - margin) / comp.marginSd);
  return { home, away, margin, total: home + away, pHome, pAway, pDraw: Math.max(0, 1 - pHome - pAway), confidence };
}

/** P(home margin >= m) for the points sports. */
export const pMarginAtLeast = (p: Projection, sd: number, m: number) => 1 - normCdf((m - 0.5 - p.margin) / sd);
/** P(total >= t) — total s.d. scales with the margin s.d. for these sports. */
export const pTotalOver = (p: Projection, sd: number, line: number) => 1 - normCdf((line - p.total) / (sd * 1.05));

/** Soccer extras from the score grid. */
export function soccerMarkets(p: Projection) {
  const g = scoreGrid(p.home, p.away);
  let over25 = 0, btts = 0;
  const cs: { h: number; a: number; p: number }[] = [];
  g.forEach((row, h) => row.forEach((v, a) => {
    if (h + a >= 3) over25 += v;
    if (h > 0 && a > 0) btts += v;
    cs.push({ h, a, p: v });
  }));
  cs.sort((x, y) => y.p - x.p);
  return { over25, btts, likely: cs.slice(0, 5) };
}

/**
 * Chance a player scores at least once (try / goal), from his season rate shrunk toward a
 * small prior and scaled by how many points his team is projected to score vs its average.
 */
export function anytimeScorer(scored: number, games: number, priorRate: number, teamScale: number): number {
  const rate = ((scored + priorRate * 3) / (games + 3)) * teamScale;
  return 1 - Math.exp(-Math.max(0, rate));
}

/** Recent-form summary for a team from results (most recent first). */
export function teamForm(fixtures: Fixture[], teamId: string, n = 5) {
  return fixtures
    .filter((f) => f.state === "post" && (f.home.id === teamId || f.away.id === teamId) && f.home.score != null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, n)
    .map((f) => {
      const home = f.home.id === teamId;
      const us = home ? f.home : f.away;
      const them = home ? f.away : f.home;
      const result: "W" | "D" | "L" = f.winnerId ? (f.winnerId === teamId ? "W" : "L") : us.score! > them.score! ? "W" : us.score! < them.score! ? "L" : "D";
      return { f, home, us, them, result };
    });
}

/** Group fixtures without round numbers into rounds by date clusters (a round spans ≤ 5 days). */
export function assignRounds(fx: Fixture[]): Fixture[] {
  const regular = fx.filter((f) => !f.final).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (regular.every((f) => f.round != null)) return fx;
  let round = 0;
  let start = -Infinity;
  const seenTeams = new Set<string>();
  for (const f of regular) {
    const t = Date.parse(f.date);
    const clash = seenTeams.has(f.home.id) || seenTeams.has(f.away.id);
    if (t - start > 5 * 86400_000 || clash) {
      round++;
      start = t;
      seenTeams.clear();
    }
    seenTeams.add(f.home.id);
    seenTeams.add(f.away.id);
    f.round = round;
    f.roundLabel = `Round ${round}`;
  }
  return fx;
}

