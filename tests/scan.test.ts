import assert from "node:assert/strict";
import { test } from "node:test";
import { SCAN_CATS, formOf, hitLine, ordinal, percentileOf, rankOf, signalScore, statOf } from "../src/lib/scanCore.ts";

test("hit line picks the highest threshold reached often enough", () => {
  const pts = [31, 27, 22, 26, 30, 19, 28, 25, 33, 24];
  const ladder = SCAN_CATS.find((c) => c.key === "pts")!.ladder;
  assert.deepEqual(hitLine(pts, ladder), { line: 25, hits: 7, n: 10 });
  assert.equal(hitLine([10, 12], ladder), null, "needs 5+ games");
  assert.equal(hitLine([2, 3, 1, 4, 2], ladder), null, "never reaches the lowest line");
});

test("percentile and rank", () => {
  const pool = [5, 10, 15, 20, 25];
  assert.equal(percentileOf(25, pool), 1);
  assert.equal(percentileOf(15, pool), 0.6);
  assert.equal(rankOf(25, pool), 1);
  assert.equal(rankOf(16, pool), 3);
  assert.equal(percentileOf(3, []), null);
});

test("form uses the floor for tiny baselines", () => {
  assert.ok(Math.abs(formOf(30, 24, 10)! - 0.25) < 1e-9);
  assert.equal(formOf(2, 0.2, 0.8), (2 - 0.2) / 0.8);
  assert.equal(formOf(null, 10, 5), null);
});

test("signal score is bounded and rewards each factor", () => {
  const avg = signalScore({ pct: 0.5, form: 0, hitRate: 0.5, oppPct: 0.5 });
  const elite = signalScore({ pct: 1, form: 0.5, hitRate: 1, oppPct: 1 });
  const poor = signalScore({ pct: 0, form: -0.9, hitRate: 0, oppPct: 0 });
  assert.equal(elite, 100);
  assert.equal(poor, 0);
  assert.ok(avg > poor && avg < elite);
  assert.ok(signalScore({ pct: 0.5, form: 0, hitRate: 0.5, oppPct: 0.9 }) > avg, "soft matchup raises score");
});

test("PRA and ordinals", () => {
  assert.equal(statOf({ pts: 20, reb: 8, ast: 5, tpm: 2, stl: 1, blk: 0 }, "pra"), 33);
  assert.equal(ordinal(1), "1st");
  assert.equal(ordinal(2), "2nd");
  assert.equal(ordinal(3), "3rd");
  assert.equal(ordinal(11), "11th");
  assert.equal(ordinal(22), "22nd");
  assert.equal(ordinal(30), "30th");
});
