// Odds-check logic: parse a betting screen and compare its prices with player history.
// Pure (no I/O) so it runs in the browser, on the server and in tests.

export type Market = "pts" | "reb" | "ast" | "tpm" | "pra";
export const MARKET_LABEL: Record<Market, string> = { pts: "Points", reb: "Rebounds", ast: "Assists", tpm: "3-pointers", pra: "Pts+Reb+Ast" };

export interface SlipRow {
  name: string;
  line: number;
  over: number | null; // decimal odds
  under: number | null;
  recent: number[]; // as shown on the screenshot, oldest → newest if known
  market?: Market;
}

// ---------------------------------------------------------------------------- OCR text parsing

const ODDS_RE = /\b(\d{1,2}\.\d{2})\b/g;
const LINE_RE = /\b[O0Uu]\s?(\d{1,2}(?:\.5)?)\b/g;

function looksLikeName(line: string) {
  const t = line.replace(/[^A-Za-z.'\- ]/g, " ").replace(/\s+/g, " ").trim();
  const words = t.split(" ").filter((w) => /^[A-Z][a-zA-Z.'\-]{1,}$/.test(w));
  return words.length >= 2 && !/\b(Over|Under|Points|Rebounds|Assists|Odds|Bet|Multi)\b/i.test(t) && !/\d{2}\.\d/.test(line) ? words.join(" ") : null;
}

/**
 * Best-effort parse of OCR text from a player-props screen:
 *   Name / recent "14 ▸ 7 ▸ 25 ▸ 11 ▸ 15" / "O 21.5  U 21.5" / "1.87  1.87"
 */
export function parseOcrText(text: string): SlipRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: SlipRow[] = [];
  let cur: SlipRow | null = null;
  const flush = () => {
    if (cur && cur.line > 0 && (cur.over != null || cur.under != null)) rows.push(cur);
    cur = null;
  };
  for (const raw of lines) {
    const name = looksLikeName(raw);
    if (name && !/\d\.\d\d/.test(raw)) {
      // A name can share a line with its recent numbers ("Caleb Wilson 16")
      flush();
      cur = { name, line: 0, over: null, under: null, recent: [] };
      const nums = raw.replace(name, "").match(/\b\d{1,2}\b/g);
      if (nums) cur.recent.push(...nums.map(Number));
      continue;
    }
    if (!cur) continue;
    const lineMatches = [...raw.matchAll(LINE_RE)].map((m) => Number(m[1]));
    if (lineMatches.length && !cur.line) {
      cur.line = lineMatches[0];
      continue;
    }
    const odds = [...raw.matchAll(ODDS_RE)].map((m) => Number(m[1])).filter((x) => x >= 1.01 && x <= 30);
    if (odds.length && cur.line) {
      if (cur.over == null) cur.over = odds[0];
      if (odds.length > 1 && cur.under == null) cur.under = odds[1];
      else if (cur.over != null && cur.under == null && odds[0] !== cur.over) cur.under = odds[0];
      continue;
    }
    // Recent results row: several small integers, possibly separated by arrows/odd glyphs
    if (!cur.line && !cur.recent.length) {
      const ints = raw.match(/\b\d{1,2}\b/g);
      if (ints && ints.length >= 2 && !/%/.test(raw)) cur.recent = ints.map(Number);
    }
  }
  flush();
  return rows;
}

// ---------------------------------------------------------------------------- pricing

/** Standard normal CDF. */
export function phi(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/** Bookmaker's implied chances with the margin ("vig") removed. */
export function noVig(over: number | null, under: number | null): { over: number | null; under: number | null; margin: number | null } {
  if (over && under) {
    const a = 1 / over;
    const b = 1 / under;
    return { over: a / (a + b), under: b / (a + b), margin: a + b - 1 };
  }
  if (over) return { over: Math.min(0.99, 1 / over / 1.05), under: null, margin: null };
  if (under) return { over: null, under: Math.min(0.99, 1 / under / 1.05), margin: null };
  return { over: null, under: null, margin: null };
}

export interface Verdict {
  pick: "over" | "under" | null;
  strength: "strong" | "lean" | "pass";
  pOver: number; // our estimate
  bookOver: number | null; // bookmaker, no-vig
  edge: number | null; // our chance − book chance, for the picked side
  ev: number | null; // expected return per $1 on the picked side
  hits: number;
  n: number;
  avg: number | null;
  mean: number;
  reasons: string[];
}

/**
 * Chance of going over a half-point line: blend a normal model (60%) with the player's
 * recent hit rate shrunk toward the model (40%), then compare with the no-vig price.
 */
export function judge(row: SlipRow, mean: number, sd: number, history: number[], seasonAvg: number | null): Verdict {
  const L = row.line;
  const model = 1 - phi((L - mean) / Math.max(0.8, sd));
  const n = history.length;
  const hits = history.filter((v) => v > L).length;
  const hist = n ? (hits + 2 * model) / (n + 2) : model;
  const pOver = Math.min(0.97, Math.max(0.03, n >= 3 ? 0.6 * model + 0.4 * hist : model));
  const book = noVig(row.over, row.under);
  const edgeOver = book.over != null ? pOver - book.over : null;
  const edgeUnder = book.under != null ? 1 - pOver - book.under : null;

  let pick: Verdict["pick"] = null;
  let edge: number | null = null;
  if (edgeOver != null || edgeUnder != null) {
    if ((edgeOver ?? -1) >= (edgeUnder ?? -1)) {
      pick = "over";
      edge = edgeOver;
    } else {
      pick = "under";
      edge = edgeUnder;
    }
  }
  const odds = pick === "over" ? row.over : pick === "under" ? row.under : null;
  const pSide = pick === "over" ? pOver : 1 - pOver;
  const ev = odds ? pSide * odds - 1 : null;
  const histAgrees = n >= 5 && (pick === "over" ? hits / n >= 0.7 : pick === "under" ? hits / n <= 0.3 : false);
  const strength: Verdict["strength"] = edge != null && edge >= 0.08 && histAgrees ? "strong" : edge != null && edge >= 0.04 ? "lean" : "pass";
  if (strength === "pass") pick = edge != null && edge >= 0.02 ? pick : null;

  const reasons: string[] = [];
  if (n) reasons.push(`Over ${L} in ${hits} of last ${n}`);
  if (seasonAvg != null) reasons.push(`Season avg ${seasonAvg.toFixed(1)}`);
  reasons.push(`Projection ${mean.toFixed(1)}`);
  if (book.over != null) reasons.push(`Book implies ${(book.over * 100).toFixed(0)}% over (margin removed)`);
  if (n >= 5 && hits === n) reasons.push(`Cleared it every game`);
  if (n >= 5 && hits === 0) reasons.push(`Hasn't cleared it once`);
  if (Math.abs(mean - L) >= 0.25 * Math.max(L, 4)) reasons.push(`Line is ${mean > L ? "well below" : "well above"} his projection`);

  return { pick, strength, pOver, bookOver: book.over, edge, ev, hits, n, avg: seasonAvg, mean, reasons };
}
