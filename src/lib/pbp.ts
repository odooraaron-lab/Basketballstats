// Play-by-play analytics. Pure functions over normalised plays + box score.
// Uses the league RuleSet for every clock/period calculation.
import type { League, RuleSet, ShotZone } from "../leagues/types.ts";
import { SHOT_ZONES } from "../leagues/types.ts";
import type { BoxTeam, Play } from "./model.ts";
import { elapsedSeconds, isClutch, periodSeconds } from "./rules.ts";
import { emptyBox, type BoxLine } from "./stats.ts";

// Court geometry in ESPN coordinates (feet): x = 0..50 across, hoop at (25, 0),
// y increases toward half court, baseline at y = -5.25.
export const HOOP = { x: 25, y: 0 };
export const BASELINE_Y = -5.25;

export interface Shot {
  playId: string;
  teamId: string | null;
  playerId: string | null;
  assistId: string | null;
  period: number;
  clock: string;
  made: boolean;
  value: 2 | 3;
  x: number | null;
  y: number | null;
  dist: number | null;
  zone: ShotZone;
  shotType: string;
  category: string;
  blocked: boolean;
  text: string;
}

const isFreeThrow = (p: Play) => /free throw/i.test(p.type) || /free throw/i.test(p.text);
const isSub = (p: Play) => /substitution/i.test(p.type) || /enters the game/i.test(p.text);
const isRebound = (p: Play) => /rebound/i.test(p.type);
const isTurnover = (p: Play) => /turnover|traveling/i.test(p.type) || /\bturnover\b|traveling/i.test(p.text);
const isFoul = (p: Play) => /foul/i.test(p.type) && !/technical/i.test(p.type) && !/turnover/i.test(p.type);
const isFieldGoalAttempt = (p: Play) => p.shooting && !isFreeThrow(p);
const isEndPeriod = (p: Play) => /end of (\d|the)|end period|end game/i.test(p.type + " " + p.text);

function shotValue(p: Play): 2 | 3 {
  if (p.pointsAttempted === 3) return 3;
  if (p.pointsAttempted === 2) return 2;
  if (/three point|3-pt|three-point/i.test(p.text) || /three point/i.test(p.type)) return 3;
  return 2;
}

function textDistance(text: string): number | null {
  const m = text.match(/(\d+)-foot/);
  return m ? Number(m[1]) : null;
}

export function classifyZone(value: 2 | 3, x: number | null, y: number | null, dist: number | null): ShotZone {
  if (value === 3) {
    if (x != null && y != null && y <= 14 + BASELINE_Y && Math.abs(x - HOOP.x) >= 21) return "Corner 3";
    return "Above the Break 3";
  }
  const d = dist ?? (x != null && y != null ? Math.hypot(x - HOOP.x, y - HOOP.y) : null);
  if (d != null && d <= 4) return "Restricted Area";
  if (x != null && y != null) {
    if (Math.abs(x - HOOP.x) <= 8 && y <= 19 + BASELINE_Y) return "Paint (Non-RA)";
    return "Mid-Range";
  }
  if (d != null && d <= 12) return "Paint (Non-RA)";
  return "Mid-Range";
}

/** Rough play-type proxy from ESPN's shot description. */
export function shotCategory(type: string, assisted: boolean): string {
  const t = type.toLowerCase();
  if (/dunk|alley/.test(t)) return "Dunk / Lob";
  if (/tip|putback|put back/.test(t)) return "Putback";
  if (/hook|turnaround|fadeaway|post/.test(t)) return "Post / Turnaround";
  if (/driving|running|layup|finger roll|floating/.test(t)) return "Drive / Rim attack";
  if (/cutting/.test(t)) return "Cut";
  if (/pullup|pull-up|step back|stepback/.test(t)) return "Pull-up / Off dribble";
  if (/jump|three|shot/.test(t)) return assisted ? "Catch & shoot (est.)" : "Off the dribble (est.)";
  return "Other";
}

