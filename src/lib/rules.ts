// Rules engine: every timing / possession calculation goes through the league's RuleSet,
// so nothing about game length or clutch windows is hard-coded elsewhere.
import type { RuleSet } from "@/leagues/types";

export function periodSeconds(rules: RuleSet, period: number): number {
  return (period <= rules.periods ? rules.periodMinutes : rules.overtimeMinutes) * 60;
}

export function regulationMinutes(rules: RuleSet): number {
  return rules.periods * rules.periodMinutes;
}

/** Total game minutes for a game that ended after `periodsPlayed` periods. */
export function gameMinutes(rules: RuleSet, periodsPlayed: number): number {
  const ot = Math.max(0, periodsPlayed - rules.periods);
  return regulationMinutes(rules) + ot * rules.overtimeMinutes;
}

/** Team minutes (all players combined) — e.g. 240 for a regulation NBA game. */
export function teamMinutes(rules: RuleSet, periodsPlayed: number): number {
  return gameMinutes(rules, periodsPlayed) * rules.playersOnCourt;
}

/** Parse "11:13", "36.1", "0:05.2" into seconds remaining in the period. */
export function parseClock(display: string | undefined | null): number {
  if (!display) return 0;
  const s = String(display).trim();
  if (s.includes(":")) {
    const [m, sec] = s.split(":");
    return Number(m) * 60 + Number(sec);
  }
  return Number(s) || 0;
}

/** Seconds elapsed since tip-off at a given period/clock. */
export function elapsedSeconds(rules: RuleSet, period: number, clockRemaining: number): number {
  let t = 0;
  for (let p = 1; p < period; p++) t += periodSeconds(rules, p);
  return t + (periodSeconds(rules, period) - clockRemaining);
}

/** Is this moment in the "clutch" window (final N seconds of the 4th/OT, close score)? */
export function isClutch(
  rules: RuleSet,
  period: number,
  clockRemaining: number,
  margin: number,
  window = rules.clutch,
): boolean {
  return period >= rules.periods && clockRemaining <= window.seconds && Math.abs(margin) <= window.margin;
}

/** Scale a per-game number to per-48 (or per regulation length) minutes. */
export function perRegulation(rules: RuleSet, value: number, minutes: number): number {
  return minutes > 0 ? (value * regulationMinutes(rules)) / minutes : 0;
}

export function periodLabel(rules: RuleSet, period: number): string {
  if (period <= rules.periods) return rules.periods === 2 ? `H${period}` : `Q${period}`;
  const ot = period - rules.periods;
  return ot === 1 ? "OT" : `${ot}OT`;
}
