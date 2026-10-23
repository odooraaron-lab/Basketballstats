import assert from "node:assert/strict";
import { test } from "node:test";
import type { League } from "../src/leagues/types.ts";
import type { BoxTeam, Play } from "../src/lib/model.ts";
import {
  buildCtx,
  classifyZone,
  clutchStats,
  extractShots,
  findRuns,
  lineupStats,
  possessionLog,
  scoringEvents,
  scoringFlow,
  turnoverBreakdown,
} from "../src/lib/pbp.ts";
import { elapsedSeconds, gameMinutes, isClutch, parseClock } from "../src/lib/rules.ts";
import {
  effectiveFg,
  emptyBox,
  gameScore,
  per,
  possessions,
  trueShooting,
  usage,
  type BoxLine,
} from "../src/lib/stats.ts";

const LEAGUE: League = {
  id: "test",
  name: "Test",
  shortName: "TST",
  region: "USA",
  provider: { kind: "espn", sportPath: "nba", seasonStats: "feed" },
  features: { nbaComTracking: true },
  ladder: { direct: 6, playIn: 10, note: "" },
  accent: "#000",
  statDefinitions: [],
  zoneBaselines: { "Restricted Area": 0.66, "Paint (Non-RA)": 0.44, "Mid-Range": 0.42, "Corner 3": 0.385, "Above the Break 3": 0.355 },
  rules: {
    periods: 4,
    periodMinutes: 12,
    overtimeMinutes: 5,
    shotClock: 24,
    shotClockOffensiveReset: 14,
    foulOutLimit: 6,
    bonusFouls: 5,
    playersOnCourt: 5,
    threePointFt: 23.75,
    cornerThreeFt: 22,
    clutch: { seconds: 300, margin: 5 },
    runningClock: false,
  },
};

const box = (o: Partial<BoxLine>): BoxLine => ({ ...emptyBox(), ...o });

test("shooting efficiency formulas", () => {
  const b = box({ pts: 30, fgm: 10, fga: 20, tpm: 4, tpa: 8, ftm: 6, fta: 8 });
  assert.equal(effectiveFg(b), (10 + 2) / 20);
  assert.ok(Math.abs(trueShooting(b)! - 30 / (2 * (20 + 0.44 * 8))) < 1e-9);
  assert.equal(trueShooting(box({})), null);
});

test("game score + usage", () => {
  const p = box({ min: 36, pts: 25, fgm: 9, fga: 18, ftm: 5, fta: 6, oreb: 1, dreb: 6, reb: 7, ast: 6, stl: 2, blk: 1, tov: 3, pf: 2 });
  const gs = gameScore(p);
  assert.ok(Math.abs(gs - (25 + 3.6 - 12.6 - 0.4 + 0.7 + 1.8 + 2 + 4.2 + 0.7 - 0.8 - 3)) < 1e-9);
  const team = box({ fga: 88, fta: 22, tov: 14 });
  const u = usage(p, team, 240)!;
  assert.ok(u > 20 && u < 30, `usage ${u}`);
});

test("possessions and PER normalise sensibly", () => {
  const t = box({ pts: 112, fgm: 41, fga: 88, tpm: 13, tpa: 36, ftm: 17, fta: 22, oreb: 10, dreb: 34, reb: 44, ast: 26, stl: 8, blk: 5, tov: 13, pf: 19, min: 240 });
  const poss = possessions(t, t);
  assert.ok(poss > 95 && poss < 105, `poss ${poss}`);
  // A "league average player" (team line scaled to one player) should be ~15 PER.
  const lg = { totals: t, pace: 100 };
  const avgPlayer = { ...t, min: 240 };
  const v = per(avgPlayer, { totals: t, pace: 100 }, lg)!;
  assert.ok(Math.abs(v - 15) < 1e-6, `per ${v}`);
});

test("rules engine handles regulation, OT and clutch", () => {
  const r = LEAGUE.rules;
  assert.equal(gameMinutes(r, 4), 48);
  assert.equal(gameMinutes(r, 6), 58);
  assert.equal(parseClock("11:13"), 673);
  assert.equal(parseClock("36.1"), 36.1);
  assert.equal(elapsedSeconds(r, 1, 720), 0);
  assert.equal(elapsedSeconds(r, 5, 300), 2880);
  assert.equal(isClutch(r, 4, 200, 4), true);
  assert.equal(isClutch(r, 4, 200, 9), false);
  assert.equal(isClutch(r, 3, 100, 0), false);
  assert.equal(isClutch(r, 5, 250, -3), true);
});