export interface Ctx {
  league: League;
  teamOf: Map<string, string>; // athleteId -> teamId
  nameOf: Map<string, string>;
  homeId: string;
  awayId: string;
}

export function buildCtx(league: League, box: BoxTeam[], homeId: string, awayId: string): Ctx {
  const teamOf = new Map<string, string>();
  const nameOf = new Map<string, string>();
  for (const t of box) {
    for (const p of t.players) {
      teamOf.set(p.player.id, t.team.id);
      nameOf.set(p.player.id, p.player.name);
    }
  }
  return { league, teamOf, nameOf, homeId, awayId };
}

/** Which participant is the primary actor (shooter / fouler / turnover) vs the secondary (assist/block/steal). */
function actors(p: Play, ctx: Ctx): { primary: string | null; secondary: string | null } {
  const [a, b] = p.athletes;
  if (!a) return { primary: null, secondary: null };
  if (!b) return { primary: a, secondary: null };
  // Blocks are written "Blocker blocks Shooter 's ..." — the name at the start is the blocker.
  if (/ blocks /i.test(p.text)) {
    const nameA = ctx.nameOf.get(a);
    const aFirst = nameA ? p.text.startsWith(nameA) : true;
    return aFirst ? { primary: b, secondary: a } : { primary: a, secondary: b };
  }
  return { primary: a, secondary: b };
}

function shootingTeam(p: Play, ctx: Ctx): string | null {
  const { primary } = actors(p, ctx);
  return (primary && ctx.teamOf.get(primary)) || p.teamId;
}

export function extractShots(plays: Play[], ctx: Ctx): Shot[] {
  const out: Shot[] = [];
  for (const p of plays) {
    if (!isFieldGoalAttempt(p)) continue;
    const { primary, secondary } = actors(p, ctx);
    const value = shotValue(p);
    const made = p.scoring && p.scoreValue > 0;
    const blocked = / blocks /i.test(p.text);
    const assisted = made && /assist/i.test(p.text) && Boolean(secondary);
    const dist = textDistance(p.text) ?? (p.x != null && p.y != null ? Math.round(Math.hypot(p.x - HOOP.x, p.y - HOOP.y)) : null);
    out.push({
      playId: p.id,
      teamId: shootingTeam(p, ctx),
      playerId: primary,
      assistId: assisted ? secondary : null,
      period: p.period,
      clock: p.clockDisplay,
      made,
      value,
      x: p.x,
      y: p.y,
      dist,
      zone: classifyZone(value, p.x, p.y, dist),
      shotType: p.type.replace(/\s*shot$/i, "").trim() || "Shot",
      category: shotCategory(p.type, assisted),
      blocked,
      text: p.text,
    });
  }
  return out;
}

export interface ZoneRow {
  zone: ShotZone;
  fgm: number;
  fga: number;
  pts: number;
  xPts: number;
}

export function zoneSummary(shots: Shot[], league: League): ZoneRow[] {
  return SHOT_ZONES.map((zone) => {
    const s = shots.filter((x) => x.zone === zone);
    const fgm = s.filter((x) => x.made).length;
    const pts = s.reduce((a, x) => a + (x.made ? x.value : 0), 0);
    const xPts = s.reduce((a, x) => a + league.zoneBaselines[zone] * x.value, 0);
    return { zone, fgm, fga: s.length, pts, xPts };
  });
}

export function shotQuality(shots: Shot[], league: League) {
  const fga = shots.length;
  if (!fga) return { fga: 0, pps: null, xpps: null, making: null };
  const pts = shots.reduce((a, s) => a + (s.made ? s.value : 0), 0);
  const xpts = shots.reduce((a, s) => a + league.zoneBaselines[s.zone] * s.value, 0);
  return { fga, pps: pts / fga, xpps: xpts / fga, making: (pts - xpts) / fga };
}

export function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Scoring flow: runs, lead tracker, lead changes
// ---------------------------------------------------------------------------

