// Pure stat formulas. No I/O. Everything takes counting stats and returns derived metrics.

export interface BoxLine {
  min: number;
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  pm?: number;
}

export const emptyBox = (): BoxLine => ({
  min: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
  oreb: 0, dreb: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, pm: 0,
});

export function addBox(a: BoxLine, b: BoxLine): BoxLine {
  const out = emptyBox();
  (Object.keys(out) as (keyof BoxLine)[]).forEach((k) => {
    out[k] = (a[k] ?? 0) + (b[k] ?? 0);
  });
  return out;
}

const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export const fgPct = (b: BoxLine) => div(b.fgm, b.fga);
export const tpPct = (b: BoxLine) => div(b.tpm, b.tpa);
export const ftPct = (b: BoxLine) => div(b.ftm, b.fta);
export const twoM = (b: BoxLine) => b.fgm - b.tpm;
export const twoA = (b: BoxLine) => b.fga - b.tpa;
export const twoPct = (b: BoxLine) => div(twoM(b), twoA(b));

/** True shooting %: PTS / (2 * TSA) */
export const trueShooting = (b: BoxLine) => div(b.pts, 2 * (b.fga + 0.44 * b.fta));

/** Effective FG %: (FGM + 0.5 * 3PM) / FGA */
export const effectiveFg = (b: BoxLine) => div(b.fgm + 0.5 * b.tpm, b.fga);

export const astToRatio = (b: BoxLine) => (b.tov > 0 ? b.ast / b.tov : b.ast > 0 ? b.ast : null);

/** Free throw rate: FTA / FGA */
export const ftRate = (b: BoxLine) => div(b.fta, b.fga);

/** Three-point attempt rate: 3PA / FGA */
export const threeRate = (b: BoxLine) => div(b.tpa, b.fga);

/** Hollinger game score. */
export function gameScore(b: BoxLine): number {
  return (
    b.pts + 0.4 * b.fgm - 0.7 * b.fga - 0.4 * (b.fta - b.ftm) + 0.7 * b.oreb + 0.3 * b.dreb +
    b.stl + 0.7 * b.ast + 0.7 * b.blk - 0.4 * b.pf - b.tov
  );
}

/** Simple possession estimate for one team. */
export function possessionsSimple(t: BoxLine): number {
  return t.fga - t.oreb + t.tov + 0.44 * t.fta;
}

/** Basketball-Reference possession estimate using both teams. */
export function possessions(t: BoxLine, o?: BoxLine): number {
  if (!o) return possessionsSimple(t);
  const side = (a: BoxLine, b: BoxLine) => {
    const orbShare = a.oreb + b.dreb > 0 ? a.oreb / (a.oreb + b.dreb) : 0;
    return a.fga + 0.4 * a.fta - 1.07 * orbShare * (a.fga - a.fgm) + a.tov;
  };
  return 0.5 * (side(t, o) + side(o, t));
}

/** Pace = possessions per regulation-length game. */
export function pace(poss: number, teamMinutes: number, regulationTeamMinutes: number): number {
  return teamMinutes > 0 ? (poss * regulationTeamMinutes) / teamMinutes : 0;
}

export const offRating = (pts: number, poss: number) => div(100 * pts, poss);

/** Usage rate (%). teamMinutes is total team minutes e.g. 240. */
export function usage(p: BoxLine, team: BoxLine, teamMinutes: number): number | null {
  const denom = p.min * (team.fga + 0.44 * team.fta + team.tov);
  if (!(denom > 0)) return null;
  return (100 * (p.fga + 0.44 * p.fta + p.tov) * (teamMinutes / 5)) / denom;
}

function shareOfAvailable(stat: number, available: number, p: BoxLine, teamMinutes: number) {
  const denom = p.min * available;
  return denom > 0 ? (100 * stat * (teamMinutes / 5)) / denom : null;
}

export const rebPct = (p: BoxLine, t: BoxLine, o: BoxLine, tm: number) =>
  shareOfAvailable(p.reb, t.reb + o.reb, p, tm);
export const orebPct = (p: BoxLine, t: BoxLine, o: BoxLine, tm: number) =>
  shareOfAvailable(p.oreb, t.oreb + o.dreb, p, tm);
export const drebPct = (p: BoxLine, t: BoxLine, o: BoxLine, tm: number) =>
  shareOfAvailable(p.dreb, t.dreb + o.oreb, p, tm);
