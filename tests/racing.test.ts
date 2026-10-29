import assert from "node:assert/strict";
import { test } from "node:test";
import { formString, isFinal, keyOf, marketChances, parseMeetings, parseRace, placesPaid, slugOf, splitClaim, tally } from "../src/lib/racing/core.ts";

// Shapes follow Entain's Affiliates API documentation (TAB NZ / Ladbrokes).
const MEETINGS = {
  header: { title: "Meetings" },
  data: {
    meetings: [
      {
        meeting: "m-1",
        name: "Te Rapa",
        date: "2026-10-31T00:00:00Z",
        category: "T",
        category_name: "Thoroughbred Horse Racing",
        country: "NZ",
        state: "",
        races: [
          { id: "r-2", race_number: 2, name: "Maiden 1400", start_time: "2026-10-31T00:35:00Z", track_condition: "Good4", distance: 1400, weather: "Fine", status: "Open" },
          { id: "r-1", race_number: 1, name: "Maiden 1200", start_time: "2026-10-31T00:00:00Z", track_condition: "Good4", distance: 1200, weather: "Fine", status: "Open" },
          { id: "r-x", race_number: 0, name: "Special" },
        ],
      },
    ],
  },
};

const RACE = {
  data: {
    race: {
      event_id: "r-1",
      meeting_name: "Te Rapa",
      meeting_id: "m-1",
      status: "Final",
      description: "Maiden 1200",
      advertised_start: 1793404800,
      race_number: 1,
      type: "T",
      country: "NZ",
      distance: 1200,
      track_condition: "Good4",
      weather: "Fine",
    },
    results: [
      { position: 2, name: "Second Horse", barrier: 3, runner_number: 2, margin_length: 1.25 },
      { position: 1, name: "Bella Nipotina (NZ)", barrier: 1, runner_number: 1, margin_length: 0 },
      { position: 3, name: "Third", barrier: 4, runner_number: 3, margin_length: 2 },
    ],
    dividends: [{ id: "d1", tote: "NZ", product_name: "Win", status: "Final", dividend: 2.6, pool_size: 12000, positions: [{ runner_number: 1, position: 1 }] }],
    favourite: { runner_number: 1 },
    runners: [
      { name: "Bella Nipotina (NZ)", runner_number: 1, barrier: 1, jockey: "Joe Bloggs (a1.5)", trainer_name: "Jane Smith", weight: { allocated: "57", total: "55.5" }, is_scratched: false, odds: { fixed_win: 2.5, fixed_place: 1.3 }, flucs: [3.2, 2.8, 2.5], age: 4, sex: "M" },
      { name: "Second Horse", runner_number: 2, barrier: 3, jockey: "A Rider", trainer_name: "B Trainer", weight: { total: "57" }, odds: { fixed_win: 4, fixed_place: 1.7 } },
      { name: "Third", runner_number: 3, barrier: 4, jockey: "C Rider", trainer_name: "Jane Smith", odds: { fixed_win: 5, fixed_place: 1.9 } },
      { name: "Fourth", runner_number: 4, barrier: 2, jockey: "D Rider", trainer_name: "E T", odds: { fixed_win: 8, fixed_place: 2.6 } },
      { name: "Fifth", runner_number: 5, barrier: 5, jockey: "F", trainer_name: "G", odds: { fixed_win: 10, fixed_place: 3 } },
      { name: "Scratchie", runner_number: 6, barrier: 6, jockey: "H", trainer_name: "I", is_scratched: true, odds: { fixed_win: 0, fixed_place: 0 } },
    ],
  },
};

test("meetings parse, drop specials and sort races", () => {
  const [m] = parseMeetings(MEETINGS);
  assert.equal(m.name, "Te Rapa");
  assert.equal(m.date, "2026-10-31");
  assert.equal(m.category, "T");
  assert.deepEqual(m.races.map((r) => r.number), [1, 2]);
  assert.equal(m.races[0].start, "2026-10-31T00:00:00.000Z");
  assert.equal(m.races[0].distance, 1200);
});

test("race card: runners, claims, weights, results, dividends", () => {
  const c = parseRace(RACE)!;
  assert.equal(c.id, "r-1");
  assert.equal(c.start, new Date(1793404800 * 1000).toISOString());
  assert.equal(c.runners.length, 6);
  const r1 = c.runners[0];
  assert.equal(r1.jockey, "Joe Bloggs");
  assert.equal(r1.claim, "a1.5");
  assert.equal(r1.weight, 55.5);
  assert.equal(r1.favourite, true);
  assert.deepEqual(r1.flucs, [3.2, 2.8, 2.5]);
  assert.equal(c.runners[5].scratched, true);
  assert.equal(c.runners[5].winOdds, null);
  assert.deepEqual(c.results.map((x) => x.number), [1, 2, 3]);
  assert.equal(c.dividends[0].dividend, 2.6);
  assert.ok(isFinal(c));
});

test("market chances remove the margin and respect places paid", () => {
  const c = parseRace(RACE)!;
  const ch = marketChances(c.runners);
  const wins = [...ch.values()].map((x) => x.win ?? 0);
  assert.ok(Math.abs(wins.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.equal(ch.has(6), false); // scratched
  assert.equal(placesPaid(5), 2);
  assert.equal(placesPaid(8), 3);
  assert.equal(placesPaid(4), 0);
  const places = [...ch.values()].map((x) => x.place ?? 0);
  assert.ok(Math.abs(places.reduce((a, b) => a + b, 0) - 2) < 0.05); // 5 starters → 2 places
  assert.ok((ch.get(1)!.win ?? 0) > (ch.get(2)!.win ?? 0));
});

test("names map to stable keys and slugs", () => {
  assert.equal(keyOf("Bella Nipotina (NZ)"), keyOf("BELLA NIPOTINA"));
  assert.equal(slugOf("Bella Nipotina (NZ)"), "bella-nipotina");
  assert.equal(keyOf("O'Brien"), "OBRIEN");
  assert.equal(slugOf("Opie Bosson"), "opie-bosson");
  assert.deepEqual(splitClaim("Kelsey Hannan (a2)"), { name: "Kelsey Hannan", claim: "a2" });
  assert.deepEqual(splitClaim("Opie Bosson"), { name: "Opie Bosson", claim: "" });
});

test("tally: strike rate, places and level-stakes profit", () => {
  const runs = [
    { position: 1, win_odds: 3.5, final: true },
    { position: 2, win_odds: 4, final: true },
    { position: null, win_odds: 10, final: true },
    { position: 1, win_odds: 2, final: true },
    { position: null, win_odds: 6, final: false }, // not run yet
  ];
  const t = tally(runs);
  assert.equal(t.starts, 4);
  assert.equal(t.wins, 2);
  assert.equal(t.places, 3);
  assert.equal(t.winPct, 0.5);
  assert.equal(t.pl, 2.5 + 1 - 1 - 1);
  assert.equal(t.avgWinOdds, 2.75);
  assert.equal(formString(runs.map((r) => ({ position: r.position, final: r.final }))), "1201");
});