export interface ScoreEvent {
  idx: number;
  teamId: string;
  pts: number;
  period: number;
  clock: string;
  t: number; // elapsed seconds
  isHome: boolean;
  home: number;
  away: number;
}

export function scoringEvents(plays: Play[], ctx: Ctx): ScoreEvent[] {
  const rules = ctx.league.rules;
  const out: ScoreEvent[] = [];
  let lastH = 0;
  let lastA = 0;
  plays.forEach((p, idx) => {
    const dh = p.homeScore - lastH;
    const da = p.awayScore - lastA;
    if (dh <= 0 && da <= 0) return;
    const t = elapsedSeconds(rules, p.period, p.clock);
    if (dh > 0) out.push({ idx, teamId: ctx.homeId, pts: dh, period: p.period, clock: p.clockDisplay, t, isHome: true, home: p.homeScore, away: p.awayScore });
    if (da > 0) out.push({ idx, teamId: ctx.awayId, pts: da, period: p.period, clock: p.clockDisplay, t, isHome: false, home: p.homeScore, away: p.awayScore });
    lastH = p.homeScore;
    lastA = p.awayScore;
  });
  return out;
}

export interface Run {
  teamId: string;
  forPts: number;
  againstPts: number;
  start: { period: number; clock: string; home: number; away: number };
  end: { period: number; clock: string; home: number; away: number };
  unanswered: boolean;
}

/**
 * Scoring runs such as "12–0" or "14–2". A run starts and ends with a basket by the
 * running team; the opponent may score at most 25% of the run (max 5 pts).
 */
export function findRuns(events: ScoreEvent[], minMargin = 8): Run[] {
  type Cand = { i: number; j: number; team: string; a: number; b: number };
  const cands: Cand[] = [];
  for (let i = 0; i < events.length; i++) {
    const team = events[i].teamId;
    let a = 0;
    let b = 0;
    for (let j = i; j < events.length; j++) {
      if (events[j].teamId === team) a += events[j].pts;
      else b += events[j].pts;
      if (b > 5) break;
      if (events[j].teamId === team && a - b >= minMargin && b <= Math.max(2, a * 0.25)) {
        cands.push({ i, j, team, a, b });
      }
    }
  }
  // Biggest margin first, then longest; keep non-overlapping runs.
  cands.sort((x, y) => y.a - y.b - (x.a - x.b) || y.a - x.a);
  const used = new Array(events.length).fill(false);
  const runs: Run[] = [];
  for (const c of cands) {
    let clash = false;
    for (let k = c.i; k <= c.j; k++) if (used[k]) clash = true;
    if (clash) continue;
    for (let k = c.i; k <= c.j; k++) used[k] = true;
    const s = events[c.i];
    const e = events[c.j];
    const homeBefore = s.home - (s.isHome ? s.pts : 0);
    const awayBefore = s.away - (s.isHome ? 0 : s.pts);
    runs.push({
      teamId: c.team,
      forPts: c.a,
      againstPts: c.b,
      start: { period: s.period, clock: s.clock, home: homeBefore, away: awayBefore },
      end: { period: e.period, clock: e.clock, home: e.home, away: e.away },
      unanswered: c.b === 0,
    });
  }
  return runs.sort((x, y) => x.start.home + x.start.away - (y.start.home + y.start.away));
}

export interface Flow {
  points: { t: number; margin: number }[]; // margin = home - away
  leadChanges: number;
  ties: number;
  largestLead: Record<string, number>;
  secondsLeading: Record<string, number>;
  totalSeconds: number;
}

