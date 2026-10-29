// Horse racing: pure parsing and maths for the Entain "Affiliates API" (TAB NZ, Ladbrokes),
// shared by server code and tests. No I/O here.

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

export type Category = "T" | "H" | "G";
export const CATEGORY_LABEL: Record<Category, string> = { T: "Thoroughbred", H: "Harness", G: "Greyhound" };

export interface RaceSummary {
  id: string;
  number: number;
  name: string;
  start: string; // ISO UTC
  distance: number | null;
  trackCondition: string;
  weather: string;
  status: string;
}

export interface Meeting {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD (meeting's own date)
  category: Category;
  country: string;
  state: string;
  races: RaceSummary[];
}

export interface Runner {
  number: number;
  name: string;
  barrier: number | null;
  jockey: string;
  claim: string; // apprentice claim, e.g. "a2"
  trainer: string;
  weight: number | null;
  age: number | null;
  sex: string;
  colour: string;
  scratched: boolean;
  formComment: string;
  form: string; // last-starts string when the feed has one
  prizeMoney: number | null;
  classLevel: string;
  winOdds: number | null;
  placeOdds: number | null;
  flucs: number[];
  favourite: boolean;
  mover: boolean;
}

export interface Result {
  position: number;
  number: number;
  name: string;
  margin: number | null;
}

export interface Dividend {
  product: string;
  tote: string;
  status: string;
  dividend: number | null;
  pool: number | null;
  positions: { number: number; position: number }[];
}

export interface RaceCard {
  id: string;
  meetingId: string;
  meetingName: string;
  number: number;
  name: string;
  start: string; // ISO UTC
  status: string; // Open | Closed | Live | Interim | Final | Abandoned
  category: Category;
  country: string;
  state: string;
  distance: number | null;
  trackCondition: string;
  weather: string;
  comment: string;
  silkUrl: string;
  runners: Runner[];
  results: Result[];
  dividends: Dividend[];
}

// ------------------------------------------------------------------ helpers

export const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown) => (v == null ? "" : String(v).trim());
const toIso = (v: unknown): string => {
  if (v == null || v === "") return "";
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v).toISOString();
  const s = String(v).replace(" +0000 UTC", "Z").replace(/ UTC$/, "Z").replace(" ", "T");
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : "";
};
const cat = (v: unknown): Category => (["T", "H", "G"].includes(String(v).toUpperCase()) ? (String(v).toUpperCase() as Category) : "T");

/** Payloads come as {data: {...}} (JSON) — tolerate a bare body too. */
const body = (j: J) => j?.data ?? j ?? {};

// ------------------------------------------------------------------ names & keys

/** "Joe Bloggs (a2)" → { name: "Joe Bloggs", claim: "a2" } */
export function splitClaim(raw: string): { name: string; claim: string } {
  const m = raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? { name: m[1].trim(), claim: m[2].trim() } : { name: raw.trim(), claim: "" };
}

/** Stable key for a horse/person across races: upper-case letters and digits only. */
export const keyOf = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\((NZ|AUS|AU|GB|IRE|FR|USA|JPN|GER|ARG|CHI|SAF)\)/g, "")
    .replace(/[^A-Z0-9]/g, "");

