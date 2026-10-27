// One entry point for every field-sport competition, whatever the feed underneath.
import "server-only";
import { notFound } from "next/navigation";
import { getComp, type CompDef } from "./comps";
import { cdCompetitions, cdFixtures, cdMatch, type CdComp } from "./cd";
import { espnContextFixtures, espnCurrentSeason, espnFixtures, espnMatch, espnStandings } from "./espnField";
import { mapLimit } from "./http";
import { aggregate, buildLadder, fitRatings, type Fixture, type LadderRow, type MatchFile, type PlayerSeason, type Ratings, type TeamSeason } from "./model";

export function requireComp(id: string): CompDef {
  const c = getComp(id);
  if (!c) notFound();
  return c;
}

async function cdSeasonMap(comp: CompDef): Promise<Map<number, CdComp[]>> {
  if (comp.source.kind !== "cd") return new Map();
  const list = await cdCompetitions(comp.source);
  const m = new Map<number, CdComp[]>();
  for (const c of list) m.set(c.season, [...(m.get(c.season) ?? []), c]);
  return m;
}

/** Seasons we can show, newest first. */
export async function getSeasons(comp: CompDef): Promise<number[]> {
  if (comp.source.kind === "cd") return [...(await cdSeasonMap(comp)).keys()].sort((a, b) => b - a).slice(0, 6);
  const cur = espnCurrentSeason(comp.source);
  return [cur, cur - 1, cur - 2, cur - 3];
}

export async function getFixtures(comp: CompDef, season: number): Promise<Fixture[]> {
  if (comp.source.kind === "cd") return cdFixtures(comp, (await cdSeasonMap(comp)).get(season) ?? []);
  return espnFixtures(comp, season);
}

/**
 * Season to open by default: the newest one with games. During an off-season that's the
 * season just finished, until the next draw is published.
 */
export async function defaultSeason(comp: CompDef): Promise<number> {
  const seasons = await getSeasons(comp);
  for (const s of seasons.slice(0, 2)) {
    const fx = await getFixtures(comp, s);
    if (fx.length) return s;
  }
  return seasons[0] ?? new Date().getFullYear();
}

export async function resolveSeason(comp: CompDef, q?: string): Promise<number> {
  const n = Number(q);
  if (n > 1990 && n < 2100) return n;
  return defaultSeason(comp);
}

export async function getMatchFile(comp: CompDef, fixture: Fixture): Promise<MatchFile | null> {
  const rv = fixture.state === "post" && Date.now() - Date.parse(fixture.date) > 6 * 3600_000 ? 24 * 3600 : fixture.state === "in" ? 20 : 300;
  return comp.source.kind === "cd" ? cdMatch(comp, fixture, rv) : espnMatch(comp, fixture, rv);
}

export async function findFixture(comp: CompDef, id: string, season?: number): Promise<Fixture | null> {
  const seasons = season ? [season] : await getSeasons(comp);
  for (const s of seasons.slice(0, 3)) {
    const f = (await getFixtures(comp, s)).find((x) => x.id === id);
    if (f) return f;
  }
  // ESPN events can be fetched directly even if the scoreboard didn't list them
  if (comp.source.kind === "espn" && comp.source.team) {
    for (const league of comp.source.leagues ?? []) {
      const stub: Fixture = { id, comp: comp.id, season: seasons[0], round: null, roundLabel: "", date: "", state: "post", status: "", venue: "", home: { id: "", name: "", abbr: "", logo: "", color: "", score: null }, away: { id: "", name: "", abbr: "", logo: "", color: "", score: null }, winnerId: null, final: false, ref: `${league}/${id}` };
      const m = await espnMatch(comp, stub, 300);
      if (m?.fixture.home.id) return m.fixture;
    }
    return null;
  }
  if (comp.source.kind === "espn") {
    const stub: Fixture = { id, comp: comp.id, season: seasons[0], round: null, roundLabel: "", date: "", state: "post", status: "", venue: "", home: { id: "", name: "", abbr: "", logo: "", color: "", score: null }, away: { id: "", name: "", abbr: "", logo: "", color: "", score: null }, winnerId: null, final: false, ref: id };
    const m = await espnMatch(comp, stub, 300);
    return m?.fixture.home.id ? m.fixture : null;
  }
  return null;
}

// ---------------------------------------------------------------------------- season book

export interface SeasonBook {
  comp: CompDef;
  season: number;
  fixtures: Fixture[];
  files: MatchFile[];
  players: PlayerSeason[];
  teams: TeamSeason[];
  ratings: Ratings;
  ladder: LadderRow[];
  ladderSource: "official" | "computed";
  teamSides: Map<string, Fixture["home"]>;
  /** National teams: every international in the same leagues (opponents' form). */
  context?: Fixture[];
}

const books = new Map<string, { at: number; book: Promise<SeasonBook> }>();
const TTL = 10 * 60_000;

