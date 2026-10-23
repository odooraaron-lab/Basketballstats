import assert from "node:assert/strict";
import { test } from "node:test";
import { NBL } from "../src/leagues/nbl.ts";
import {
  allowedByTeam,
  buildSeasonBook,
  leadersFrom,
  playerSeasonRowsFrom,
  teamSeasonFrom,
} from "../src/lib/boxSeasonCore.ts";
import type { BoxPlayer, BoxTeam, GameSummary, TeamRef } from "../src/lib/model.ts";
import { classifyZone, cornerThreeTop } from "../src/lib/pbp.ts";
import { emptyBox, type BoxLine } from "../src/lib/stats.ts";

const team = (id: string, abbr: string): TeamRef => ({
  id,
  abbr,
  name: abbr,
  shortName: abbr,
  location: "",
  color: "000000",
  altColor: "ffffff",
  logo: `logo-${abbr}`,
});
const NZL = team("6", "NZL");
const SYD = team("9", "SYD");

const line = (o: Partial<BoxLine>): BoxLine => ({ ...emptyBox(), ...o });
const bp = (id: string, name: string, box: Partial<BoxLine>, starter = true, dnp = false): BoxPlayer => ({
  player: { id, name, shortName: name, jersey: "", pos: "G", headshot: "" },
  starter,
  dnp,
  reason: "",
  box: line(box),
});

function game(id: string, date: string, home: TeamRef, away: TeamRef, hs: number, as: number, homeP: BoxPlayer[], awayP: BoxPlayer[]): GameSummary {
  const side = (t: TeamRef, s: number, winner: boolean) => ({ team: t, score: s, record: "", winner, linescores: [] });
  const sum = (ps: BoxPlayer[], pts: number) => {
    const b = ps.reduce((a, p) => {
      (Object.keys(a) as (keyof BoxLine)[]).forEach((k) => (a[k] = (a[k] ?? 0) + (p.box[k] ?? 0)));
      return a;
    }, emptyBox());
    return { ...b, pts };
  };
  const box: BoxTeam[] = [
    { team: home, homeAway: "home", players: homeP, totals: sum(homeP, hs), teamStats: [] },
    { team: away, homeAway: "away", players: awayP, totals: sum(awayP, as), teamStats: [] },
  ];
  return {
    card: {
      id,
      date,
      state: "post",
      detail: "Final",
      shortDetail: "Final",
      period: 4,
      clock: "0:00",
      home: side(home, hs, hs > as),
      away: side(away, as, as > hs),
      venue: "",
      broadcast: "",
      odds: null,
      seasonType: 2,
    },
    box,
    plays: [],
    officials: [],
    attendance: null,
    winProb: [],
    injuries: [],
    seasonSeries: [],
    lastFive: [],
  };
}

const games = [
  game(
    "g1",
    "2026-09-20T05:00Z",
    NZL,
    SYD,
    95,
    81,
    [
      bp("pjc", "Parker", { min: 34, pts: 26, fgm: 9, fga: 20, tpm: 6, tpa: 12, ftm: 2, fta: 2, reb: 4, ast: 10, tov: 2 }),
      bp("rl", "Rob", { min: 20, pts: 8, fgm: 4, fga: 6, reb: 11, oreb: 4, dreb: 7 }, false),
      bp("bench", "Bench", {}, false, true),
    ],
    [bp("jc", "Jaylin", { min: 36, pts: 30, fgm: 11, fga: 22, tpm: 4, tpa: 9, ftm: 4, fta: 5, reb: 6, ast: 3 })],
  ),
  game(
    "g2",
    "2026-09-26T09:00Z",
    SYD,
    NZL,
    100,
    93,
    [bp("jc", "Jaylin", { min: 35, pts: 20, fgm: 8, fga: 18, tpm: 2, tpa: 7, ftm: 2, fta: 2, reb: 5, ast: 5 })],
    [bp("pjc", "Parker", { min: 30, pts: 14, fgm: 5, fga: 14, tpm: 2, tpa: 8, ftm: 2, fta: 4, reb: 2, ast: 6, tov: 4 })],
  ),
  // A game listed as final but without a published box score is ignored.
  { ...game("g3", "2026-10-01T09:00Z", NZL, SYD, 90, 80, [], []), box: [] },
];

