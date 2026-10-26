import "server-only";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type J = any;

/** JSON GET with Next's data cache. Returns null on any failure (feeds come and go). */
export async function getJson(url: string, revalidate: number): Promise<J | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate },
      headers: { "User-Agent": "Mozilla/5.0 (stat-tracker)", Accept: "application/json, text/plain, */*" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const text = await res.text(); // some CDNs label JSON as text/plain
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
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
