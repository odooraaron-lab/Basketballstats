import Link from "next/link";
import { after } from "next/server";
import { ResponsibleGambling } from "@/components/public/PublicFooter";
import { SPORT_LABEL, SPORT_ORDER, urlKey, type SportTag } from "@/lib/news/core";
import { directNews, listPosts, runNewsIngest, type NewsPost } from "@/lib/news/store";
import { site } from "@/site.config";
import { NewsImg } from "@/components/public/NewsImg";

export const revalidate = 300;
export const maxDuration = 60;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const s = (await searchParams).s as SportTag | undefined;
  const label = s && SPORT_LABEL[s] ? `${SPORT_LABEL[s]} news` : "Sports news";
  return {
    title: `${label}: latest from NZ & around the world`,
    description: `The latest ${s && SPORT_LABEL[s] ? SPORT_LABEL[s] : "All Blacks, NRL, Super Rugby, netball, A-League, cricket, racing, NBA and NBL"} news and analysis from newsrooms and blogs in New Zealand and around the world, updated through the day.`,
    alternates: { canonical: s && SPORT_LABEL[s] ? `/news?s=${s}` : "/news" },
  };
}

const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
};

async function load(sport: SportTag | ""): Promise<NewsPost[]> {
  const saved = await listPosts({ sport, limit: 80 }).catch(() => [] as NewsPost[]);
  if (saved.length >= 12) return saved;
  // Thin or no database yet: top up from newsroom feeds directly
  const have = new Set(saved.map((p) => urlKey(p.url)));
  const extra = (await directNews().catch(() => [] as NewsPost[])).filter((p) => (!sport || p.sports.includes(sport)) && !have.has(urlKey(p.url)));
  return [...saved, ...extra].sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.published_at ?? b.added_at) - Date.parse(a.published_at ?? a.added_at)).slice(0, 80);
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const raw = (await searchParams).s;
  const sport: SportTag | "" = raw && raw in SPORT_LABEL ? (raw as SportTag) : "";
  const posts = await load(sport);
  // Keep the news fresh: a background run whenever one is due (at most every 30 minutes)
  after(() => runNewsIngest({ reason: "page" }).catch(() => null));
  const [lead, ...rest] = posts;
  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: sport ? `${SPORT_LABEL[sport]} news` : "Sports news",
    url: `${site.url}/news${sport ? `?s=${sport}` : ""}`,
    mainEntity: { "@type": "ItemList", itemListElement: posts.slice(0, 20).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: p.url, name: p.title })) },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <h1 className="display text-4xl font-extrabold sm:text-5xl">{sport ? `${SPORT_LABEL[sport]} news` : "Sports news"}</h1>
      <p className="mt-2 max-w-2xl text-ink-400">The latest stories, analysis and blogs about the sports we cover, from New Zealand newsrooms and around the world. Updated through the day.</p>

      <nav className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filter by sport">
        <Link href="/news" className={`chip shrink-0 !px-3 !py-1 !text-sm ${!sport ? "!border-court !text-court" : "hover:text-ink-100"}`}>
          All sports
        </Link>
        {SPORT_ORDER.map((s) => (
          <Link key={s} href={`/news?s=${s}`} className={`chip shrink-0 !px-3 !py-1 !text-sm ${sport === s ? "!border-court !text-court" : "hover:text-ink-100"}`}>
            {SPORT_LABEL[s]}
          </Link>
        ))}
      </nav>

      {!lead ? (
        <p className="mt-10 rounded-xl border border-dashed border-ink-700 px-4 py-10 text-center text-ink-500">No stories yet{sport ? ` for ${SPORT_LABEL[sport]}` : ""}. The news finder checks every 30 minutes — come back shortly.</p>
      ) : (
        <>
          <a href={lead.url} target="_blank" rel="noopener nofollow" className="card mt-6 grid overflow-hidden hover:border-ink-600 md:grid-cols-[1.2fr_1fr]">
            {lead.image ? (
              <NewsImg src={lead.image} className="h-56 w-full object-cover md:h-full" eager />
            ) : (
              <div className="hidden bg-gradient-to-br from-court/25 to-ink-900 md:block" />
            )}
            <div className="min-w-0 p-5 sm:p-7">
              <Meta p={lead} />
              <h2 className="display mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{lead.title}</h2>
              {lead.summary && <p className="mt-3 text-ink-300">{lead.summary}</p>}
              <span className="mt-4 inline-block text-sm font-semibold text-court">Read on {lead.source} →</span>
            </div>
          </a>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <a key={String(p.id)} href={p.url} target="_blank" rel="noopener nofollow" className="card flex min-w-0 flex-col overflow-hidden hover:border-ink-600">
                {p.image && <NewsImg src={p.image} className="h-40 w-full object-cover" />}
                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <Meta p={p} />
                  <h3 className="mt-1.5 font-semibold leading-snug text-ink-100">{p.title}</h3>
                  {p.summary && <p className="mt-1.5 line-clamp-3 text-sm text-ink-400">{p.summary}</p>}
                </div>
              </a>
            ))}
          </div>
        </>
      )}

      <section className="card mt-10 p-6">
        <h2 className="display text-2xl font-extrabold">From the news to the numbers</h2>
        <p className="mt-1 text-ink-400">
          {site.name} turns the latest team news into stats: projections, fair odds, player form, NZ racing form and The Ultimate Bet.{" "}
          <Link href="/features" className="text-court hover:underline">See what&apos;s inside →</Link>
        </p>
      </section>
      <p className="mt-6 text-xs text-ink-500">Headlines link to the original publishers. {site.name} isn&apos;t responsible for external content.</p>
      <ResponsibleGambling className="mt-3" />
    </main>
  );
}

function Meta({ p }: { p: NewsPost }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      <span className="font-semibold text-ink-300">{p.source}</span>
      {(p.published_at || p.added_at) && <span className="text-ink-500">{ago(p.published_at ?? p.added_at)}</span>}
      {p.kind === "blog" && <span className="rounded bg-ink-800 px-1.5 py-0.5 text-ink-400">Blog</span>}
      {p.sports.slice(0, 3).map((s) => (
        <span key={s} className="rounded bg-court/15 px-1.5 py-0.5 font-semibold text-court">
          {SPORT_LABEL[s as SportTag] ?? s}
        </span>
      ))}
    </div>
  );
}
