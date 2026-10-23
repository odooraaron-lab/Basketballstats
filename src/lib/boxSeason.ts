// Fetch layer for box-score season aggregates (leagues with provider.seasonStats = "boxscores").
// Finds every completed game of a season through the teams' schedules, pulls each box
// score once (completed games never change, so they're cached for a day), and folds them
// into a SeasonBook. The book itself is memoised per server instance for a few minutes.
import type { League } from "@/leagues/types";
import { buildSeasonBook, type SeasonBook } from "./boxSeasonCore";
import { getGameSummary, getTeamSchedule, getTeams, seasonLabel } from "./espn";
import type { GameSummary } from "./model";

const BOOK_TTL_MS = 10 * 60 * 1000;
const FINAL_GAME_REVALIDATE = 24 * 3600;
const CONCURRENCY = 6;

const books = new Map<string, { at: number; book: Promise<SeasonBook> }>();

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

/** Every completed game id for a season + season type (2 regular, 3 playoffs). */
export async function completedGameIds(l: League, year: number, seasonType: number): Promise<string[]> {
  const teams = await getTeams(l);
  const schedules = await Promise.all(teams.map((t) => getTeamSchedule(l, t.id, year, seasonType)));
  const ids = new Set<string>();
  for (const g of schedules.flat()) {
    if (g.state !== "post") continue;
    if (g.seasonType && g.seasonType !== seasonType) continue;
    ids.add(g.id);
  }
  return [...ids];
}

async function build(l: League, year: number, seasonType: number): Promise<SeasonBook> {
  const ids = await completedGameIds(l, year, seasonType);
  // Only the box score is needed here — drop play-by-play right away to keep memory low.
  const games = (
    await mapLimit(ids, CONCURRENCY, async (id): Promise<GameSummary | null> => {
      const g = await getGameSummary(l, id, FINAL_GAME_REVALIDATE);
      return g ? { ...g, plays: [], winProb: [] } : null;
    })
  ).filter((g): g is GameSummary => Boolean(g));
  // The schedule already scoped these to the season type; games whose box score isn't
  // published yet are skipped inside buildSeasonBook.
  return buildSeasonBook(
    games.map((g) => ({ ...g, card: { ...g.card, seasonType } })),
    { year, seasonType, label: seasonLabel(year) + (seasonType === 3 ? " Playoffs" : "") },
  );
}

/** Season book for a league/season/type, built once and reused for BOOK_TTL_MS. */
export function getSeasonBook(l: League, year: number, seasonType = 2): Promise<SeasonBook> {
  const key = `${l.id}:${year}:${seasonType}`;
  const hit = books.get(key);
  if (hit && Date.now() - hit.at < BOOK_TTL_MS) return hit.book;
  const book = build(l, year, seasonType).catch((e) => {
    books.delete(key);
    throw e;
  });
  books.set(key, { at: Date.now(), book });
  return book;
}
