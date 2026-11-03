// Sports news finder: pure helpers (feed parsing, de-duplication keys, sport tagging,
// page meta). Ported from the nzelection news finder; no I/O here so it's unit-testable.

export type SportTag = "nba" | "nbl" | "nrl" | "super-rugby" | "all-blacks" | "a-league" | "netball" | "cricket" | "racing";

export const SPORT_LABEL: Record<SportTag, string> = {
  "all-blacks": "All Blacks",
  "super-rugby": "Super Rugby",
  nrl: "NRL",
  netball: "Netball",
  "a-league": "A-League",
  cricket: "Cricket",
  racing: "Racing",
  nba: "NBA",
  nbl: "NBL",
};
export const SPORT_ORDER = Object.keys(SPORT_LABEL) as SportTag[];

export interface NewsItem {
  url: string;
  title: string;
  summary: string | null;
  image: string | null;
  source: string;
  kind: "article" | "video" | "blog";
  published_at: string | null;
  sports: SportTag[];
}

// ------------------------------------------------------------------ XML

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s = ""): string {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return NAMED[code.toLowerCase()] ?? m;
  });
}
const stripCdata = (s = "") => String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
export const stripTags = (s = "") => String(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function tagText(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(stripCdata(m[1])).trim() : "";
}
function tagAttr(block: string, name: string, attr: string): string {
  const m = block.match(new RegExp(`<${name}\\s[^>]*\\b${attr}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? decodeEntities(m[1]) : "";
}
const blocks = (xml: string, name: string) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>[\\s\\S]*?</${name}>`, "gi")) ?? [];

const clamp = (s: string | null | undefined, n: number) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s || null);
const iso = (d: string) => (d && Number.isFinite(Date.parse(d)) ? new Date(Date.parse(d)).toISOString() : null);

export interface SourceHint {
  name: string;
  kind?: NewsItem["kind"];
  /** Sport-specific feed: tag these sports even if the headline doesn't say. */
  sports?: SportTag[];
}

function firstImage(item: string): string | null {
  const img =
    tagAttr(item, "media:content", "url") ||
    tagAttr(item, "media:thumbnail", "url") ||
    (tagAttr(item, "enclosure", "type").startsWith("image") ? tagAttr(item, "enclosure", "url") : "") ||
    (tagText(item, "description").match(/<img[^>]+src="(https:[^"]+)"/i)?.[1] ?? "");
  return img.startsWith("https://") ? img : null;
}

/** RSS 2.0 and Atom feeds. */
export function parseRss(xml: string, src: SourceHint): Omit<NewsItem, "sports">[] {
  const out: Omit<NewsItem, "sports">[] = [];
  for (const it of blocks(xml, "item")) {
    const title = stripTags(tagText(it, "title"));
    const url = (tagText(it, "link") || tagText(it, "guid")).trim();
    if (!title || !/^https?:\/\//.test(url)) continue;
    out.push({
      url,
      title: clamp(title, 300)!,
      summary: clamp(stripTags(tagText(it, "description") || tagText(it, "content:encoded")), 280),
      image: firstImage(it),
      source: src.name,
      kind: src.kind ?? "article",
      published_at: iso(tagText(it, "pubDate") || tagText(it, "dc:date")),
    });
  }
  for (const e of blocks(xml, "entry")) {
    const title = stripTags(tagText(e, "title"));
    const url = tagAttr(e, "link", "href");
    if (!title || !/^https?:\/\//.test(url)) continue;
    out.push({
      url,
      title: clamp(title, 300)!,
      summary: clamp(stripTags(tagText(e, "summary") || tagText(e, "content")), 280),
      image: firstImage(e),
      source: src.name,
      kind: src.kind ?? "article",
      published_at: iso(tagText(e, "published") || tagText(e, "updated")),
    });
  }
  return out;
}

/** Google News search RSS: titles end in " - Outlet"; <source> names the outlet. */
export function parseNewsSearch(xml: string): Omit<NewsItem, "sports">[] {
  const out: Omit<NewsItem, "sports">[] = [];
  for (const it of blocks(xml, "item")) {
    const raw = stripTags(tagText(it, "title"));
    const url = tagText(it, "link").trim();
    if (!raw || !/^https?:\/\//.test(url)) continue;
    const outlet = tagText(it, "source") || (raw.includes(" - ") ? raw.split(" - ").pop()! : "");
    out.push({
      url,
      title: clamp(raw.replace(/\s+-\s+[^-]{2,60}$/, ""), 300)!,
      summary: null,
      image: null,
      source: outlet || "News",
      kind: "article",
      published_at: iso(tagText(it, "pubDate")),
    });
  }
  return out;
}

// ------------------------------------------------------------------ de-duplication keys

export function urlKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_|ref$|ocid|cmp|mibextid$|igsh|si$)/i.test(k)) u.searchParams.delete(k);
    u.hostname = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    return (u.hostname + u.pathname.replace(/\/+$/, "") + u.search).toLowerCase();
  } catch {
    return String(url).toLowerCase();
  }
}

export function titleKey(title: string): string {
  return String(title)
    .toLowerCase()
    .replace(/\s[-–|]\s[^-–|]{2,40}$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 120);
}

// ------------------------------------------------------------------ sport tagging

