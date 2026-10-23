// Pure scoring logic for the stat scan (no I/O, unit-tested in tests/scan.test.ts).
import type { BoxLine } from "./stats.ts";

export type ScanCatKey = "pts" | "reb" | "ast" | "tpm" | "stl" | "blk" | "pra";

export interface ScanCat {
  key: ScanCatKey;
  label: string;
  short: string;
  /** Round-number thresholds used for "hit 25+ in 8 of last 10". */
  ladder: number[];
  /** Below this average a category isn't interesting for this player. */
  floor: number;
}

export const SCAN_CATS: ScanCat[] = [
  { key: "pts", label: "Points", short: "PTS", ladder: [10, 15, 20, 25, 30, 35, 40], floor: 10 },
  { key: "reb", label: "Rebounds", short: "REB", ladder: [4, 6, 8, 10, 12, 14, 16], floor: 5 },
  { key: "ast", label: "Assists", short: "AST", ladder: [2, 4, 6, 8, 10, 12], floor: 3 },
  { key: "tpm", label: "3-pointers made", short: "3PM", ladder: [1, 2, 3, 4, 5, 6], floor: 1.5 },
  { key: "stl", label: "Steals", short: "STL", ladder: [1, 2, 3], floor: 0.9 },
  { key: "blk", label: "Blocks", short: "BLK", ladder: [1, 2, 3, 4, 5], floor: 0.8 },
  { key: "pra", label: "Pts + Reb + Ast", short: "PRA", ladder: [15, 20, 25, 30, 35, 40, 45, 50], floor: 18 },
];

export function statOf(b: Pick<BoxLine, "pts" | "reb" | "ast" | "tpm" | "stl" | "blk">, key: ScanCatKey): number {
  return key === "pra" ? b.pts + b.reb + b.ast : b[key];
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export interface HitLine {
  line: number;
  hits: number;
  n: number;
}

/** Highest ladder threshold the player reached in at least `minRate` of recent games. */
export function hitLine(values: number[], ladder: number[], minRate = 0.6, minGames = 5): HitLine | null {
  if (values.length < minGames) return null;
  let best: HitLine | null = null;
  for (const line of ladder) {
    const hits = values.filter((v) => v >= line).length;
    if (hits / values.length >= minRate) best = { line, hits, n: values.length };
  }
  return best;
}

/** Share of `pool` that `v` is greater than or equal to (0..1). */
export function percentileOf(v: number, pool: number[]): number | null {
  if (!pool.length) return null;
  const below = pool.filter((x) => x <= v).length;
  return below / pool.length;
}

/** 1-based rank of `v` in `pool` sorted high → low. */
export function rankOf(v: number, pool: number[]): number | null {
  if (!pool.length) return null;
  return pool.filter((x) => x > v).length + 1;
}

export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Recent form vs baseline, as a fraction (+0.25 = 25% above). */
export function formOf(recent: number | null, base: number | null, floor: number): number | null {
  if (recent == null || base == null) return null;
  return (recent - base) / Math.max(base, floor);
}

export interface SignalInputs {
  pct: number | null; // league percentile of the baseline average
  form: number | null; // last-5 vs baseline
  hitRate: number | null; // hits / n at the chosen line
  oppPct: number | null; // 1 = opponent allows the most of this stat
}

/**
 * 0–100 score. Weighted toward how good the player is at the stat (level), then
 * recent form, how consistently he reaches a line, and how generous the opponent is.
 */
export function signalScore({ pct, form, hitRate, oppPct }: SignalInputs): number {
  const level = pct ?? 0.5;
  const f = form == null ? 0.5 : clamp(form, -0.5, 0.5) + 0.5;
  const c = hitRate ?? 0.4;
  const o = oppPct ?? 0.5;
  return Math.round(100 * (0.45 * level + 0.25 * f + 0.15 * c + 0.15 * o));
}

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

// ---------------------------------------------------------------------------- projections

export type ModelStat = "pts" | "reb" | "ast" | "tpm" | "stl" | "blk";

/** Typical game-to-game spread for a stat with mean m (used when a player has few games). */
export function modelSd(key: ModelStat, m: number): number {
  switch (key) {
    case "pts":
      return 0.25 * m + 2.5;
    case "reb":
      return 0.3 * m + 1.2;
    case "ast":
      return Math.sqrt(m + (m * m) / 6);
    case "blk":
      return Math.sqrt(m + (m * m) / 3);
    default:
      return Math.sqrt(m + (m * m) / 4);
  }
}

const sampleSd = (xs: number[]) => {
  const m = mean(xs) ?? 0;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, xs.length - 1));
};

/**
 * Projected mean and spread for tonight: blend of season average (45%), last 10 (35%)
 * and last 5 (20%), nudged by how much the opponent allows vs league average (dampened,
 * capped at ±7%). Spread blends the player's own game-to-game variation with a model value.
 */
export function projectStat(key: ModelStat, base: number, recent: number[], oppAllowed: number | null, lgAllowed: number | null) {
  const l10 = mean(recent);
  const l5 = mean(recent.slice(0, 5));
  let m = recent.length >= 3 && l10 != null && l5 != null ? 0.45 * base + 0.35 * l10 + 0.2 * l5 : base;
  const matchup = oppAllowed && lgAllowed ? Math.sqrt(clamp(oppAllowed / lgAllowed, 0.86, 1.15)) : 1;
  m *= matchup;
  const model = modelSd(key, m);
  const sd = recent.length >= 5 ? Math.sqrt((recent.length * sampleSd(recent) ** 2 + 5 * model ** 2) / (recent.length + 5)) : model;
  return { mean: Math.max(0, m), sd: Math.max(0.5, sd), matchup };
}
