// Racing history in Postgres: we save every race card and result we fetch, then build
// horse, jockey and trainer form and leaderboards from it (the feed has no career stats).
import "server-only";
import { dbConfigured, q, q1 } from "@/lib/db";
import { localDayKey, shiftDay } from "@/lib/format";
import { isFinal, keyOf, tally, type Category, type RaceCard, type RunRow, type Tally } from "./core";
import { getMeetings, getRace } from "./tab";

export type PersonKind = "horse" | "jockey" | "trainer";
const COL: Record<PersonKind, { key: string; name: string }> = {
  horse: { key: "horse_key", name: "horse" },
  jockey: { key: "jockey_key", name: "jockey" },
  trainer: { key: "trainer_key", name: "trainer" },
};

/** "20261030" → "2026-10-30" */
export const isoDay = (k: string) => (k.includes("-") ? k : `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`);
export const nzToday = () => isoDay(localDayKey(new Date()));
export const nzShift = (iso: string, days: number) => isoDay(shiftDay(iso.replace(/-/g, ""), days));

// ------------------------------------------------------------------ writing

export async function saveCard(card: RaceCard, meetingDate?: string): Promise<void> {
  if (!dbConfigured() || !card.id) return;
  const final = isFinal(card);
  const date = meetingDate || (card.start ? isoDay(localDayKey(card.start)) : nzToday());
  const starters = card.runners.filter((r) => !r.scratched);
  await q(
    `INSERT INTO racing_races (id, meeting_id, meeting, date, start_at, race_no, race_name, category, country, distance, track_condition, status, field_size, final, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now())
     ON CONFLICT (id) DO UPDATE SET meeting_id=EXCLUDED.meeting_id, meeting=EXCLUDED.meeting, date=EXCLUDED.date, start_at=EXCLUDED.start_at, race_no=EXCLUDED.race_no,
       race_name=EXCLUDED.race_name, category=EXCLUDED.category, country=EXCLUDED.country, distance=EXCLUDED.distance, track_condition=EXCLUDED.track_condition,
       status=EXCLUDED.status, field_size=EXCLUDED.field_size, final=EXCLUDED.final, updated_at=now()`,
    [card.id, card.meetingId, card.meetingName, date, card.start || null, card.number, card.name, card.category, card.country, card.distance, card.trackCondition, card.status, starters.length, final],
  );
  if (!card.runners.length) return;
  const pos = new Map(card.results.map((r) => [r.number, r]));
  const cols = 17;
  const values: unknown[] = [];
  const rows = card.runners.map((r, i) => {
    const res = pos.get(r.number);
    values.push(card.id, r.number, r.name, keyOf(r.name), r.jockey, keyOf(r.jockey), r.trainer, keyOf(r.trainer), r.barrier, r.weight, r.winOdds, r.placeOdds, r.scratched, res?.position ?? null, res?.margin ?? null, r.age, r.sex);
    return `(${Array.from({ length: cols }, (_, c) => `$${i * cols + c + 1}`).join(",")})`;
  });
  await q(
    `INSERT INTO racing_runs (race_id, number, horse, horse_key, jockey, jockey_key, trainer, trainer_key, barrier, weight, win_odds, place_odds, scratched, position, margin, age, sex)
     VALUES ${rows.join(",")}
     ON CONFLICT (race_id, number) DO UPDATE SET horse=EXCLUDED.horse, horse_key=EXCLUDED.horse_key, jockey=EXCLUDED.jockey, jockey_key=EXCLUDED.jockey_key,
       trainer=EXCLUDED.trainer, trainer_key=EXCLUDED.trainer_key, barrier=EXCLUDED.barrier, weight=EXCLUDED.weight,
       win_odds=COALESCE(EXCLUDED.win_odds, racing_runs.win_odds), place_odds=COALESCE(EXCLUDED.place_odds, racing_runs.place_odds),
       scratched=EXCLUDED.scratched, position=EXCLUDED.position, margin=EXCLUDED.margin, age=EXCLUDED.age, sex=EXCLUDED.sex`,
    values,
  );
}

