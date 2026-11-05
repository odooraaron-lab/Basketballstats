// Sports news finder: fetch sources, tag by sport, de-duplicate, save, and add share images.
// Runs from the /news page (in the background when due), a daily cron, or the admin button.
// A database claim makes sure only one run happens per interval, however many callers race.
import "server-only";
import dns from "node:dns/promises";
import net from "node:net";
import { dbConfigured, q } from "@/lib/db";
import { classify, isSpam, parseMeta, parseNewsSearch, parseRss, titleKey, urlKey, type NewsItem, type SportTag } from "./core";
import { SOURCES, type Source } from "./sources";

export const INGEST_MINUTES = 30;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 QuickReadNews/1.0";

export interface NewsPost extends NewsItem {
  id: number | string;
  pinned: boolean;
  status: "live" | "hidden";
  added_at: string;
}

async function fetchText(url: string, timeoutMs = 7000): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" }, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Candidate stories from one source, tagged with our sports (untagged ones dropped). */
export async function fetchSource(src: Source): Promise<NewsItem[]> {
  let raw: Omit<NewsItem, "sports">[] = [];
  if (src.type === "rss") {
    let lastErr: unknown;
    for (const url of [src.url, ...(src.fallbacks ?? [])]) {
      try {
        raw = parseRss(await fetchText(url), src);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr) throw lastErr;
  } else {
    const region = src.region ?? "NZ";
    const lists = await Promise.all(
      src.queries.map(async (qy) => {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${qy} when:2d`)}&hl=en-${region}&gl=${region}&ceid=${region}:en`;
        return parseNewsSearch(await fetchText(url)).slice(0, 20);
      }),
    );
    raw = lists.flat();
  }
  const out: NewsItem[] = [];
  for (const r of raw) {
    const text = `${r.title} ${r.summary ?? ""}`;
    if (isSpam(text)) continue;
    const sports = classify(text, src.sports ?? []);
    if (sports.length) out.push({ ...r, sports });
  }
  return out;
}

// ------------------------------------------------------------------ database

/* eslint-disable @typescript-eslint/no-explicit-any */
const toPost = (r: any): NewsPost => ({
  id: r.id,
  url: r.url,
  title: r.title,
  summary: r.summary,
  image: r.image,
  source: r.source,
  kind: r.kind,
  sports: r.sports ?? [],
  pinned: r.pinned,
  status: r.status,
  published_at: r.published_at ? new Date(r.published_at).toISOString() : null,
  added_at: new Date(r.added_at).toISOString(),
});

/** Save one story (Admin → News "add a link"). */
export async function addPost(p: NewsItem, origin: "auto" | "admin" = "auto"): Promise<boolean> {
  const tk = titleKey(p.title);
  const published = p.published_at && Date.parse(p.published_at) < Date.now() + 60_000 ? p.published_at : null;
  // Same URL, or the same headline from another outlet/search link in the last 3 days, counts as a duplicate
  const rows = await q(
    `INSERT INTO news_posts (url, url_key, title, title_key, summary, image, source, kind, sports, origin, published_at)
     SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
     WHERE NOT EXISTS (SELECT 1 FROM news_posts WHERE title_key = $4 AND $4 <> '' AND added_at > now() - interval '3 days')
     ON CONFLICT (url_key) DO NOTHING RETURNING id`,
    [p.url.slice(0, 2000), urlKey(p.url), p.title.slice(0, 300), tk, p.summary, p.image, p.source?.slice(0, 80) ?? null, p.kind, p.sports, origin, published],
  );
  return rows.length > 0;
}

export async function listPosts({ sport, limit = 60, status = "live", maxAgeDays = 14 }: { sport?: SportTag | ""; limit?: number; status?: "live" | "hidden" | "all"; maxAgeDays?: number } = {}): Promise<NewsPost[]> {
  if (!dbConfigured()) return [];
  const rows = await q(
    `SELECT * FROM news_posts
     WHERE ($1 = 'all' OR status = $1) AND ($2 = '' OR $2 = ANY(sports)) AND coalesce(published_at, added_at) > now() - make_interval(days => $3)
     ORDER BY pinned DESC, coalesce(published_at, added_at) DESC LIMIT $4`,
    [status, sport ?? "", maxAgeDays, limit],
  );
  return rows.map(toPost);
}

export async function updatePost(id: number, fields: Partial<Pick<NewsPost, "status" | "pinned" | "image" | "sports">>) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (!["status", "pinned", "image", "sports"].includes(k)) continue;
    vals.push(v);
    sets.push(`${k} = $${vals.length}`);
  }
  if (!sets.length) return;
  vals.push(id);
  await q(`UPDATE news_posts SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
}

async function getState<T>(key: string, fallback: T): Promise<T> {
  const rows = await q(`SELECT value FROM app_state WHERE key = $1`, [key]);
  return (rows[0]?.value as T) ?? fallback;
}
async function setState(key: string, value: unknown) {
  await q(`INSERT INTO app_state (key, value, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [key, JSON.stringify(value)]);
}