test("shot zones from ESPN coordinates", () => {
  assert.equal(classifyZone(2, 25, 1, 1), "Restricted Area");
  assert.equal(classifyZone(2, 21, 9, 9), "Paint (Non-RA)");
  assert.equal(classifyZone(2, 10, 17, 23), "Mid-Range");
  assert.equal(classifyZone(3, 2, 0, 23), "Corner 3");
  assert.equal(classifyZone(3, 25, 25, 25), "Above the Break 3");
  assert.equal(classifyZone(3, null, null, 26), "Above the Break 3");
});

// ---------------------------------------------------------------------------
// Synthetic game: HOM (id 1) vs AWY (id 2)
// ---------------------------------------------------------------------------
const H = ["h1", "h2", "h3", "h4", "h5", "h6"];
const A = ["a1", "a2", "a3", "a4", "a5", "a6"];
const mkTeam = (id: string, ids: string[], homeAway: "home" | "away"): BoxTeam => ({
  team: { id, abbr: id === "1" ? "HOM" : "AWY", name: id, shortName: id, location: "", color: "000000", altColor: "ffffff", logo: "" },
  homeAway,
  totals: emptyBox(),
  teamStats: [],
  players: ids.map((pid, i) => ({
    player: { id: pid, name: `Player ${pid.toUpperCase()}`, shortName: pid, jersey: "", pos: "G", headshot: "", teamId: id },
    starter: i < 5,
    dnp: false,
    reason: "",
    box: emptyBox(),
  })),
});
const BOX = [mkTeam("2", A, "away"), mkTeam("1", H, "home")];

let seq = 0;
let hs = 0;
let as = 0;
const plays: Play[] = [];
function play(period: number, clock: string, o: Partial<Play> & { text: string; type: string }) {
  if (o.scoring) {
    if (o.teamId === "1") hs += o.scoreValue ?? 0;
    else as += o.scoreValue ?? 0;
  }
  plays.push({
    id: String(++seq),
    seq,
    period,
    clock: parseClock(clock),
    clockDisplay: clock,
    typeId: "",
    teamId: null,
    athletes: [],
    scoring: false,
    scoreValue: 0,
    shooting: false,
    pointsAttempted: null,
    x: null,
    y: null,
    ...o,
    homeScore: hs,
    awayScore: as,
  });
}
const made = (period: number, clock: string, team: "1" | "2", shooter: string, pts: 2 | 3, x: number, y: number, assist?: string) =>
  play(period, clock, {
    type: pts === 3 ? "Jump Shot" : "Layup Shot",
    text: `Player ${shooter.toUpperCase()} makes ${pts === 3 ? "26-foot three point jumper" : "2-foot layup"}${assist ? ` (Player ${assist.toUpperCase()} assists)` : ""}`,
    teamId: team,
    athletes: assist ? [shooter, assist] : [shooter],
    scoring: true,
    scoreValue: pts,
    shooting: true,
    pointsAttempted: pts,
    x,
    y,
  });
const miss = (period: number, clock: string, team: "1" | "2", shooter: string) =>
  play(period, clock, { type: "Jump Shot", text: `Player ${shooter.toUpperCase()} misses 18-foot jumper`, teamId: team, athletes: [shooter], shooting: true, pointsAttempted: 2, x: 10, y: 12 });
const dreb = (period: number, clock: string, team: "1" | "2", p: string) =>
  play(period, clock, { type: "Defensive Rebound", text: `Player ${p.toUpperCase()} defensive rebound`, teamId: team, athletes: [p] });