async function buildBook(comp: CompDef, season: number, withFiles: boolean): Promise<SeasonBook> {
  const fixtures = await getFixtures(comp, season);
  const done = fixtures.filter((f) => f.state === "post");
  const files = withFiles ? (await mapLimit(done, 8, (f) => getMatchFile(comp, f))).filter((m): m is MatchFile => Boolean(m)) : [];
  const { players, teams } = aggregate(files);
  // Early in a season, lean on last season's results (at reduced weight) so two or three
  // games don't swing everything; the weight fades as this season's games pile up.
  const teamCount = new Set(fixtures.flatMap((f) => [f.home.id, f.away.id])).size || 1;
  const gamesEach = (2 * done.length) / teamCount;
  const prevWeight = Math.max(0, 0.5 * (1 - gamesEach / 8));
  const prev = prevWeight > 0 ? await getFixtures(comp, season - 1).catch(() => [] as Fixture[]) : [];
  const ids = new Set(fixtures.flatMap((f) => [f.home.id, f.away.id]));
  const prevUsable = prev.filter((f) => ids.has(f.home.id) && ids.has(f.away.id));
  const current = new Set(fixtures.map((f) => f.id));
  let context: Fixture[] | undefined;
  let ratings = fitRatings([...fixtures, ...prevUsable], 4, (f) => (current.has(f.id) ? 1 : prevWeight));
  if (comp.source.kind === "espn" && comp.source.team) {
    // A national team: rate everyone from all internationals this year and last (last year at half weight)
    const [ctx, ctxPrev] = await Promise.all([espnContextFixtures(comp, season), espnContextFixtures(comp, season - 1).catch(() => [] as Fixture[])]);
    const now = new Set(ctx.map((f) => f.id));
    ratings = fitRatings([...ctx, ...ctxPrev], 4, (f) => (now.has(f.id) ? 1 : 0.5));
    context = [...ctx, ...ctxPrev];
  }
  let ladder = buildLadder(fixtures, comp.points);
  let ladderSource: SeasonBook["ladderSource"] = "computed";
  if (comp.source.kind === "espn") {
    const off = await espnStandings(comp, season);
    if (off?.length) {
      const form = new Map(ladder.map((r) => [r.teamId, r]));
      ladder = off.map((r) => ({ ...r, form: form.get(r.teamId)?.form ?? [], homeRec: form.get(r.teamId)?.homeRec ?? "", awayRec: form.get(r.teamId)?.awayRec ?? "", team: { ...r.team, logo: r.team.logo || form.get(r.teamId)?.team.logo || "" } }));
      ladderSource = "official";
    }
  }
  const teamSides = new Map<string, Fixture["home"]>();
  for (const f of fixtures) for (const s of [f.home, f.away]) if (!teamSides.has(s.id) || s.logo) teamSides.set(s.id, { ...s, score: null });
  return { comp, season, fixtures, files, players, teams, ratings, ladder, ladderSource, teamSides, context };
}

/**
 * Everything for a season. `withFiles` pulls every completed match file for player and team
 * season stats (finished matches are cached for a day); without it only fixtures/ladder.
 */
export function getSeasonBook(comp: CompDef, season: number, withFiles = true): Promise<SeasonBook> {
  const key = `${comp.id}:${season}:${withFiles ? 1 : 0}`;
  const hit = books.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.book;
  const book = buildBook(comp, season, withFiles);
  books.set(key, { at: Date.now(), book });
  book.catch(() => books.delete(key));
  return book;
}

/** Current/next round of a season (first round with an unfinished game, else the last). */
export function currentRound(fixtures: Fixture[]): string | null {
  const live = fixtures.find((f) => f.state === "in");
  if (live) return roundKey(live);
  const next = fixtures.find((f) => f.state === "pre");
  if (next) {
    const last = [...fixtures].reverse().find((f) => f.state === "post");
    // Show the round that just finished for a day after its last game
    if (last && roundKey(last) !== roundKey(next) && Date.now() - Date.parse(last.date) < 20 * 3600_000) return roundKey(last);
    return roundKey(next);
  }
  const last = fixtures[fixtures.length - 1];
  return last ? roundKey(last) : null;
}

export const roundKey = (f: Fixture) => (f.final ? `F:${f.roundLabel}` : `R:${f.round ?? 0}`);

export function rounds(fixtures: Fixture[]): { key: string; label: string; short: string }[] {
  const seen = new Map<string, { key: string; label: string; short: string }>();
  for (const f of fixtures) {
    const k = roundKey(f);
    if (!seen.has(k)) seen.set(k, { key: k, label: f.roundLabel || (f.final ? "Finals" : "Round"), short: f.final ? shortFinal(f.roundLabel) : String(f.round ?? "") });
  }
  return [...seen.values()];
}

const shortFinal = (l: string) =>
  /grand/i.test(l) ? "GF" : /prelim/i.test(l) ? "PF" : /semi/i.test(l) ? "SF" : /elim/i.test(l) ? "EF" : /qualif/i.test(l) ? "QF" : /quarter/i.test(l) ? "QF" : "F";