/** Only one run per interval across every server instance. */
async function claim(seconds: number): Promise<boolean> {
  const rows = await q(
    `INSERT INTO app_state (key, value, updated_at) VALUES ('news_claim', '{}', now())
     ON CONFLICT (key) DO UPDATE SET updated_at = now() WHERE app_state.updated_at < now() - make_interval(secs => $1)
     RETURNING key`,
    [seconds],
  );
  return rows.length > 0;
}

export interface IngestReport {
  at: string;
  reason: string;
  added: number;
  skipped: number;
  pictures: number;
  /** How long the run took, so a slow database or feed shows up in Admin → News */
  ms?: number;
  sources: Record<string, { ok: boolean; found?: number; added?: number; error?: string }>;
}

/**
 * Save many stories in ONE query. Inserting them one by one meant hundreds of database round
 * trips per run; on Vercel the run hit its time limit part-way through, so the sources at the
 * end of the list (basketball, racing) almost never got saved. Returns the url_keys added.
 */
export async function addPosts(items: NewsItem[], origin: "auto" | "admin" = "auto"): Promise<Set<string>> {
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const rows: Record<string, string | null>[] = [];
  for (const p of items) {
    const uk = urlKey(p.url);
    const tk = titleKey(p.title);
    if (seenUrl.has(uk) || (tk && seenTitle.has(tk))) continue;
    seenUrl.add(uk);
    if (tk) seenTitle.add(tk);
    const published = p.published_at && Date.parse(p.published_at) < Date.now() + 60_000 ? p.published_at : null;
    rows.push({
      url: p.url.slice(0, 2000),
      url_key: uk,
      title: p.title.slice(0, 300),
      title_key: tk,
      summary: p.summary,
      image: p.image,
      source: p.source?.slice(0, 80) ?? null,
      kind: p.kind,
      sports: p.sports.join(","),
      published_at: published,
    });
  }
  if (!rows.length) return new Set();
  const out = await q(
    `INSERT INTO news_posts (url, url_key, title, title_key, summary, image, source, kind, sports, origin, published_at)
     SELECT x.url, x.url_key, x.title, x.title_key, x.summary, x.image, x.source, x.kind, string_to_array(x.sports, ','), $2, x.published_at::timestamptz
     FROM jsonb_to_recordset($1::jsonb) AS x(url text, url_key text, title text, title_key text, summary text, image text, source text, kind text, sports text, published_at text)
     WHERE NOT EXISTS (SELECT 1 FROM news_posts p WHERE p.title_key = x.title_key AND x.title_key <> '' AND p.added_at > now() - interval '3 days')
     ON CONFLICT (url_key) DO NOTHING RETURNING url_key`,
    [JSON.stringify(rows), origin],
  );
  return new Set(out.map((r) => r.url_key as string));
}