const RUGBY = /\brugby\b(?!\s+league)/i;
const RULES: { sport: SportTag; test: (t: string) => boolean }[] = [
  { sport: "all-blacks", test: (t) => /\bAll Blacks?\b|\bBledisloe\b|\bNations Championship\b|\bRugby Championship\b|\bRazor\b|Scott Robertson|Ardie Savea|Will Jordan|Beauden Barrett|\bBlack Ferns\b/i.test(t) },
  {
    sport: "super-rugby",
    test: (t) => /\bSuper Rugby\b/i.test(t) || (RUGBY.test(t) && /\b(Crusaders|Hurricanes|Highlanders|Chiefs|Blues|Moana Pasifika|Drua|Brumbies|Waratahs|Western Force|Queensland Reds)\b/.test(t)),
  },
  {
    sport: "nrl",
    test: (t) =>
      /\bNRL\b|\bNRLW\b|rugby league|State of Origin|\bKiwis\b|\bKiwi Ferns\b|One NZ Warriors|NZ Warriors|New Zealand Warriors|Andrew Webster|\b(Penrith Panthers|Brisbane Broncos|Melbourne Storm|Sydney Roosters|South Sydney Rabbitohs|Manly Sea Eagles|Cronulla Sharks|Canberra Raiders|Canterbury Bulldogs|Parramatta Eels|Wests Tigers|Newcastle Knights|St George Illawarra|Gold Coast Titans|North Queensland Cowboys)\b/i.test(t),
  },
  { sport: "netball", test: (t) => /\bnetball\b|Silver Ferns|ANZ Premiership|Super Netball|\b(Northern Mystics|Pulse|Tactix|Southern Steel|Northern Stars|Magic)\b.*\bnetball\b/i.test(t) },
  {
    sport: "a-league",
    test: (t) => /\bA-League\b|Wellington Phoenix|Auckland FC|\bALM\b|\bALW\b|Isuzu UTE A-League|Ninja A-League|\b(Sydney FC|Melbourne Victory|Melbourne City|Western Sydney Wanderers|Central Coast Mariners|Newcastle Jets|Adelaide United|Brisbane Roar|Perth Glory|Macarthur FC|Western United)\b/i.test(t),
  },
  {
    sport: "cricket",
    test: (t) => /\bcricket\b|Black ?Caps|BLACKCAPS|White Ferns|Super Smash|\bIPL\b|\bBBL\b|Big Bash|\bT20I?\b|\bODIs?\b|\bwickets?\b|Kane Williamson|Mitchell Santner|\bNZ20\b|Ashes/i.test(t),
  },
  {
    sport: "racing",
    test: (t) =>
      /horse racing|harness racing|\btrotting\b|\bthoroughbreds?\b|\bjockeys?\b|Melbourne Cup|Cox Plate|Caulfield Cup|Golden Slipper|Karaka|Ellerslie|Riccarton|Trentham|Te Rapa|Addington|Alexandra Park|\bNZTR\b|LoveRacing|\bgallops\b|\bracehorses?\b|\bGroup (1|One)\b.*\b(race|stakes|mile)\b|\bTAB\b.*\b(race|odds)\b/i.test(t),
  },
  {
    sport: "nbl",
    test: (t) =>
      /\bNBL\b|NZ Breakers|New Zealand Breakers|\bBreakers\b.*\b(basketball|NBL)\b|Tasmania JackJumpers|Perth Wildcats|Sydney Kings|Melbourne United|Illawarra Hawks|Adelaide 36ers|Brisbane Bullets|Cairns Taipans|South East Melbourne Phoenix/i.test(t),
  },
  {
    sport: "nba",
    test: (t) =>
      /\bNBA\b|\b(Lakers|Celtics|Knicks|Nuggets|Mavericks|Timberwolves|Cavaliers|Bucks|76ers|Sixers|Grizzlies|Pelicans|Raptors|Pistons|Trail Blazers|Clippers|Thunder)\b|LeBron|Wembanyama|Jokic|Jokić|Steph(en)? Curry|Giannis|Luka Don[cč]i[cć]|Steven Adams/i.test(t),
  },
];

/** Which of our sports a story is about (empty = not ours, so it's dropped). */
export function classify(text: string, hint: SportTag[] = []): SportTag[] {
  const found = RULES.filter((r) => r.test(text)).map((r) => r.sport);
  // Tests and the All Blacks are rugby union; don't also tag Super Rugby unless it says so
  const out = new Set<SportTag>([...found, ...hint]);
  if (out.has("all-blacks") && !/\bSuper Rugby\b/i.test(text)) out.delete("super-rugby");
  return SPORT_ORDER.filter((s) => out.has(s));
}

// Betting-tip and gambling-promo spam: never publish
const SPAM = /\b(promo code|bonus code|free bets?|casino|pokies|sign[- ]?up offer|best betting sites)\b/i;
export const isSpam = (text: string) => SPAM.test(text);

// ------------------------------------------------------------------ page meta (share image)

function metaContent(html: string, keys: string[]): string {
  for (const k of keys) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)\\s*=\\s*["']${k}["'][^>]*content\\s*=\\s*["']([^"']*)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*(?:property|name|itemprop)\\s*=\\s*["']${k}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    if (m && m[1].trim()) return decodeEntities(m[1].trim());
  }
  return "";
}

export function parseMeta(html: string, pageUrl: string) {
  const title = metaContent(html, ["og:title", "twitter:title"]) || decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim());
  const summary = metaContent(html, ["og:description", "twitter:description", "description"]);
  let image = metaContent(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
  if (image) {
    try {
      image = new URL(image, pageUrl).href;
    } catch {
      image = "";
    }
  }
  let published = metaContent(html, ["article:published_time", "og:published_time", "datePublished"]);
  if (!published) published = html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] || "";
  let host = "";
  try {
    host = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {}
  const site = metaContent(html, ["og:site_name", "application-name"]) || host;
  return {
    title: title.slice(0, 300),
    summary: summary.slice(0, 600),
    image: image.startsWith("https://") ? image : "",
    source: site.slice(0, 80),
    published_at: iso(published),
  };
}
