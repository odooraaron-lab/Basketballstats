import assert from "node:assert/strict";
import { test } from "node:test";
import { anytimeScorer, assignRounds, buildLadder, fitRatings, project, soccerMarkets, type Fixture } from "../src/sports/model.ts";

const side = (id: string, score: number | null) => ({ id, name: id, abbr: id, logo: "", color: "", score });
let n = 0;
const fx = (round: number, h: string, a: string, hs: number | null, as: number | null, day = round * 7): Fixture => ({
  id: String(++n),
  comp: "t",
  season: 2026,
  round,
  roundLabel: `Round ${round}`,
  date: new Date(Date.UTC(2026, 2, 1 + day)).toISOString(),
  state: hs == null ? "pre" : "post",
  status: "",
  venue: "",
  home: side(h, hs),
  away: side(a, as),
  winnerId: hs == null || hs === as ? null : hs! > as! ? h : a,
  final: false,
  ref: "",
});

test("ladder: wins, draws, byes and losing bonus", () => {
  const f = [fx(1, "A", "B", 20, 10), fx(2, "B", "C", 12, 12), fx(3, "A", "C", 18, 20)];
  const nrl = buildLadder(f, { win: 2, draw: 1, loss: 0, bye: 2 });
  const get = (id: string) => nrl.find((r) => r.teamId === id)!;
  // C had a bye in round 1, A in round 2, B in round 3
  assert.equal(get("A").points, 2 + 2 + 0);
  assert.equal(get("B").points, 0 + 1 + 2);
  assert.equal(get("C").points, 2 + 1 + 2);
  assert.equal(get("C").byes, 1);
  assert.equal(nrl[0].teamId, "C");
  const net = buildLadder(f, { win: 3, draw: 0, loss: 0, lossBonusMargin: 5 });
  assert.equal(net.find((r) => r.teamId === "A")!.points, 3 + 1, "A lost by 2 → bonus point");
  assert.equal(net.find((r) => r.teamId === "A")!.form.join(""), "WL");
});

test("ratings favour the stronger team and projections are sane", () => {
  const games: Fixture[] = [];
  const teams = ["A", "B", "C", "D"];
  const strength: Record<string, number> = { A: 10, B: 3, C: -3, D: -10 };
  let r = 0;
  for (let k = 0; k < 4; k++)
    for (const h of teams)
      for (const a of teams)
        if (h !== a) {
          r++;
          games.push(fx(r, h, a, Math.round(20 + strength[h] / 2 - strength[a] / 2 + 2), Math.round(20 + strength[a] / 2 - strength[h] / 2 - 2), r));
        }
  const rt = fitRatings(games);
  assert.ok(rt.homeAdv > 0);
  const p = project(rt, { sport: "rugby-league", marginSd: 14 }, "A", "D")!;
  assert.ok(p.pHome > 0.75 && p.pHome < 1, `A should be a big favourite (${p.pHome})`);
  assert.ok(Math.abs(p.pHome + p.pAway + p.pDraw - 1) < 1e-9);
  const q = project(rt, { sport: "rugby-league", marginSd: 14 }, "D", "A")!;
  assert.ok(q.pHome < 0.3);
  const s = project(rt, { sport: "soccer", marginSd: 1.6 }, "A", "D")!;
  assert.ok(Math.abs(s.pHome + s.pDraw + s.pAway - 1) < 1e-6);
  const sm = soccerMarkets({ ...s, home: 1.4, away: 1.1 });
  assert.ok(sm.over25 > 0.4 && sm.over25 < 0.6);
});

test("anytime scorer chance rises with rate and team scale", () => {
  const lo = anytimeScorer(1, 10, 0.2, 1);
  const hi = anytimeScorer(8, 10, 0.2, 1);
  assert.ok(hi > lo && hi < 1 && lo > 0);
  assert.ok(anytimeScorer(8, 10, 0.2, 1.3) > hi);
});

test("rounds are inferred from date clusters when the feed has none", () => {
  const f = [fx(0, "A", "B", 1, 0, 0), fx(0, "C", "D", 1, 0, 1), fx(0, "A", "C", 1, 0, 7), fx(0, "B", "D", 1, 0, 8), fx(0, "A", "D", 1, 0, 9)];
  f.forEach((x) => (x.round = null));
  assignRounds(f);
  assert.deepEqual(f.map((x) => x.round), [1, 1, 2, 2, 3]);
});

import { t20Ladder } from "../src/lib/t20Ladder.ts";

test("T20 ladder: 4 for a win, bonus at 1.25× run rate, NRR", () => {
  const side = (id: string, runs: number, wk: number, overs: number, winner: boolean) => ({ id, name: id, abbr: id, logo: "", winner, innings: [{ runs, wickets: wk, overs }] });
  const rows = t20Ladder([
    { id: "1", date: "2026-01-01", final: false, noResult: false, tie: false, teams: [side("A", 200, 4, 20, true), side("B", 140, 10, 18.2, false)] },
    { id: "2", date: "2026-01-02", final: false, noResult: false, tie: false, teams: [side("B", 160, 6, 20, true), side("C", 150, 7, 20, false)] },
    { id: "3", date: "2026-01-03", final: false, noResult: true, tie: false, teams: [side("A", 0, 0, 0, false), side("C", 0, 0, 0, false)] },
  ]);
  const get = (id: string) => rows.find((r) => r.id === id)!;
  assert.equal(get("A").points, 5 + 2, "A: win + bonus (10.0 v 7.0 rpo, B all out counts 20 overs) + NR");
  assert.equal(get("B").points, 4);
  assert.equal(get("C").points, 2);
  assert.ok(Math.abs(get("A").nrr! - 3) < 1e-9);
  assert.equal(rows[0].id, "A");
});
