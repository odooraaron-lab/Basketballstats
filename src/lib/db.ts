// Postgres access. Uses Neon's HTTP driver for Neon URLs (fast on Vercel, no pooling needed)
// and node-postgres for anything else (local development, other hosts).
import "server-only";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Runner = (text: string, params?: unknown[]) => Promise<Row[]>;

let runner: Runner | null = null;

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

function getRunner(): Runner {
  if (runner) return runner;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (/neon\.tech/.test(url)) {
    const sql = neon(url);
    runner = async (text, params = []) => (await sql.query(text, params as any[])) as Row[];
  } else {
    const pool = new Pool({ connectionString: url, max: 5 });
    runner = async (text, params = []) => (await pool.query(text, params as any[])).rows;
  }
  return runner;
}

/** Parameterised query ($1, $2 …). */
export async function q<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  return (await getRunner()(text, params)) as T[];
}

export async function q1<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await q<T>(text, params))[0] ?? null;
}

// Each statement is safe to run repeatedly, so the site creates and upgrades its own tables.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id                   SERIAL PRIMARY KEY,
     email                TEXT UNIQUE NOT NULL,
     password_hash        TEXT NOT NULL,
     name                 TEXT NOT NULL DEFAULT '',
     role                 TEXT NOT NULL DEFAULT 'member',
     created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
     last_login_at        TIMESTAMPTZ,
     stripe_customer_id   TEXT,
     subscription_id      TEXT,
     sub_status           TEXT NOT NULL DEFAULT 'none',
     current_period_end   TIMESTAMPTZ,
     cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
     comp_until           TIMESTAMPTZ,
     prefs                JSONB NOT NULL DEFAULT '{}'::jsonb,
     signup_meta          JSONB NOT NULL DEFAULT '{}'::jsonb,
     session_version      INTEGER NOT NULL DEFAULT 1
   )`,
  `CREATE INDEX IF NOT EXISTS users_created_idx ON users (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS users_customer_idx ON users (stripe_customer_id)`,
  `CREATE TABLE IF NOT EXISTS page_views (
     id         BIGSERIAL PRIMARY KEY,
     at         TIMESTAMPTZ NOT NULL DEFAULT now(),
     path       TEXT NOT NULL,
     referrer   TEXT NOT NULL DEFAULT '',
     visitor    TEXT NOT NULL DEFAULT '',
     user_id    INTEGER,
     utm_source TEXT NOT NULL DEFAULT '',
     country    TEXT NOT NULL DEFAULT '',
     device     TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE INDEX IF NOT EXISTS page_views_at_idx ON page_views (at DESC)`,
  `CREATE TABLE IF NOT EXISTS events (
     id      BIGSERIAL PRIMARY KEY,
     at      TIMESTAMPTZ NOT NULL DEFAULT now(),
     user_id INTEGER,
     type    TEXT NOT NULL,
     meta    JSONB NOT NULL DEFAULT '{}'::jsonb
   )`,
  `CREATE INDEX IF NOT EXISTS events_at_idx ON events (at DESC)`,
  `CREATE TABLE IF NOT EXISTS password_resets (
     token_hash TEXT PRIMARY KEY,
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at TIMESTAMPTZ NOT NULL,
     used_at    TIMESTAMPTZ
   )`,
  // Horse racing history: every race card and result we've seen, for horse/jockey/trainer stats
  `CREATE TABLE IF NOT EXISTS racing_races (
     id              TEXT PRIMARY KEY,
     meeting_id      TEXT NOT NULL DEFAULT '',
     meeting         TEXT NOT NULL DEFAULT '',
     date            DATE NOT NULL,
     start_at        TIMESTAMPTZ,
     race_no         INTEGER NOT NULL DEFAULT 0,
     race_name       TEXT NOT NULL DEFAULT '',
     category        TEXT NOT NULL DEFAULT 'T',
     country         TEXT NOT NULL DEFAULT '',
     distance        INTEGER,
     track_condition TEXT NOT NULL DEFAULT '',
     status          TEXT NOT NULL DEFAULT '',
     field_size      INTEGER NOT NULL DEFAULT 0,
     final           BOOLEAN NOT NULL DEFAULT FALSE,
     updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS racing_races_date_idx ON racing_races (date DESC)`,
  `CREATE TABLE IF NOT EXISTS racing_runs (
     race_id     TEXT NOT NULL REFERENCES racing_races(id) ON DELETE CASCADE,
     number      INTEGER NOT NULL,
     horse       TEXT NOT NULL,
     horse_key   TEXT NOT NULL,
     jockey      TEXT NOT NULL DEFAULT '',
     jockey_key  TEXT NOT NULL DEFAULT '',
     trainer     TEXT NOT NULL DEFAULT '',
     trainer_key TEXT NOT NULL DEFAULT '',
     barrier     INTEGER,
     weight      REAL,
     win_odds    REAL,
     place_odds  REAL,
     scratched   BOOLEAN NOT NULL DEFAULT FALSE,
     position    INTEGER,
     margin      REAL,
     age         INTEGER,
     sex         TEXT NOT NULL DEFAULT '',
     PRIMARY KEY (race_id, number)
   )`,
  `CREATE INDEX IF NOT EXISTS racing_runs_horse_idx ON racing_runs (horse_key)`,
  `CREATE INDEX IF NOT EXISTS racing_runs_jockey_idx ON racing_runs (jockey_key)`,
  `CREATE INDEX IF NOT EXISTS racing_runs_trainer_idx ON racing_runs (trainer_key)`,
  `CREATE TABLE IF NOT EXISTS racing_follows (
     user_id    INTEGER NOT NULL,
     kind       TEXT NOT NULL,
     key        TEXT NOT NULL,
     name       TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (user_id, kind, key)
   )`,
  `CREATE TABLE IF NOT EXISTS app_state (
     key        TEXT PRIMARY KEY,
     value      JSONB NOT NULL DEFAULT '{}'::jsonb,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
];

let ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  ready ??= (async () => {
    const run = getRunner();
    for (const s of SCHEMA) await run(s);
  })().catch((e) => {
    ready = null; // retry next request
    throw e;
  });
  return ready;
}

/** Fire-and-forget analytics/event write; never breaks the request. */
export async function logEvent(type: string, userId: number | null, meta: Record<string, unknown> = {}) {
  if (!dbConfigured()) return;
  try {
    await q(`INSERT INTO events (type, user_id, meta) VALUES ($1, $2, $3)`, [type, userId, JSON.stringify(meta)]);
  } catch {
    /* analytics must never break a request */
  }
}