export async function runNewsIngest({ force = false, reason = "page" }: { force?: boolean; reason?: string } = {}): Promise<IngestReport | { ran: false; why: string }> {
  if (!dbConfigured()) return { ran: false, why: "no-database" };
  if (!(await claim(force ? 15 : INGEST_MINUTES * 60 - 20))) return { ran: false, why: "not-due" };
  const t0 = Date.now();
  const sources = SOURCES.filter((s) => s.enabled !== false);
  const settled = await Promise.allSettled(sources.map((s) => fetchSource(s)));
  const report: IngestReport = { at: new Date().toISOString(), reason, added: 0, skipped: 0, pictures: 0, sources: {} };
  const all: { src: string; item: NewsItem }[] = [];
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const r = settled[i];
    if (r.status !== "fulfilled") {
      report.sources[src.id] = { ok: false, error: String((r.reason as Error)?.message ?? r.reason).slice(0, 160) };
      continue;
    }
    report.sources[src.id] = { ok: true, found: r.value.length, added: 0 };
    for (const item of r.value.slice(0, 40)) all.push({ src: src.id, item });
  }
  const added = await addPosts(all.map((a) => a.item));
  const counted = new Set<string>();
  for (const { src, item } of all) {
    const k = urlKey(item.url);
    if (added.has(k) && !counted.has(k)) {
      counted.add(k);
      report.sources[src].added = (report.sources[src].added ?? 0) + 1;
      report.added++;
    } else report.skipped++;
  }
  // Save the report before the slower picture step, so a cut-short run still shows what happened
  report.ms = Date.now() - t0;
  await setState("news_report", report).catch(() => {});
  report.pictures = await addPictures().catch(() => 0);
  report.ms = Date.now() - t0;
  await setState("news_report", report).catch(() => {});
  return report;
}

export const lastReport = () => getState<IngestReport | null>("news_report", null);

// ------------------------------------------------------------------ pictures

function privateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v = ip.toLowerCase();
  return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v === "::";
}

/** Refuse anything that isn't a public http(s) page (no internal addresses). */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a web address.");
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http and https links can be added.");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(u.hostname)) throw new Error("Private addresses can't be added.");
  const addrs = net.isIP(u.hostname) ? [{ address: u.hostname }] : await dns.lookup(u.hostname, { all: true });
  if (addrs.some((a) => privateIp(a.address))) throw new Error("Private addresses can't be added.");
  return u;
}

/** Read a story page's <head> for its title, summary and share image. */
export async function fetchMeta(url: string) {
  await assertPublicUrl(url);
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow", cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const reader = res.body?.getReader();
  let html = "";
  if (reader) {
    const dec = new TextDecoder();
    while (html.length < 600_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += dec.decode(value, { stream: true });
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => {});
  }
  return parseMeta(html, res.url || url);
}

/** Many feeds have no picture: read a few story pages per run for their share image. */
async function addPictures(max = 10): Promise<number> {
  const posts = (await listPosts({ limit: 80 })).filter((p) => !p.image && !/news\.google\./.test(p.url));
  const tried = new Set(await getState<string[]>("news_pictures_tried", []));
  const todo = posts.filter((p) => !tried.has(p.url)).slice(0, max);
  if (!todo.length) return 0;
  const found = await Promise.allSettled(
    todo.map(async (p) => {
      tried.add(p.url);
      const m = await fetchMeta(p.url);
      if (m.image) await updatePost(Number(p.id), { image: m.image });
      return Boolean(m.image);
    }),
  );
  await setState("news_pictures_tried", [...tried].slice(-400));
  return found.filter((r) => r.status === "fulfilled" && r.value).length;
}

// ------------------------------------------------------------------ no-database fallback

let direct: { at: number; posts: NewsPost[] } = { at: 0, posts: [] };

/** Newsroom feeds read straight from the source: used when the database is empty or missing. */
export async function directNews(): Promise<NewsPost[]> {
  if (Date.now() - direct.at < 10 * 60_000 && direct.posts.length) return direct.posts;
  const rss = SOURCES.filter((s) => s.type === "rss" && s.enabled !== false);
  const settled = await Promise.allSettled(rss.map((s) => fetchSource(s)));
  const seen = new Set<string>();
  const posts: NewsPost[] = [];
  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    for (const p of r.value.slice(0, 20)) {
      const k = titleKey(p.title);
      if (seen.has(k) || seen.has(urlKey(p.url))) continue;
      seen.add(k);
      seen.add(urlKey(p.url));
      posts.push({ ...p, id: p.url, pinned: false, status: "live", added_at: p.published_at ?? new Date().toISOString() });
    }
  }
  posts.sort((a, b) => Date.parse(b.published_at ?? b.added_at) - Date.parse(a.published_at ?? a.added_at));
  direct = { at: Date.now(), posts: posts.slice(0, 80) };
  return direct.posts;
}