export const blkPct = (p: BoxLine, o: BoxLine, tm: number) =>
  shareOfAvailable(p.blk, o.fga - o.tpa, p, tm);
export const stlPct = (p: BoxLine, oppPoss: number, tm: number) =>
  shareOfAvailable(p.stl, oppPoss, p, tm);

/** Assist % — share of teammate field goals assisted while on floor. */
export function astPct(p: BoxLine, t: BoxLine, tm: number): number | null {
  if (!(p.min > 0) || tm <= 0) return null;
  const denom = (p.min / (tm / 5)) * t.fgm - p.fgm;
  return denom > 0 ? (100 * p.ast) / denom : null;
}

export interface FourFactors {
  efg: number | null;
  tovPct: number | null;
  orebPct: number | null;
  ftRate: number | null;
}

export function fourFactors(t: BoxLine, o: BoxLine): FourFactors {
  return {
    efg: effectiveFg(t),
    tovPct: div(t.tov, t.fga + 0.44 * t.fta + t.tov),
    orebPct: div(t.oreb, t.oreb + o.dreb),
    ftRate: div(t.ftm, t.fga),
  };
}

// ---------------------------------------------------------------------------
// PER (Hollinger), estimated from league team totals.
// ---------------------------------------------------------------------------

export interface LeagueContext {
  /** League totals (sum over all teams) */
  totals: BoxLine;
  /** League average pace */
  pace: number;
}

export interface TeamContext {
  totals: BoxLine;
  pace: number;
}

function uPER(p: BoxLine, team: BoxLine, lg: BoxLine): number | null {
  if (!(p.min > 0) || !(lg.fgm > 0) || !(lg.ftm > 0) || !(lg.pf > 0) || !(team.fgm > 0)) return null;
  const factor = 2 / 3 - (0.5 * (lg.ast / lg.fgm)) / (2 * (lg.fgm / lg.ftm));
  const vop = lg.pts / (lg.fga - lg.oreb + lg.tov + 0.44 * lg.fta);
  const drbp = (lg.reb - lg.oreb) / lg.reb;
  const tmAstFg = team.ast / team.fgm;
  return (
    (1 / p.min) *
    (p.tpm +
      (2 / 3) * p.ast +
      (2 - factor * tmAstFg) * p.fgm +
      p.ftm * 0.5 * (1 + (1 - tmAstFg) + (2 / 3) * tmAstFg) -
      vop * p.tov -
      vop * drbp * (p.fga - p.fgm) -
      vop * 0.44 * (0.44 + 0.56 * drbp) * (p.fta - p.ftm) +
      vop * (1 - drbp) * (p.reb - p.oreb) +
      vop * drbp * p.oreb +
      vop * p.stl +
      vop * drbp * p.blk -
      p.pf * (lg.ftm / lg.pf - 0.44 * (lg.fta / lg.pf) * vop))
  );
}

/**
 * Estimated PER. Uses the league totals as a "league average player" to normalise
 * to 15, which is the standard approximation when individual league-wide minutes
 * aren't available.
 */
export function per(p: BoxLine, team: TeamContext, league: LeagueContext): number | null {
  const u = uPER(p, team.totals, league.totals);
  const lgU = uPER(league.totals, league.totals, league.totals);
  if (u == null || lgU == null || lgU === 0 || !(team.pace > 0)) return null;
  const aPER = (league.pace / team.pace) * u;
  return aPER * (15 / lgU);
}

/** Scale a box line to per-N-minutes. */
export function perMinutes(b: BoxLine, n: number): BoxLine {
  if (!(b.min > 0)) return emptyBox();
  const f = n / b.min;
  const out = emptyBox();
  (Object.keys(out) as (keyof BoxLine)[]).forEach((k) => {
    out[k] = (b[k] ?? 0) * f;
  });
  out.min = n;
  return out;
}

/** Parse "8-15" style made-attempted strings. */
export function parseMadeAtt(s: string | number | undefined | null): [number, number] {
  if (s == null) return [0, 0];
  const str = String(s);
  const m = str.match(/^\s*([\d.]+)\s*-\s*([\d.]+)\s*$/);
  if (!m) return [0, 0];
  return [Number(m[1]), Number(m[2])];
}

export function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