// Q1: home 10-0 run, away answers
made(1, "11:30", "1", "h1", 2, 25, 1, "h2");
miss(1, "11:10", "2", "a1");
dreb(1, "11:08", "1", "h3");
made(1, "10:50", "1", "h2", 3, 2, 0);
play(1, "10:30", { type: "Bad Pass Turnover", text: "Player A2 bad pass (Player H4 steals)", teamId: "2", athletes: ["a2", "h4"] });
made(1, "10:20", "1", "h4", 2, 25, 2);
play(1, "10:00", { type: "Traveling", text: "Player A3 traveling", teamId: "2", athletes: ["a3"] });
made(1, "9:40", "1", "h1", 3, 25, 25);
play(1, "9:30", { type: "Substitution", text: "Player A6 enters the game for Player A1", teamId: "2", athletes: ["a6", "a1"] });
made(1, "9:10", "2", "a6", 2, 22, 9);
play(1, "0:00", { type: "End Period", text: "End of the 1st Quarter" });
// Q4 clutch
play(4, "4:00", { type: "Jump Shot", text: "Player A2 makes 26-foot three point jumper", teamId: "2", athletes: ["a2"], scoring: true, scoreValue: 3, shooting: true, pointsAttempted: 3, x: 25, y: 26 });
play(4, "3:30", { type: "Free Throw - 1 of 2", text: "Player H1 makes free throw 1 of 2", teamId: "1", athletes: ["h1"], scoring: true, scoreValue: 1, shooting: true, pointsAttempted: 1 });
play(4, "3:30", { type: "Free Throw - 2 of 2", text: "Player H1 makes free throw 2 of 2", teamId: "1", athletes: ["h1"], scoring: true, scoreValue: 1, shooting: true, pointsAttempted: 1 });
play(4, "0:00", { type: "End Game", text: "End of Game" });

const ctx = buildCtx(LEAGUE, BOX, "1", "2");

test("shots, assists and zones from plays", () => {
  const shots = extractShots(plays, ctx);
  assert.equal(shots.length, 7);
  const first = shots[0];
  assert.equal(first.playerId, "h1");
  assert.equal(first.assistId, "h2");
  assert.equal(first.zone, "Restricted Area");
  assert.equal(shots[2].zone, "Corner 3");
  assert.equal(shots.filter((s) => !s.made).length, 1);
});

test("runs, lead changes and flow", () => {
  const ev = scoringEvents(plays, ctx);
  const runs = findRuns(ev);
  assert.ok(runs.length >= 1);
  assert.equal(runs[0].teamId, "1");
  assert.equal(runs[0].forPts, 10);
  assert.equal(runs[0].againstPts, 0);
  assert.equal(runs[0].unanswered, true);
  const flow = scoringFlow(ev, ctx, 4);
  assert.equal(flow.largestLead["1"], 10);
  assert.equal(flow.totalSeconds, 2880);
});

test("clutch window only includes late close-game plays", () => {
  // Score entering Q4 is 10-2 home (margin 8) → the away three at 4:00 is NOT clutch (margin 8 > 5),
  // after it the margin is 5 so FT 1 IS clutch; FT 2 is taken at 11-5 (margin 6) so it is not.
  const c = clutchStats(plays, ctx);
  assert.equal(c.teamPts["1"], 1);
  assert.equal(c.teamPts["2"], 0);
  const h1 = c.players.find((p) => p.id === "h1")!;
  assert.equal(h1.box.ftm, 1);
});

test("turnovers split into live and dead ball", () => {
  const t = turnoverBreakdown(plays, ctx).find((r) => r.teamId === "2")!;
  assert.equal(t.live, 1);
  assert.equal(t.dead, 1);
});

test("possession log alternates and totals points", () => {
  const poss = possessionLog(plays, ctx);
  const homePts = poss.filter((p) => p.teamId === "1").reduce((a, p) => a + p.points, 0);
  const awayPts = poss.filter((p) => p.teamId === "2").reduce((a, p) => a + p.points, 0);
  assert.equal(homePts, hs);
  assert.equal(awayPts, as);
  assert.ok(poss.length >= 8, `poss ${poss.length}`);
});

test("lineups track substitutions", () => {
  const rows = lineupStats(plays, BOX, ctx);
  const awayLineups = rows.filter((r) => r.teamId === "2");
  assert.ok(awayLineups.some((r) => r.ids.includes("a6") && !r.ids.includes("a1")), "a6 replaced a1");
  const starters = awayLineups.find((r) => r.ids.includes("a1"))!;
  assert.equal(starters.ptsAgainst, 10);
  assert.equal(starters.ptsFor, 0);
});