/** URL slug that maps back to the key ("Bella Nipotina" → "bella-nipotina"). */
export const slugOf = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\((nz|aus|au|gb|ire|fr|usa|jpn|ger|arg|chi|saf)\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const keyFromSlug = (slug: string) => decodeURIComponent(slug).toUpperCase().replace(/[^A-Z0-9]/g, "");

// ------------------------------------------------------------------ parsing

export function parseMeetings(j: J): Meeting[] {
  const list: J[] = body(j)?.meetings ?? [];
  return list
    .map((m) => ({
      id: str(m.meeting ?? m.id),
      name: str(m.name),
      date: str(m.date).slice(0, 10),
      category: cat(m.category ?? m.type),
      country: str(m.country),
      state: str(m.state),
      races: ((m.races ?? []) as J[])
        .map((r) => ({
          id: str(r.id ?? r.event_id),
          number: num(r.race_number ?? r.number) ?? 0,
          name: str(r.name ?? r.description),
          start: toIso(r.start_time ?? r.advertised_start),
          distance: num(r.distance),
          trackCondition: str(r.track_condition),
          weather: str(r.weather),
          status: str(r.status),
        }))
        .filter((r) => r.id && r.number > 0)
        .sort((a, b) => a.number - b.number),
    }))
    .filter((m) => m.id && m.races.length);
}

function parseRunner(r: J): Runner {
  const jk = splitClaim(str(r.jockey));
  const meta: Record<string, string> = r.meta ?? {};
  const formKey = Object.keys(meta).find((k) => /last.*start|^form$|recent/i.test(k));
  const odds = r.odds ?? {};
  return {
    number: num(r.runner_number) ?? 0,
    name: str(r.name),
    barrier: num(r.barrier),
    jockey: jk.name,
    claim: jk.claim,
    trainer: str(r.trainer_name ?? r.trainer),
    weight: num(r.weight?.total ?? r.weight?.allocated ?? r.weight),
    age: num(r.age),
    sex: str(r.sex),
    colour: str(r.colour),
    scratched: Boolean(r.is_scratched || r.scr_time || r.scratch_time),
    formComment: str(r.form_comment),
    form: formKey ? str(meta[formKey]) : str(r.last_twenty_starts ?? r.form ?? ""),
    prizeMoney: num(r.prize_money),
    classLevel: str(r.class_level),
    winOdds: num(odds.fixed_win) || null,
    placeOdds: num(odds.fixed_place) || null,
    flucs: ((r.flucs ?? []) as unknown[]).map(num).filter((v): v is number => v != null && v > 1),
    favourite: Boolean(r.favourite),
    mover: Boolean(r.mover),
  };
}

export function parseRace(j: J): RaceCard | null {
  const d = body(j);
  const r = d?.race;
  if (!r) return null;
  const runners = ((d.runners ?? []) as J[]).map(parseRunner).filter((x) => x.number > 0);
  const favNo = num(d.favourite?.runner_number);
  const moverNo = num(d.mover?.runner_number);
  for (const x of runners) {
    if (favNo != null && x.number === favNo) x.favourite = true;
    if (moverNo != null && x.number === moverNo) x.mover = true;
  }
  return {
    id: str(r.event_id ?? r.id),
    meetingId: str(r.meeting_id),
    meetingName: str(r.meeting_name),
    number: num(r.race_number) ?? 0,
    name: str(r.description ?? r.name),
    start: toIso(r.advertised_start ?? r.advertised_start_string ?? r.start_time),
    status: str(r.status),
    category: cat(r.type ?? r.category),
    country: str(r.country),
    state: str(r.state),
    distance: num(r.distance),
    trackCondition: str(r.track_condition),
    weather: str(r.weather),
    comment: str(r.comment ?? r.form_guide),
    silkUrl: str(r.silk_url),
    runners: runners.sort((a, b) => a.number - b.number),
    results: ((d.results ?? []) as J[])
      .map((x) => ({ position: num(x.position) ?? 0, number: num(x.runner_number) ?? 0, name: str(x.name), margin: num(x.margin_length) }))
      .filter((x) => x.position > 0)
      .sort((a, b) => a.position - b.position),
    dividends: ((d.dividends ?? []) as J[]).map((x) => ({
      product: str(x.product_name),
      tote: str(x.tote),
      status: str(x.status),
      dividend: num(x.dividend),
      pool: num(x.pool_size),
      positions: ((x.positions ?? []) as J[]).map((p) => ({ number: num(p.runner_number) ?? 0, position: num(p.position) ?? 0 })),
    })),
  };
}

export const isFinal = (r: Pick<RaceCard, "status" | "results">) => /final|interim|paying|closed/i.test(r.status) && r.results.length > 0;
export const isAbandoned = (r: Pick<RaceCard, "status">) => /abandon/i.test(r.status);

// ------------------------------------------------------------------ market maths

/** Places the TAB pays on a field of n starters (NZ rules: 8+ three places, 5–7 two, fewer none). */
export const placesPaid = (starters: number) => (starters >= 8 ? 3 : starters >= 5 ? 2 : 0);

/** Win and place chances implied by fixed odds with the bookmaker's margin removed. */
export function marketChances(runners: Pick<Runner, "number" | "scratched" | "winOdds" | "placeOdds">[]) {
  const live = runners.filter((r) => !r.scratched);
  const wSum = live.reduce((s, r) => s + (r.winOdds && r.winOdds > 1 ? 1 / r.winOdds : 0), 0);
  const places = placesPaid(live.length);
  const pSum = live.reduce((s, r) => s + (r.placeOdds && r.placeOdds > 1 ? 1 / r.placeOdds : 0), 0);
  const out = new Map<number, { win: number | null; place: number | null; overround: number }>();
  for (const r of live) {
    const win = wSum > 0 && r.winOdds && r.winOdds > 1 ? 1 / r.winOdds / wSum : null;
    const place = places && pSum > 0 && r.placeOdds && r.placeOdds > 1 ? Math.min(0.97, ((1 / r.placeOdds) / pSum) * places) : null;
    out.set(r.number, { win, place, overround: wSum });
  }
  return out;
}

// ------------------------------------------------------------------ stats

export interface RunRow {
  horse_key?: string;
  jockey_key?: string;
  trainer_key?: string;
  race_id: string;
  date: string;
  start: string;
  meeting: string;
  race_no: number;
  race_name: string;
  category: Category;
  distance: number | null;
  track_condition: string;
  field_size: number;
  number: number;
  horse: string;
  jockey: string;
  trainer: string;
  barrier: number | null;
  weight: number | null;
  win_odds: number | null;
  position: number | null; // null = unplaced / not in the results
  margin: number | null;
  final: boolean;
}

export interface Tally {
  starts: number;
  wins: number;
  seconds: number;
  thirds: number;
  places: number; // top 3
  winPct: number;
  placePct: number;
  /** Profit/loss betting $1 to win on every start at the fixed price we recorded. */
  pl: number;
  roi: number;
  avgWinOdds: number | null;
}

export function tally(runs: Pick<RunRow, "position" | "win_odds" | "final">[]): Tally {
  const done = runs.filter((r) => r.final);
  let wins = 0, seconds = 0, thirds = 0, pl = 0, priced = 0, winOddsSum = 0;
  for (const r of done) {
    if (r.position === 1) wins++;
    else if (r.position === 2) seconds++;
    else if (r.position === 3) thirds++;
    if (r.win_odds && r.win_odds > 1) {
      priced++;
      if (r.position === 1) (pl += r.win_odds - 1), (winOddsSum += r.win_odds);
      else pl -= 1;
    }
  }
  const starts = done.length;
  const places = wins + seconds + thirds;
  return {
    starts,
    wins,
    seconds,
    thirds,
    places,
    winPct: starts ? wins / starts : 0,
    placePct: starts ? places / starts : 0,
    pl,
    roi: priced ? pl / priced : 0,
    avgWinOdds: wins && winOddsSum ? winOddsSum / wins : null,
  };
}

/** "x13x2" style last-starts string from runs (most recent last), 0 = unplaced (10th+ or unknown). */
export const formString = (runs: Pick<RunRow, "position" | "final">[], n = 6) =>
  runs
    .filter((r) => r.final)
    .slice(-n)
    .map((r) => (r.position && r.position < 10 ? String(r.position) : "0"))
    .join("");
