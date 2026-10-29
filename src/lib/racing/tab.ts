// Live racing data: Entain's Affiliates API. TAB NZ first (NZ meetings, NZ tote dividends);
// the identical Ladbrokes feed is the fallback if TAB NZ is unreachable.
import "server-only";
import { site } from "@/site.config";
import { parseMeetings, parseRace, type Category, type Meeting, type RaceCard } from "./core";

const BASES = (process.env.RACING_API_BASES || "https://api.tab.co.nz/affiliates/v1,https://api.ladbrokes.com.au/affiliates/v1")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

// The feed asks partners to identify themselves; requests without these may be rate-limited.
const HEADERS: Record<string, string> = {
  Accept: "application/json",
  From: site.supportEmail,
  "X-Partner": site.name,
  "User-Agent": `${site.name} (${site.url})`,
  ...(process.env.RACING_PARTNER_ID ? { "X-Partner-ID": process.env.RACING_PARTNER_ID } : {}),
};

export interface FetchInfo {
  ok: boolean;
  base?: string;
  status?: number;
  error?: string;
}
export const lastFetch: FetchInfo = { ok: false };

/* eslint-disable @typescript-eslint/no-explicit-any */
async function get(path: string, revalidate: number): Promise<any | null> {
  for (const base of BASES) {
    try {
      const res = await fetch(`${base}${path}`, { headers: HEADERS, next: { revalidate }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        Object.assign(lastFetch, { ok: false, base, status: res.status, error: `HTTP ${res.status}` });
        continue;
      }
      const j = await res.json();
      Object.assign(lastFetch, { ok: true, base, status: res.status, error: undefined });
      return j;
    } catch (e) {
      Object.assign(lastFetch, { ok: false, base, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return null;
}

/** NZ meetings between two dates (inclusive, YYYY-MM-DD), horses only by default. */
export async function getMeetings(from: string, to: string, opts: { country?: string; categories?: Category[] } = {}): Promise<Meeting[]> {
  const country = opts.country ?? "NZ";
  const cats = opts.categories ?? ["T", "H"];
  const today = new Date().toISOString().slice(0, 10);
  const rv = to < today ? 6 * 3600 : 300;
  const lists = await Promise.all(
    cats.map(async (c) => {
      const out: Meeting[] = [];
      for (let offset = 0; offset < 1000; offset += 200) {
        const j = await get(`/racing/meetings?date_from=${from}&date_to=${to}&country=${country}&category=${c}&limit=200&offset=${offset}`, rv);
        const page = parseMeetings(j);
        out.push(...page);
        if (page.length < 200) break;
      }
      return out;
    }),
  );
  const seen = new Set<string>();
  return lists
    .flat()
    .filter((m) => !seen.has(m.id) && seen.add(m.id) && (!opts.country || !m.country || m.country.toUpperCase().startsWith(country.slice(0, 2))))
    .sort((a, b) => (a.races[0]?.start ?? "").localeCompare(b.races[0]?.start ?? ""));
}

export async function getMeeting(id: string): Promise<Meeting | null> {
  const j = await get(`/racing/meetings/${encodeURIComponent(id)}`, 300);
  return parseMeetings(j)[0] ?? null;
}

/** One race: field, odds, results and dividends. Finished races are cached for a day. */
export async function getRace(id: string, finished = false): Promise<RaceCard | null> {
  const j = await get(`/racing/events/${encodeURIComponent(id)}`, finished ? 24 * 3600 : 45);
  return parseRace(j);
}
