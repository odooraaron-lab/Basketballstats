import assert from "node:assert/strict";
import { test } from "node:test";
import { judge, noVig, parseOcrText, phi } from "../src/lib/slipCore.ts";

test("parses a props screen like the example", () => {
  const text = `Norman Powell
14 ▸ 7 ▸ 25 ▸ 11 ▸ 15
O 21.5 U 21.5
1.87 1.87
10% 90%
Caleb Wilson 16
O 17.5 U 17.5
1.91 1.83
0% 100%
Jaime Jaquez Jr.
15 > 23 > 26 > 13 > 22
O 15.5 U 15.5
1.90 1.85`;
  const rows = parseOcrText(text);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { name: "Norman Powell", line: 21.5, over: 1.87, under: 1.87, recent: [14, 7, 25, 11, 15] });
  assert.equal(rows[1].name, "Caleb Wilson");
  assert.deepEqual(rows[1].recent, [16]);
  assert.equal(rows[1].under, 1.83);
  assert.equal(rows[2].name, "Jaime Jaquez Jr.");
  assert.equal(rows[2].line, 15.5);
});

test("no-vig removes the bookmaker margin", () => {
  const v = noVig(1.87, 1.87);
  assert.ok(Math.abs(v.over! - 0.5) < 1e-9);
  assert.ok(v.margin! > 0.06 && v.margin! < 0.08);
  assert.ok(Math.abs(phi(0) - 0.5) < 1e-6);
  assert.ok(Math.abs(phi(1.96) - 0.975) < 1e-3);
});

test("flags an obvious under when history and projection agree", () => {
  const row = { name: "Norman Powell", line: 21.5, over: 1.87, under: 1.87, recent: [] };
  const v = judge(row, 14.2, 5.5, [14, 7, 25, 11, 15, 12, 16, 10, 18, 13], 14.5);
  assert.equal(v.pick, "under");
  assert.equal(v.strength, "strong");
  assert.ok(v.ev! > 0);
});

test("passes on a coin flip", () => {
  const row = { name: "X", line: 16.5, over: 1.92, under: 1.82, recent: [] };
  const v = judge(row, 16.5, 5, [12, 17, 11, 14, 17, 20, 18, 16, 15, 19], 16.4);
  assert.equal(v.strength, "pass");
});
