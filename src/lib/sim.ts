// Monte Carlo game simulator used to estimate how likely combinations of player stats are.
// Pure and deterministic (seeded) so it runs the same on the server, in the browser and in tests.
//
// Correlation comes from shared random "shocks" applied to every stat's mean:
//   game shock  — pace / overall scoring environment (both teams, all players)
//   team shock  — one team running hot or cold
//   player shock — minutes / usage for that player (links his points, assists, blocks…)
// Each stat then gets its own noise: normal for points & rebounds, an overdispersed
// Poisson (gamma-Poisson) for assists, threes, steals and blocks.

export type StatKey = "pts" | "reb" | "ast" | "tpm" | "stl" | "blk";
export const SIM_STATS: StatKey[] = ["pts", "reb", "ast", "tpm", "stl", "blk"];

export interface StatModel {
  mean: number;
  sd: number; // used for normal stats; for counts it informs the dispersion
}

export interface SimPlayer {
  id: string;
  teamId: string;
  stats: Record<StatKey, StatModel>;
}

export interface SimTeam {
  id: string;
  abbr: string;
  mean: number; // projected points
}

export interface SimInput {
  teams: [SimTeam, SimTeam]; // [away, home]
  players: SimPlayer[];
}

export const SHOCK = { game: 0.05, team: 0.06, player: 0.12 } as const;
const TEAM_RESIDUAL_SD = 7.5;
const NORMAL_STATS = new Set<StatKey>(["pts", "reb"]);
const DISPERSION: Record<StatKey, number> = { pts: 0, reb: 0, ast: 6, tpm: 4, stl: 4, blk: 3 };

export interface SimResult {
  n: number;
  teamScores: [Int16Array, Int16Array];
  /** key `${playerId}:${stat}` (plus `:pra`) → simulated values */
  stats: Map<string, Int16Array>;
}

// ---------------------------------------------------------------------------- RNG

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalGen(rand: () => number) {
  let spare: number | null = null;
  return () => {
    if (spare != null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    v = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

/** Gamma(shape, 1) via Marsaglia–Tsang. */
function gamma(shape: number, rand: () => number, normal: () => number): number {
  if (shape < 1) return gamma(shape + 1, rand, normal) * Math.pow(rand(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function poisson(lambda: number, rand: () => number, normal: () => number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal()));
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}

// ---------------------------------------------------------------------------- simulate

export function simulate(input: SimInput, n = 10000, seed = 7): SimResult {
  const rand = mulberry32(seed);
  const normal = normalGen(rand);
  const teamScores: [Int16Array, Int16Array] = [new Int16Array(n), new Int16Array(n)];
  const stats = new Map<string, Int16Array>();
  for (const p of input.players) {
    for (const s of SIM_STATS) stats.set(`${p.id}:${s}`, new Int16Array(n));
    stats.set(`${p.id}:pra`, new Int16Array(n));
  }
  const teamIdx = new Map(input.teams.map((t, i) => [t.id, i]));
  const shockVar = SHOCK.game ** 2 + SHOCK.team ** 2 + SHOCK.player ** 2;

  for (let i = 0; i < n; i++) {
    const zg = SHOCK.game * normal();
    const zt = [SHOCK.team * normal(), SHOCK.team * normal()];
    input.teams.forEach((t, ti) => {
      const v = t.mean * (1 + zg + zt[ti]) + TEAM_RESIDUAL_SD * normal();
      teamScores[ti][i] = Math.max(60, Math.round(v));
    });
    for (const p of input.players) {
      const ti = teamIdx.get(p.teamId) ?? 0;
      const scale = Math.max(0.2, 1 + zg + zt[ti] + SHOCK.player * normal());
      let pra = 0;
      for (const s of SIM_STATS) {
        const m = p.stats[s];
        let v: number;
        if (!m || m.mean <= 0) v = 0;
        else if (NORMAL_STATS.has(s)) {
          const resid = Math.sqrt(Math.max(m.sd * m.sd - m.mean * m.mean * shockVar, (0.1 * m.mean) ** 2));
          v = Math.max(0, Math.round(m.mean * scale + resid * normal()));
        } else {
          const k = DISPERSION[s];
          const lam = m.mean * scale * (gamma(k, rand, normal) / k);
          v = poisson(lam, rand, normal);
        }
        stats.get(`${p.id}:${s}`)![i] = v;
        if (s === "pts" || s === "reb" || s === "ast") pra += v;
      }
      stats.get(`${p.id}:pra`)![i] = pra;
    }
  }
  return { n, teamScores, stats };
}

// ---------------------------------------------------------------------------- legs & combos

export type Bits = Uint32Array;

export function bitsWhere(n: number, test: (i: number) => boolean): Bits {
  const b = new Uint32Array(Math.ceil(n / 32));
  for (let i = 0; i < n; i++) if (test(i)) b[i >>> 5] |= 1 << (i & 31);
  return b;
}

export function popcount(b: Bits): number {
  let c = 0;
  for (let i = 0; i < b.length; i++) {
    let v = b[i];
    v = v - ((v >>> 1) & 0x55555555);
    v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
    c += (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }
  return c;
}

export function and(a: Bits, b: Bits): Bits {
  const out = new Uint32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] & b[i];
  return out;
}

export interface Leg {
  id: string;
  group: string; // legs sharing a group are mutually exclusive (same player+stat, same game market)
  bits: Bits;
  p: number;
}

export interface Combo {
  legs: Leg[];
  p: number; // joint probability from the simulation
  pIndependent: number; // product of single-leg probabilities
}

/**
 * Most likely combinations of `size` legs. Branch-and-bound: a partial combo can never
 * become more likely by adding legs, so prune once it can't beat the current top list.
 */
export function bestCombos(legs: Leg[], n: number, size: number, top = 10): Combo[] {
  const sorted = [...legs].sort((a, b) => b.p - a.p);
  const best: Combo[] = [];
  const floor = () => (best.length < top ? 0 : best[best.length - 1].p);
  const push = (c: Combo) => {
    best.push(c);
    best.sort((a, b) => b.p - a.p);
    if (best.length > top) best.pop();
  };
  const rec = (start: number, chosen: Leg[], bits: Bits | null, groups: Set<string>) => {
    if (chosen.length === size) {
      const p = popcount(bits!) / n;
      if (p > floor()) push({ legs: [...chosen], p, pIndependent: chosen.reduce((a, l) => a * l.p, 1) });
      return;
    }
    for (let i = start; i < sorted.length; i++) {
      const leg = sorted[i];
      if (groups.has(leg.group)) continue;
      const nb = bits ? and(bits, leg.bits) : leg.bits;
      const p = popcount(nb) / n;
      if (p <= floor()) continue;
      groups.add(leg.group);
      chosen.push(leg);
      rec(i + 1, chosen, nb, groups);
      chosen.pop();
      groups.delete(leg.group);
    }
  };
  rec(0, [], null, new Set());
  return best;
}

export function quantile(values: ArrayLike<number> | null | undefined, q: number): number {
  if (!values) return 0;
  const a = Array.from(values).sort((x, y) => x - y);
  if (!a.length) return 0;
  return a[Math.min(a.length - 1, Math.max(0, Math.round(q * (a.length - 1))))];
}

export const share = (values: ArrayLike<number> | null | undefined, test: (v: number) => boolean) => {
  if (!values) return 0;
  let c = 0;
  for (let i = 0; i < values.length; i++) if (test(values[i])) c++;
  return values.length ? c / values.length : 0;
};