const book = buildSeasonBook(games, { year: 2027, seasonType: 2, label: "2026-27" });

test("counts only games with a two-team box score", () => {
  assert.equal(book.games, 2);
});

test("team season mirrors ESPN's team stats shape, incl. points allowed", () => {
  const t = teamSeasonFrom(book, "6")!;
  assert.equal(t.gp, 2);
  assert.equal(t.perGame.pts, (95 + 93) / 2);
  assert.equal(t.raw.avgPointsAgainst, (81 + 100) / 2);
  assert.equal(t.raw.wins, 1);
  assert.equal(t.raw.losses, 1);
  assert.equal(teamSeasonFrom(book, "999"), null);
});

test("player averages skip DNPs and track starts and double-doubles", () => {
  const p = book.players.get("pjc")!;
  assert.equal(p.gp, 2);
  assert.equal(p.gs, 2);
  assert.equal(p.dd2, 1); // 26 pts + 10 ast in game 1
  assert.equal(book.players.has("bench"), false);
  const rows = playerSeasonRowsFrom(book, "pjc");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].avg.pts, 20);
  assert.equal(rows[0].teamAbbr, "NZL");
});

test("game log is newest first with opponent, venue and result", () => {
  const log = book.players.get("pjc")!.log;
  assert.deepEqual(
    log.map((g) => [g.eventId, g.atVs, g.opp, g.result, g.score]),
    [
      ["g2", "@", "SYD", "L", "93-100"],
      ["g1", "vs", "SYD", "W", "95-81"],
    ],
  );
});

test("leaders sort by ESPN sort string and use ESPN value keys", () => {
  const pts = leadersFrom(book, { sort: "offensive.avgPoints:desc", qualified: false });
  assert.deepEqual(
    pts.rows.map((r) => r.player.id),
    ["jc", "pjc", "rl"],
  );
  assert.equal(pts.rows[0].values.avgPoints, 25);
  assert.equal(pts.rows[0].teamAbbr, "SYD");
  // Percentages are 0–100 like ESPN's feed.
  assert.equal(pts.rows[1].values.threePointFieldGoalPct, 40);
  const reb = leadersFrom(book, { sort: "general.avgRebounds:desc", qualified: false, limit: 1 });
  assert.equal(reb.rows[0].player.id, "rl");
  assert.equal(reb.pages, 3);
});

test("qualified leaders need 60% of team games", () => {
  // Rob played 1 of NZL's 2 games (50%) — out when qualified.
  const q = leadersFrom(book, { sort: "offensive.avgPoints:desc" });
  assert.deepEqual(
    q.rows.map((r) => r.player.id).sort(),
    ["jc", "pjc"],
  );
});

test("allowed-by-team table comes from opponents' box scores", () => {
  const t = allowedByTeam(book);
  assert.equal(t.NZL.pts, (81 + 100) / 2);
  assert.equal(t.SYD.pts, (95 + 93) / 2);
});

test("FIBA corner three is shorter than the NBA's", () => {
  const fiba = cornerThreeTop(NBL.rules);
  assert.ok(fiba > 4.5 && fiba < 5, `got ${fiba}`);
  // 21.5 ft from the hoop, low in the corner: corner 3 in both leagues.
  assert.equal(classifyZone(3, 3.5, 2, 22, NBL.rules), "Corner 3");
  // Same sideline spot but 7 ft up: still the NBA corner, but above the break under FIBA.
  assert.equal(classifyZone(3, 4, 7, 22), "Corner 3");
  assert.equal(classifyZone(3, 4, 7, 22, NBL.rules), "Above the Break 3");
});

test("NBL rule set is FIBA", () => {
  assert.equal(NBL.rules.periods * NBL.rules.periodMinutes, 40);
  assert.equal(NBL.rules.foulOutLimit, 5);
  assert.equal(NBL.provider.seasonStats, "boxscores");
  assert.equal(NBL.features.nbaComTracking, false);
});
