import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { PostCard } from "@/components/public/PostCard";
import { ResponsibleGambling } from "@/components/public/PublicFooter";
import { POSTS } from "@/content/blog";
import { FEATURES, featureBySlug } from "@/content/features";
import { priceLabel, site } from "@/site.config";

export const generateStaticParams = () => FEATURES.map((f) => ({ slug: f.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const f = featureBySlug((await params).slug);
  if (!f) return {};
  return {
    title: { absolute: f.seoTitle },
    description: f.description,
    keywords: f.keywords,
    alternates: { canonical: `/features/${f.slug}` },
    openGraph: { title: f.h1, description: f.description, url: `${site.url}/features/${f.slug}`, ...(f.img ? { images: [{ url: f.img.src, alt: f.img.alt }] } : {}) },
  };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const f = featureBySlug((await params).slug);
  if (!f) notFound();
  const guides = POSTS.filter((p) => f.zones.includes(p.zone)).slice(0, 6);
  const others = FEATURES.filter((x) => x.slug !== f.slug);
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: f.h1,
      description: f.description,
      url: `${site.url}/features/${f.slug}`,
      isPartOf: { "@type": "WebSite", name: site.name, url: site.url },
      about: { "@type": "SoftwareApplication", name: site.name, applicationCategory: "SportsApplication", offers: { "@type": "Offer", price: site.price.amount.toFixed(2), priceCurrency: site.price.currency } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: site.name, item: site.url },
        { "@type": "ListItem", position: 2, name: "Features", item: `${site.url}/features` },
        { "@type": "ListItem", position: 3, name: f.nav, item: `${site.url}/features/${f.slug}` },
      ],
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: f.faqs.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
  ];
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <section className="relative overflow-hidden border-b border-ink-800">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(242,107,29,0.18),transparent_60%)]" aria-hidden />
        <div className={`relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:py-16 ${f.img ? "lg:grid-cols-[1fr_1.1fr]" : ""}`}>
          <div className="min-w-0">
            <nav className="mb-3 text-sm text-ink-500" aria-label="Breadcrumb">
              <Link href="/features" className="hover:text-court">Features</Link> / <span className="text-ink-400">{f.nav}</span>
            </nav>
            <span className="display text-sm font-bold text-court">{f.kicker}</span>
            <h1 className="display mt-1 text-3xl font-extrabold leading-tight sm:text-5xl">{f.h1}</h1>
            <p className="mt-4 max-w-2xl text-lg text-ink-300">{f.intro}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="display rounded-xl bg-court px-6 py-3 text-lg font-bold text-ink-950 hover:bg-court-soft">
                {site.trialDays ? `Start ${site.trialDays}-day free trial` : `Join for ${priceLabel}/month`}
              </Link>
              <Link href="/#software" className="display rounded-xl border border-ink-700 px-6 py-3 text-lg font-bold text-ink-200 hover:border-ink-500">
                See everything included
              </Link>
            </div>
            <p className="mt-3 text-sm text-ink-500">Every sport and every tool for {priceLabel}/month · cancel anytime · 18+</p>
          </div>
          {f.img && (
            <div className={`min-w-0 ${f.img.portrait ? "flex justify-center" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.img.src} alt={f.img.alt} className={`rounded-2xl border border-ink-700 shadow-2xl shadow-black/40 ${f.img.portrait ? "max-h-[480px] w-auto" : "w-full"}`} />
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {f.points.map((p) => (
            <div key={p.title} className="card p-5">
              <h2 className="display text-xl font-bold">{p.title}</h2>
              <p className="mt-2 text-sm text-ink-400">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-12 lg:grid-cols-[1fr_300px]">
        <div className="prose-cs min-w-0">
          <Markdown source={f.body} />
          <h2>Questions</h2>
          {f.faqs.map((x) => (
            <div key={x.q}>
              <h3>{x.q}</h3>
              <p>{x.a}</p>
            </div>
          ))}
        </div>
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="display text-2xl font-extrabold">{priceLabel}/month</div>
            <p className="mt-1 text-sm text-ink-400">One plan with every sport and every tool: live stats, projections, multis, The Ultimate Bet, NZ racing and the All Blacks.</p>
            <Link href="/signup" className="display mt-4 block rounded-xl bg-court py-3 text-center font-bold text-ink-950 hover:bg-court-soft">
              Get access
            </Link>
          </div>
          <div className="card p-5">
            <div className="display mb-2 text-sm font-semibold text-ink-400">More features</div>
            <ul className="space-y-1.5 text-sm">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={`/features/${o.slug}`} className="text-ink-300 hover:text-court">
                    {o.nav}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/tools/betting-odds-calculator" className="text-ink-300 hover:text-court">
                  Free odds calculator
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </section>

      {guides.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="display mb-4 text-2xl font-extrabold">Related guides</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((p) => (
              <PostCard key={p.slug} p={p} />
            ))}
          </div>
        </section>
      )}
      <div className="mx-auto max-w-6xl px-4 pb-10">
        <ResponsibleGambling />
      </div>
    </main>
  );
}
