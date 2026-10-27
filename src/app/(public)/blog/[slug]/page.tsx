import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown, headings } from "@/components/Markdown";
import { PostCard } from "@/components/public/PostCard";
import { ResponsibleGambling } from "@/components/public/PublicFooter";
import { POSTS, postBySlug, postsInZone, readingMinutes, zoneById } from "@/content/blog";
import { fmtDate } from "@/lib/format";
import { priceLabel, site } from "@/site.config";

export const generateStaticParams = () => POSTS.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = postBySlug((await params).slug);
  if (!p) return {};
  return {
    title: p.seoTitle ?? p.title,
    description: p.description,
    keywords: p.keywords,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", title: p.title, description: p.description, publishedTime: p.date, url: `${site.url}/blog/${p.slug}` },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = postBySlug((await params).slug);
  if (!p) notFound();
  const zone = zoneById(p.zone)!;
  const toc = headings(p.body);
  const related = postsInZone(p.zone).filter((x) => x.slug !== p.slug).slice(0, 3);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    dateModified: p.date,
    author: { "@type": "Organization", name: site.name },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
    mainEntityOfPage: `${site.url}/blog/${p.slug}`,
    keywords: p.keywords.join(", "),
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Guides", item: `${site.url}/blog` },
      { "@type": "ListItem", position: 2, name: zone.label, item: `${site.url}/blog/sport/${zone.id}` },
      { "@type": "ListItem", position: 3, name: p.title, item: `${site.url}/blog/${p.slug}` },
    ],
  };
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, crumbs]) }} />
      <nav className="text-sm text-ink-400" aria-label="Breadcrumb">
        <Link href="/blog" className="hover:text-court">Guides</Link> / <Link href={`/blog/sport/${zone.id}`} className="hover:text-court">{zone.label}</Link>
      </nav>
      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_260px]">
        <article>
          <h1 className="display text-3xl font-extrabold leading-tight sm:text-4xl">{p.title}</h1>
          <p className="mt-3 text-lg text-ink-300">{p.description}</p>
          <p className="mt-3 text-sm text-ink-500">
            {fmtDate(p.date, { day: "numeric", month: "long", year: "numeric" })} · {readingMinutes(p)} min read · {site.name} team
          </p>
          <div className="prose-cs mt-8">
            <Markdown source={p.body} />
          </div>
          <div className="card mt-10 p-6">
            <div className="display text-2xl font-extrabold">Put this into practice with live {zone.label} stats</div>
            <p className="mt-1 text-sm text-ink-400">Projections, fair odds, player form and the automated multi builder for every game. {priceLabel}/month, cancel anytime.</p>
            <Link href="/signup" className="display mt-4 inline-block rounded-xl bg-court px-5 py-3 font-bold text-ink-950 hover:bg-court-soft">Join {site.name}</Link>
          </div>
          <ResponsibleGambling className="mt-6" />
        </article>
        <aside className="hidden lg:block">
          {toc.length > 2 && (
            <div className="sticky top-24">
              <div className="display mb-2 text-sm font-semibold text-ink-400">In this guide</div>
              <ul className="space-y-1.5 border-l border-ink-800 pl-3 text-sm">
                {toc.map((h) => (
                  <li key={h.id}><a href={`#${h.id}`} className="text-ink-400 hover:text-court">{h.text}</a></li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="display mb-4 text-2xl font-extrabold">More {zone.label} guides</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => <PostCard key={r.slug} p={r} />)}
          </div>
        </section>
      )}
    </main>
  );
}
