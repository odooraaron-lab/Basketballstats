import "server-only";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type J = any;

// Next's data cache refuses anything over 2MB, so whole-season scoreboards (a Rugby World Cup,
// a full A-League year: 2.4–2.8MB) were refetched from ESPN on every request. Those big replies
// are kept in this server's memory instead, for the same revalidate time.
const BIG = 1_900_000;
const MAX_BIG = 8;
const big = new Map<string, { exp: number; data: J }>();
const bigUrls = new Set<string>();
const inflight = new Map<string, Promise<J | null>>();

/** JSON GET with Next's data cache. Returns null on any failure (feeds come and go). */
export async function getJson(url: string, revalidate: number): Promise<J | null> {
  const hit = big.get(url);
  if (hit && hit.exp > Date.now()) return hit.data;
  const pending = inflight.get(url);
  if (pending) return pending;
  const run = (async () => {
    try {
      const res = await fetch(url, {
        ...(bigUrls.has(url) ? { cache: "no-store" as const } : { next: { revalidate } }),
        headers: { "User-Agent": "Mozilla/5.0 (stat-tracker)", Accept: "application/json, text/plain, */*" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return hit?.data ?? null;
      const text = await res.text(); // some CDNs label JSON as text/plain
      const data = text ? JSON.parse(text) : null;
      if (text.length > BIG && data) {
        bigUrls.add(url);
        big.delete(url);
        big.set(url, { exp: Date.now() + revalidate * 1000, data });
        while (big.size > MAX_BIG) big.delete(big.keys().next().value!);
      }
      return data;
    } catch {
      return hit?.data ?? null; // an expired copy beats nothing when the feed is down
    } finally {
      inflight.delete(url);
    }
  })();
  inflight.set(url, run);
  return run;
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
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

export const num = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

/** A stable, readable colour for teams without one in the feed. */
export function colorFor(key: string): string {
  const palette = ["#e4572e", "#2f8de4", "#2fb36d", "#d6336c", "#f2a900", "#7d5ba6", "#00a3a1", "#ff7f50", "#8bc34a", "#c0392b", "#5dade2", "#e67e22"];
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}