export function scoringFlow(events: ScoreEvent[], ctx: Ctx, finalPeriod: number): Flow {
  const rules = ctx.league.rules;
  let total = 0;
  for (let p = 1; p <= Math.max(finalPeriod, rules.periods); p++) total += periodSeconds(rules, p);
  const points = [{ t: 0, margin: 0 }];
  let leadChanges = 0;
  let ties = 0;
  const largest: Record<string, number> = { [ctx.homeId]: 0, [ctx.awayId]: 0 };
  const leading: Record<string, number> = { [ctx.homeId]: 0, [ctx.awayId]: 0 };
  let prevMargin = 0;
  let prevLeader = 0; // 1 home, -1 away, 0 tie
  let prevT = 0;
  for (const e of events) {
    const m = e.home - e.away;
    if (prevMargin > 0) leading[ctx.homeId] += e.t - prevT;
    else if (prevMargin < 0) leading[ctx.awayId] += e.t - prevT;
    const leader = Math.sign(m);
    if (leader !== 0 && prevLeader !== 0 && leader !== prevLeader) leadChanges++;
    if (leader === 0 && prevMargin !== 0) ties++;
    if (leader !== 0) prevLeader = leader;
    largest[ctx.homeId] = Math.max(largest[ctx.homeId], m);
    largest[ctx.awayId] = Math.max(largest[ctx.awayId], -m);
    points.push({ t: e.t, margin: m });
    prevMargin = m;
    prevT = e.t;
  }
  if (prevMargin > 0) leading[ctx.homeId] += total - prevT;
  else if (prevMargin < 0) leading[ctx.awayId] += total - prevT;
  points.push({ t: Math.max(total, prevT), margin: prevMargin });
  return { points, leadChanges, ties, largestLead: largest, secondsLeading: leading, totalSeconds: total };
}

// ---------------------------------------------------------------------------
// Box score from plays (used for clutch / filtered windows)
// ---------------------------------------------------------------------------

export function boxFromPlays(plays: Play[], ctx: Ctx): Map<string, BoxLine> {
  const m = new Map<string, BoxLine>();
  const get = (id: string | null) => {
    if (!id) return null;
    if (!m.has(id)) m.set(id, emptyBox());
    return m.get(id)!;
  };
  for (const p of plays) {
    const { primary, secondary } = actors(p, ctx);
    if (isFreeThrow(p)) {
      const b = get(primary);
      if (b) {
        b.fta++;
        if (p.scoring) {
          b.ftm++;
          b.pts += 1;
        }
      }
      continue;
    }
    if (isFieldGoalAttempt(p)) {
      const b = get(primary);
      const v = shotValue(p);
      if (b) {
        b.fga++;
        if (v === 3) b.tpa++;
        if (p.scoring) {
          b.fgm++;
          if (v === 3) b.tpm++;
          b.pts += p.scoreValue || v;
        }
      }
      if (/ blocks /i.test(p.text)) {
        const blk = get(secondary);
        if (blk) blk.blk++;
      } else if (p.scoring && /assist/i.test(p.text)) {
        const a = get(secondary);
        if (a) a.ast++;
      }
      continue;
    }
    if (isRebound(p)) {
      const b = get(primary);
      if (b) {
        b.reb++;
        if (/offensive/i.test(p.type)) b.oreb++;
        else b.dreb++;
      }
      continue;
    }
    if (isTurnover(p)) {
      const b = get(primary);
      if (b) b.tov++;
      if (/steal/i.test(p.text)) {
        const s = get(secondary);
        if (s) s.stl++;
      }
      continue;
    }
    if (isFoul(p)) {
      const b = get(primary);
      if (b) b.pf++;
    }
  }
  return m;
}

export interface ClutchSummary {
  plays: number;
  teamPts: Record<string, number>;
  players: { id: string; teamId: string; box: BoxLine }[];
}

export function clutchStats(
  plays: Play[],
  ctx: Ctx,
  window: RuleSet["clutch"] = ctx.league.rules.clutch,
): ClutchSummary {
  const rules = ctx.league.rules;
  const inWindow: Play[] = [];
  let prevH = 0;
  let prevA = 0;
  const teamPts: Record<string, number> = { [ctx.homeId]: 0, [ctx.awayId]: 0 };
  for (const p of plays) {
    // margin *before* this play decides whether it's a clutch moment
    if (isClutch(rules, p.period, p.clock, prevH - prevA, window)) {
      inWindow.push(p);
      teamPts[ctx.homeId] += Math.max(0, p.homeScore - prevH);
      teamPts[ctx.awayId] += Math.max(0, p.awayScore - prevA);
    }
    prevH = p.homeScore;
    prevA = p.awayScore;
  }
  const box = boxFromPlays(inWindow, ctx);
  return {
    plays: inWindow.length,
    teamPts,
    players: [...box.entries()]
      .map(([id, b]) => ({ id, teamId: ctx.teamOf.get(id) ?? "", box: b }))
      .filter((x) => x.teamId)
      .sort((a, b) => b.box.pts - a.box.pts),
  };
}

