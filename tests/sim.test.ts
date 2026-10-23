import assert from "node:assert/strict";
import { test } from "node:test";
import { bestCombos, bitsWhere, popcount, quantile, share, simulate, type SimInput, type StatKey } from "../src/lib/sim.ts";

const stats = (pts: number, ast: number, blk: number, reb = 5): Record<StatKey, { mean: number; sd: number }> => ({
  pts: { mean: pts, sd: 0.25 * pts + 2.5 },
  reb: { mean: reb, sd: 0.3 * reb + 1.2 },
  ast: { mean: ast, sd: Math.sqrt(ast) },
  tpm: { mean: 2, sd: 1.4 },
  stl: { mean: 1, sd: 1 },
  blk: { mean: blk, sd: Math.sqrt(blk) },
});

const INPUT: SimInput = {
  teams: [
    { id: "A", abbr: "AWY", mean: 110 },
    { id: "H", abbr: "HOM", mean: 116 },
  ],
  players: [
    { id: "a1", teamId: "A", stats: stats(27, 6, 0.5) },
    { id: "a2", teamId: "A", stats: stats(15, 2, 2.2, 10) },
    { id: "h1", teamId: "H", stats: stats(30, 8, 0.8) },
  ],
};

test("simulation is deterministic and reproduces the means", () => {
  const r1 = simulate(INPUT, 8000, 42);
  const r2 = simulate(INPUT, 8000, 42);
  assert.deepEqual(Array.from(r1.stats.get("a1:pts")!.slice(0, 20)), Array.from(r2.stats.get("a1:pts")!.slice(0, 20)));
  const mean = (a: Int16Array) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(Math.abs(mean(r1.stats.get("a1:pts")!) - 27) < 0.8, "points mean");
  assert.ok(Math.abs(mean(r1.stats.get("h1:ast")!) - 8) < 0.4, "assists mean");
  assert.ok(Math.abs(mean(r1.stats.get("a2:blk")!) - 2.2) < 0.15, "blocks mean");
  assert.ok(Math.abs(mean(r1.teamScores[1]) - 116) < 1, "team mean");
  const pra = r1.stats.get("h1:pra")!;
  assert.equal(pra[5], r1.stats.get("h1:pts")![5] + r1.stats.get("h1:reb")![5] + r1.stats.get("h1:ast")![5]);
});

test("home favourite wins more often; spread of outcomes is realistic", () => {
  const r = simulate(INPUT, 10000, 3);
  let homeWins = 0;
  for (let i = 0; i < r.n; i++) if (r.teamScores[1][i] > r.teamScores[0][i]) homeWins++;
  const p = homeWins / r.n;
  assert.ok(p > 0.6 && p < 0.75, `home win ${p}`);
  const margin = Array.from(r.teamScores[1], (h, i) => h - r.teamScores[0][i]);
  const q1 = quantile(margin, 0.16);
  const q2 = quantile(margin, 0.84);
  assert.ok(q2 - q1 > 20 && q2 - q1 < 34, `margin 68% band ${q2 - q1}`);
});

test("same-player stats are positively correlated (joint > independent)", () => {
  const r = simulate(INPUT, 20000, 11);
  const pts = r.stats.get("h1:pts")!;
  const ast = r.stats.get("h1:ast")!;
  const a = bitsWhere(r.n, (i) => pts[i] >= 30);
  const b = bitsWhere(r.n, (i) => ast[i] >= 8);
  const pa = popcount(a) / r.n;
  const pb = popcount(b) / r.n;
  const joint = share(Array.from(pts, (v, i) => (v >= 30 && ast[i] >= 8 ? 1 : 0)), (v) => v === 1);
  assert.ok(joint > pa * pb, `joint ${joint} vs ${pa * pb}`);
});

test("bestCombos finds the most likely combos and respects groups", () => {
  const n = 64;
  const mk = (id: string, group: string, k: number) => {
    const bits = bitsWhere(n, (i) => i < k);
    return { id, group, bits, p: k / n };
  };
  const legs = [mk("x", "g1", 60), mk("x2", "g1", 62), mk("y", "g2", 50), mk("z", "g3", 40)];
  const combos = bestCombos(legs, n, 2, 3);
  assert.equal(combos[0].legs.map((l) => l.id).sort().join(), "x2,y");
  assert.ok(combos.every((c) => new Set(c.legs.map((l) => l.group)).size === c.legs.length), "no two legs from one group");
  assert.equal(combos[0].p, 50 / 64);
});