export interface IngestReport {
  from: string;
  to: string;
  meetings: number;
  races: number;
  saved: number;
  remaining: number;
  error?: string;
}

/**
 * Fetch and save every NZ race between two dates (inclusive). Finished races already saved are
 * skipped; upcoming fields are refreshed if older than three hours. Stops at the time budget.
 */
export async function ingestRange(from: string, to: string, budgetMs = 40_000): Promise<IngestReport> {
  const t0 = Date.now();
  const report: IngestReport = { from, to, meetings: 0, races: 0, saved: 0, remaining: 0 };
  if (!dbConfigured()) return { ...report, error: "DATABASE_URL is not set" };
  const meetings = await getMeetings(from, to);
  report.meetings = meetings.length;
  const ids = meetings.flatMap((m) => m.races.map((r) => ({ id: r.id, date: m.date, start: r.start })));
  report.races = ids.length;
  if (!ids.length) return report;
  const known = await q<{ id: string; final: boolean; fresh: boolean; status: string }>(
    `SELECT id, final, status, updated_at > now() - interval '3 hours' AS fresh FROM racing_races WHERE id = ANY($1)`,
    [ids.map((x) => x.id)],
  );
  const state = new Map(known.map((k) => [k.id, k]));
  const now = Date.now();
  const todo = ids.filter((x) => {
    const k = state.get(x.id);
    if (!k) return true;
    if (k.final || /abandon/i.test(k.status)) return false;
    const started = Date.parse(x.start) < now;
    return started || !k.fresh;
  });
  let i = 0;
  const worker = async () => {
    while (i < todo.length && Date.now() - t0 < budgetMs) {
      const x = todo[i++];
      const started = Date.parse(x.start) < now - 10 * 60_000;
      const card = await getRace(x.id, started).catch(() => null);
      if (card) {
        await saveCard(card, x.date).catch(() => {});
        report.saved++;
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  report.remaining = Math.max(0, todo.length - i);
  await q(`INSERT INTO app_state (key, value, updated_at) VALUES ('racing_ingest', $1, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [JSON.stringify(report)]).catch(() => {});
  return report;
}

/** Yesterday → tomorrow, at most once every 20 minutes per server instance. */
let lastRecent = 0;
export async function ingestRecent(): Promise<IngestReport | null> {
  if (Date.now() - lastRecent < 20 * 60_000) return null;
  lastRecent = Date.now();
  const today = nzToday();
  return ingestRange(nzShift(today, -1), nzShift(today, 1), 45_000);
}

// ------------------------------------------------------------------ reading

const runSelect = `
  SELECT x.id AS race_id, to_char(x.date, 'YYYY-MM-DD') AS date, x.start_at AS start, x.meeting, x.race_no, x.race_name, x.category, x.distance,
         x.track_condition, x.field_size, x.final, r.number, r.horse_key, r.jockey_key, r.trainer_key, r.horse, r.jockey, r.trainer, r.barrier, r.weight, r.win_odds, r.position, r.margin
  FROM racing_runs r JOIN racing_races x ON x.id = r.race_id`;

/* eslint-disable @typescript-eslint/no-explicit-any */
const toRun = (r: any): RunRow => ({
  ...r,
  start: r.start ? new Date(r.start).toISOString() : "",
  race_no: Number(r.race_no),
  number: Number(r.number),
  field_size: Number(r.field_size),
  distance: r.distance == null ? null : Number(r.distance),
  barrier: r.barrier == null ? null : Number(r.barrier),
  weight: r.weight == null ? null : Number(r.weight),
  win_odds: r.win_odds == null ? null : Number(r.win_odds),
  position: r.position == null ? null : Number(r.position),
  margin: r.margin == null ? null : Number(r.margin),
});

/** Every start for a horse / jockey / trainer, oldest first (scratchings left out). */
export async function runsFor(kind: PersonKind, key: string, days = 3650): Promise<RunRow[]> {
  if (!dbConfigured()) return [];
  const rows = await q(`${runSelect} WHERE r.${COL[kind].key} = $1 AND NOT r.scratched AND x.date >= current_date - $2::int ORDER BY x.start_at ASC NULLS LAST, x.race_no ASC`, [key, days]);
  return rows.map(toRun);
}

export interface Leader extends Tally {
  key: string;
  name: string;
  last: string;
}

export async function leaderboard(kind: Exclude<PersonKind, "horse">, days: number, category: Category | "", minStarts = 5): Promise<Leader[]> {
  if (!dbConfigured()) return [];
  const c = COL[kind];
  const rows = await q(
    `SELECT r.${c.key} AS key, max(r.${c.name}) AS name, count(*) AS starts,
            sum((r.position = 1)::int) AS wins, sum((r.position = 2)::int) AS seconds, sum((r.position = 3)::int) AS thirds,
            coalesce(sum(CASE WHEN r.win_odds > 1 THEN CASE WHEN r.position = 1 THEN r.win_odds - 1 ELSE -1 END END), 0) AS pl,
            count(*) FILTER (WHERE r.win_odds > 1) AS priced,
            avg(r.win_odds) FILTER (WHERE r.position = 1 AND r.win_odds > 1) AS avg_win_odds,
            to_char(max(x.date), 'YYYY-MM-DD') AS last
     FROM racing_runs r JOIN racing_races x ON x.id = r.race_id
     WHERE x.final AND NOT r.scratched AND r.${c.key} <> '' AND x.date >= current_date - $1::int AND ($2 = '' OR x.category = $2)
     GROUP BY r.${c.key} HAVING count(*) >= $3
     ORDER BY wins DESC, starts ASC LIMIT 150`,
    [days, category, minStarts],
  );
  return rows.map((r: any) => {
    const starts = Number(r.starts), wins = Number(r.wins), seconds = Number(r.seconds), thirds = Number(r.thirds), pl = Number(r.pl), priced = Number(r.priced);
    return {
      key: r.key,
      name: r.name,
      last: r.last,
      starts,
      wins,
      seconds,
      thirds,
      places: wins + seconds + thirds,
      winPct: starts ? wins / starts : 0,
      placePct: starts ? (wins + seconds + thirds) / starts : 0,
      pl,
      roi: priced ? pl / priced : 0,
      avgWinOdds: r.avg_win_odds == null ? null : Number(r.avg_win_odds),
    };
  });
}

/** Strike rates for a set of jockeys/trainers over the last N days (for race cards). */
export async function ratesFor(kind: Exclude<PersonKind, "horse">, keys: string[], days = 90): Promise<Map<string, Tally>> {
  const out = new Map<string, Tally>();
  if (!dbConfigured() || !keys.length) return out;
  const rows = await q(`${runSelect} WHERE r.${COL[kind].key} = ANY($1) AND NOT r.scratched AND x.final AND x.date >= current_date - $2::int`, [keys, days]);
  const by = new Map<string, RunRow[]>();
  for (const r of rows as any[]) {
    const k = kind === "jockey" ? r.jockey_key : r.trainer_key;
    by.set(k, [...(by.get(k) ?? []), toRun(r)]);
  }
  for (const [k, runs] of by) out.set(k, tally(runs));
  return out;
}

/** Last N starts for a set of horses (for race-card form). */
export async function horseHistory(keys: string[], beforeIso: string): Promise<Map<string, RunRow[]>> {
  const out = new Map<string, RunRow[]>();
  if (!dbConfigured() || !keys.length) return out;
  const rows = await q(`${runSelect} WHERE r.horse_key = ANY($1) AND NOT r.scratched AND x.final AND (x.start_at IS NULL OR x.start_at < $2) ORDER BY x.start_at ASC`, [keys, beforeIso || new Date().toISOString()]);
  for (const r of rows as any[]) {
    const k = r.horse_key;
    out.set(k, [...(out.get(k) ?? []), toRun(r)]);
  }
  return out;
}

/** Upcoming (unfinished) races for a horse / jockey / trainer, from saved fields. */
export async function upcomingFor(kind: PersonKind, keys: string[]): Promise<(RunRow & { key: string })[]> {
  if (!dbConfigured() || !keys.length) return [];
  const rows = await q(
    `${runSelect.replace("SELECT", `SELECT r.${COL[kind].key} AS key,`)} WHERE r.${COL[kind].key} = ANY($1) AND NOT r.scratched AND NOT x.final AND x.start_at > now() - interval '30 minutes' ORDER BY x.start_at ASC LIMIT 60`,
    [keys],
  );
  return rows.map((r: any) => ({ ...toRun(r), key: r.key }));
}

export async function searchNames(term: string): Promise<{ kind: PersonKind; key: string; name: string; starts: number }[]> {
  if (!dbConfigured() || term.trim().length < 2) return [];
  const like = `%${term.trim()}%`;
  const out: { kind: PersonKind; key: string; name: string; starts: number }[] = [];
  for (const kind of ["horse", "jockey", "trainer"] as const) {
    const c = COL[kind];
    const rows = await q(`SELECT ${c.key} AS key, max(${c.name}) AS name, count(*) AS starts FROM racing_runs WHERE ${c.name} ILIKE $1 AND ${c.key} <> '' GROUP BY ${c.key} ORDER BY count(*) DESC LIMIT 12`, [like]);
    out.push(...rows.map((r: any) => ({ kind, key: r.key, name: r.name, starts: Number(r.starts) })));
  }
  return out;
}

// ------------------------------------------------------------------ following

export interface Follow {
  kind: PersonKind;
  key: string;
  name: string;
}

export async function follows(userId: number): Promise<Follow[]> {
  if (!dbConfigured()) return [];
  return q<Follow & Record<string, string>>(`SELECT kind, key, name FROM racing_follows WHERE user_id = $1 ORDER BY kind, name`, [userId]);
}

export async function setFollow(userId: number, f: Follow, on: boolean): Promise<void> {
  if (!dbConfigured()) return;
  if (on) await q(`INSERT INTO racing_follows (user_id, kind, key, name) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [userId, f.kind, f.key, f.name]);
  else await q(`DELETE FROM racing_follows WHERE user_id = $1 AND kind = $2 AND key = $3`, [userId, f.kind, f.key]);
}

export async function racingDbStatus(): Promise<{ races: number; finals: number; runs: number; first: string | null; last: string | null; lastIngest: (IngestReport & { at: string }) | null } | null> {
  if (!dbConfigured()) return null;
  const r = await q1(`SELECT count(*) AS races, count(*) FILTER (WHERE final) AS finals, to_char(min(date), 'YYYY-MM-DD') AS first, to_char(max(date) FILTER (WHERE final), 'YYYY-MM-DD') AS last FROM racing_races`);
  const runs = await q1(`SELECT count(*) AS n FROM racing_runs`);
  const st = await q1(`SELECT value, updated_at FROM app_state WHERE key = 'racing_ingest'`);
  return {
    races: Number(r?.races ?? 0),
    finals: Number(r?.finals ?? 0),
    runs: Number(runs?.n ?? 0),
    first: r?.first ?? null,
    last: r?.last ?? null,
    lastIngest: st ? { ...(st.value as IngestReport), at: new Date(st.updated_at).toISOString() } : null,
  };
}

/** Winners we've recorded for a set of races (meeting pages). */
export async function winnersFor(raceIds: string[]): Promise<Map<string, { horse: string; jockey: string; win_odds: number | null }>> {
  const out = new Map<string, { horse: string; jockey: string; win_odds: number | null }>();
  if (!dbConfigured() || !raceIds.length) return out;
  const rows = await q(`SELECT race_id, horse, jockey, win_odds FROM racing_runs WHERE race_id = ANY($1) AND position = 1`, [raceIds]);
  for (const r of rows as any[]) out.set(r.race_id, { horse: r.horse, jockey: r.jockey, win_odds: r.win_odds == null ? null : Number(r.win_odds) });
  return out;
}