// ---------------------------------------------------------------------------
// Turnovers
// ---------------------------------------------------------------------------

export interface TurnoverRow {
  teamId: string;
  live: number;
  dead: number;
  byType: { type: string; n: number }[];
}

export function turnoverBreakdown(plays: Play[], ctx: Ctx): TurnoverRow[] {
  const rows: Record<string, { live: number; dead: number; types: Record<string, number> }> = {};
  for (const id of [ctx.awayId, ctx.homeId]) rows[id] = { live: 0, dead: 0, types: {} };
  for (const p of plays) {
    if (!isTurnover(p)) continue;
    const { primary } = actors(p, ctx);
    const team = (primary && ctx.teamOf.get(primary)) || p.teamId;
    if (!team || !rows[team]) continue;
    const live = /steal/i.test(p.text) || (/lost ball/i.test(p.type) && !/out of bounds/i.test(p.type));
    rows[team][live ? "live" : "dead"]++;
    const label = p.type.replace(/\s*turnover\s*/i, "").replace(/\s+/g, " ").trim() || "Turnover";
    rows[team].types[label] = (rows[team].types[label] ?? 0) + 1;
  }
  return Object.entries(rows).map(([teamId, r]) => ({
    teamId,
    live: r.live,
    dead: r.dead,
    byType: Object.entries(r.types)
      .map(([type, n]) => ({ type, n }))
      .sort((a, b) => b.n - a.n),
  }));
}

// ---------------------------------------------------------------------------
// Possessions
// ---------------------------------------------------------------------------

export interface Possession {
  n: number;
  teamId: string;
  period: number;
  startClock: string;
  endClock: string;
  points: number;
  result: string;
  playIdx: number[];
}

function lastFreeThrow(p: Play): boolean {
  const m = (p.type + " " + p.text).match(/(\d) of (\d)/);
  return m ? m[1] === m[2] : true;
}

export function possessionLog(plays: Play[], ctx: Ctx): Possession[] {
  const out: Possession[] = [];
  let cur: Possession | null = null;
  let pendingMake: { team: string; idx: number } | null = null;
  let lastShotTeam: string | null = null;
  let n = 0;
  let prevH = 0;
  let prevA = 0;

  const open = (team: string, p: Play) => {
    cur = { n: ++n, teamId: team, period: p.period, startClock: p.clockDisplay, endClock: p.clockDisplay, points: 0, result: "", playIdx: [] };
  };
  const close = (p: Play, result: string) => {
    if (!cur) return;
    cur.endClock = p.clockDisplay;
    cur.result = result;
    out.push(cur);
    cur = null;
  };
  const other = (t: string) => (t === ctx.homeId ? ctx.awayId : ctx.homeId);

  plays.forEach((p, idx) => {
    const dh = Math.max(0, p.homeScore - prevH);
    const da = Math.max(0, p.awayScore - prevA);
    prevH = p.homeScore;
    prevA = p.awayScore;

    const { primary } = actors(p, ctx);
    const team = (primary && ctx.teamOf.get(primary)) || p.teamId;

    // A made basket ends a possession unless an and-one free throw by the same team follows.
    if (pendingMake) {
      const sameTeamFt = isFreeThrow(p) && team === pendingMake.team;
      const neutral = isSub(p) || /timeout|foul/i.test(p.type);
      if (!sameTeamFt && !neutral) {
        const c = cur as Possession | null;
        if (c) close(plays[pendingMake.idx], "Made FG");
        pendingMake = null;
      } else if (sameTeamFt) {
        pendingMake = null;
      }
    }

    if (isEndPeriod(p)) {
      if (cur) close(p, "End of period");
      pendingMake = null;
      lastShotTeam = null;
      return;
    }
    if (!team || isSub(p)) {
      if (cur) (cur as Possession).playIdx.push(idx);
      return;
    }

    if (!cur && (isFieldGoalAttempt(p) || isFreeThrow(p) || isTurnover(p))) open(team, p);
    if (!cur && isRebound(p)) {
      open(team, p);
    }
    const c = cur as Possession | null;
    if (!c) return;
    c.playIdx.push(idx);
    c.points += c.teamId === ctx.homeId ? dh : da;

    if (isFieldGoalAttempt(p)) {
      lastShotTeam = team;
      if (team !== c.teamId) {
        // missed a possession boundary — repair
        close(p, "Change");
        open(team, p);
      }
      if (p.scoring) pendingMake = { team, idx };
    } else if (isFreeThrow(p)) {
      // Technical / flagrant free throws don't end a possession.
      if (/technical|flagrant/i.test(p.type + " " + p.text)) return;
      lastShotTeam = team;
      if (team !== c.teamId) {
        c.playIdx.pop();
        close(p, "Change");
        open(team, p);
        (cur as unknown as Possession).playIdx.push(idx);
        (cur as unknown as Possession).points += team === ctx.homeId ? dh : da;
      }
      if (p.scoring && lastFreeThrow(p)) close(p, "Free throws");
    } else if (isTurnover(p)) {
      if (team !== c.teamId) {
        // Feed missed a change of possession — give the turnover to the team that committed it.
        c.playIdx.pop();
        close(p, "Change");
        open(team, p);
        (cur as unknown as Possession).playIdx.push(idx);
      }
      close(p, "Turnover");
      open(other(team), p);
    } else if (isRebound(p)) {
      const defensive = /defensive/i.test(p.type) || (lastShotTeam != null && team !== lastShotTeam);
      if (defensive && team !== c.teamId) {
        close(p, "Missed shot");
        open(team, p);
        (cur as unknown as Possession).playIdx = [idx];
      }
    }
  });
  if (cur) out.push(cur);
  return out.filter((p) => p.playIdx.length > 0 || p.points > 0);
}

// ---------------------------------------------------------------------------
// Lineups (reconstructed from starters + substitutions)
// ---------------------------------------------------------------------------

export interface LineupRow {
  teamId: string;
  ids: string[];
  seconds: number;
  ptsFor: number;
  ptsAgainst: number;
  possFor: number;
  possAgainst: number;
}

function periodStarters(
  plays: Play[],
  ctx: Ctx,
  team: string,
  fallback: string[],
  size: number,
): string[] {
  const seen = new Set<string>();
  const starters: string[] = [];
  for (const p of plays) {
    if (isSub(p)) {
      const [inId, outId] = subPair(p, ctx);
      if (outId && ctx.teamOf.get(outId) === team && !seen.has(outId)) {
        starters.push(outId);
        seen.add(outId);
      }
      if (inId) seen.add(inId);
      continue;
    }
    if (/technical/i.test(p.type)) continue;
    for (const a of p.athletes) {
      if (ctx.teamOf.get(a) === team && !seen.has(a)) {
        starters.push(a);
        seen.add(a);
      }
    }
    if (starters.length >= size) break;
  }
  for (const f of fallback) {
    if (starters.length >= size) break;
    if (!seen.has(f)) starters.push(f);
  }
  return starters.slice(0, size);
}

function subPair(p: Play, ctx: Ctx): [string | null, string | null] {
  const [a, b] = p.athletes;
  if (!a) return [null, null];
  const nameA = ctx.nameOf.get(a);
  // "A enters the game for B"
  if (nameA && p.text.startsWith(nameA)) return [a, b ?? null];
  if (b) {
    const nameB = ctx.nameOf.get(b);
    if (nameB && p.text.startsWith(nameB)) return [b, a];
  }
  return [a, b ?? null];
}

export function lineupStats(plays: Play[], box: BoxTeam[], ctx: Ctx): LineupRow[] {
  const rules = ctx.league.rules;
  const size = rules.playersOnCourt;
  const teams = [ctx.awayId, ctx.homeId];
  const starters: Record<string, string[]> = {};
  for (const t of box) starters[t.team.id] = t.players.filter((p) => p.starter).map((p) => p.player.id);

  const poss = possessionLog(plays, ctx);
  const possEndByIdx = new Map<number, string>();
  for (const p of poss) {
    const last = p.playIdx[p.playIdx.length - 1];
    if (last != null) possEndByIdx.set(last, p.teamId);
  }

  const agg = new Map<string, LineupRow>();
  const periods = [...new Set(plays.map((p) => p.period))].sort((a, b) => a - b);
  const onCourt: Record<string, string[]> = {};

  type Stint = { start: number; h: number; a: number; possH: number; possA: number };
  const stint: Record<string, Stint> = {};

  const keyOf = (ids: string[]) => [...ids].sort().join("|");
  const closeStint = (team: string, t: number, h: number, a: number) => {
    const s = stint[team];
    const ids = onCourt[team];
    if (!s || !ids || ids.length !== size) return;
    const k = `${team}#${keyOf(ids)}`;
    const row = agg.get(k) ?? { teamId: team, ids: [...ids].sort(), seconds: 0, ptsFor: 0, ptsAgainst: 0, possFor: 0, possAgainst: 0 };
    const home = team === ctx.homeId;
    row.seconds += Math.max(0, t - s.start);
    row.ptsFor += home ? h - s.h : a - s.a;
    row.ptsAgainst += home ? a - s.a : h - s.h;
    row.possFor += home ? s.possH : s.possA;
    row.possAgainst += home ? s.possA : s.possH;
    agg.set(k, row);
  };
  const openStint = (team: string, t: number, h: number, a: number) => {
    stint[team] = { start: t, h, a, possH: 0, possA: 0 };
  };

  let h = 0;
  let a = 0;
  for (const period of periods) {
    const idxs = plays.map((p, i) => [p, i] as const).filter(([p]) => p.period === period);
    const pPlays = idxs.map(([p]) => p);
    const startT = elapsedSeconds(rules, period, periodSeconds(rules, period));
    for (const team of teams) {
      onCourt[team] =
        period === periods[0] && (starters[team]?.length ?? 0) >= size
          ? starters[team].slice(0, size)
          : periodStarters(pPlays, ctx, team, onCourt[team] ?? starters[team] ?? [], size);
      openStint(team, startT, h, a);
    }
    for (const [p, i] of idxs) {
      const t = elapsedSeconds(rules, p.period, p.clock);
      if (isSub(p)) {
        const [inId, outId] = subPair(p, ctx);
        const team = (inId && ctx.teamOf.get(inId)) || (outId && ctx.teamOf.get(outId)) || null;
        if (team && onCourt[team]) {
          closeStint(team, t, h, a);
          const next = onCourt[team].filter((x) => x !== outId);
          if (inId && !next.includes(inId)) next.push(inId);
          onCourt[team] = next.slice(0, size);
          openStint(team, t, h, a);
        }
      }
      h = p.homeScore;
      a = p.awayScore;
      const endTeam = possEndByIdx.get(i);
      if (endTeam) {
        for (const team of teams) {
          if (!stint[team]) continue;
          if (endTeam === ctx.homeId) stint[team].possH++;
          else stint[team].possA++;
        }
      }
    }
    const endT = elapsedSeconds(rules, period, 0);
    for (const team of teams) closeStint(team, endT, h, a);
  }
  return [...agg.values()].filter((r) => r.seconds > 0).sort((x, y) => y.seconds - x.seconds);
}
