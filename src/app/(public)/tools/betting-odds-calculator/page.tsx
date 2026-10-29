import Link from "next/link";
import { EachWayCalc, MarginCalc, MultiCalc, OddsConverter } from "@/components/public/Calculators";
import { PostCard } from "@/components/public/PostCard";
import { ResponsibleGambling } from "@/components/public/PublicFooter";
import { ValueCalc } from "@/components/public/ValueCalc";
import { POSTS } from "@/content/blog";
import { priceLabel, site } from "@/site.config";

export const metadata = {
  title: { absolute: `Betting Odds Calculator NZ: Fair Odds, Margin, Multi & Boost | ${site.name}` },
  description:
    "Free betting odds calculator for NZ and Australian punters: convert decimal odds to implied probability, remove the bookmaker's margin, price a multi, check an odds boost and work out each-way returns.",
  keywords: ["betting odds calculator", "odds calculator NZ", "implied probability calculator", "multi calculator", "boost calculator", "bookmaker margin calculator", "each way calculator"],
  alternates: { canonical: "/tools/betting-odds-calculator" },
  openGraph: { title: "Free betting odds calculator", description: "Fair odds, bookmaker margin, multi, boost and each-way calculators in one place.", url: `${site.url}/tools/betting-odds-calculator` },
};

const FAQ = [
  { q: "How do I convert odds to a probability?", a: "Divide 1 by the decimal odds. $2.50 is 1 ÷ 2.5 = 40%. That's the implied probability before the bookmaker's margin is removed." },
  { q: "What is a bookmaker's margin?", a: "The amount the implied probabilities of every outcome add up to over 100%. A $1.90 / $1.90 market totals 105.3%, a 5.3% margin. Dividing each implied chance by the total gives the fair chance." },
  { q: "How do I work out multi odds?", a: "Multiply the decimal odds of every leg. Three legs at $1.80, $1.65 and $2.10 make a multi at about $6.24. Multiply your chances for each leg to see how likely it really is to land." },
  { q: "When is an odds boost worth it?", a: "When the boosted price is longer than the fair price for your chance of the bet winning. If you rate a bet at 30%, its fair price is $3.33, so a boost to $3.60 is value and a boost to $3.20 isn't." },
  { q: "What is expected value?", a: "The average profit per bet if your chance is right: (your chance × odds) − 1. A positive number means the bet is value in the long run, even though any single bet can lose." },
];

export default function OddsCalculatorPage() {
  const guides = POSTS.filter((p) => p.zone === "betting-tools").slice(0, 3);
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Betting odds calculator",
      url: `${site.url}/tools/betting-odds-calculator`,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "NZD" },
      description: metadata.description,
      provider: { "@type": "Organization", name: site.name, url: site.url },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: site.name, item: site.url },
        { "@type": "ListItem", position: 2, name: "Betting odds calculator", item: `${site.url}/tools/betting-odds-calculator` },
      ],
    },
  ];
  const Section = ({ id, title, sub, children }: { id: string; title: string; sub: string; children: React.ReactNode }) => (
    <section id={id} className="scroll-mt-20">
      <h2 className="display text-2xl font-extrabold sm:text-3xl">{title}</h2>
      <p className="mb-4 mt-1 max-w-3xl text-ink-400">{sub}</p>
      {children}
    </section>
  );
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <header>
        <span className="display text-sm font-bold text-court">Free tool · no sign-up</span>
        <h1 className="display mt-1 text-4xl font-extrabold leading-tight sm:text-5xl">Betting odds calculator</h1>
        <p className="mt-3 max-w-3xl text-lg text-ink-300">
          Five calculators for NZ and Australian punters: turn odds into a real chance, see how much margin the bookie is taking, price a multi, check whether a boost is worth it, and work out an each-way bet.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm" aria-label="Calculators">
          {[
            ["value", "Value & boost"],
            ["converter", "Odds converter"],
            ["margin", "Bookmaker margin"],
            ["multi", "Multi calculator"],
            ["each-way", "Each way"],
          ].map(([id, l]) => (
            <a key={id} href={`#${id}`} className="chip !px-3 !py-1 hover:text-ink-100">
              {l}
            </a>
          ))}
        </nav>
      </header>

      <Section id="value" title="Is this price (or boost) worth it?" sub="Enter the bookie's odds, an optional boosted price and the chance you rate it. You'll see the fair price and the expected return at each price.">
        <ValueCalc />
      </Section>
      <Section id="converter" title="Odds converter" sub="Decimal odds to implied probability, fractional and American odds.">
        <OddsConverter />
      </Section>
      <Section id="margin" title="Bookmaker margin calculator" sub="Paste every price in a market to see the overround and the fair odds for each outcome with the margin removed.">
        <MarginCalc />
      </Section>
      <Section id="multi" title="Multi calculator" sub="Combined price and returns for any multi, and its real chance of landing if you add your own chance for each leg.">
        <MultiCalc />
      </Section>
      <Section id="each-way" title="Each-way calculator" sub="An each-way bet is a win bet and a place bet of the same stake. See what you get back if it wins or only places.">
        <EachWayCalc />
      </Section>

      <section className="card p-6 sm:p-8">
        <h2 className="display text-2xl font-extrabold">Want the chances filled in for you?</h2>
        <p className="mt-2 max-w-3xl text-ink-300">
          {site.name} shows our own chance and fair odds for every game and race: NRL, Super Rugby, the All Blacks, netball, A-League, cricket, NBA, NBL and NZ horse racing. It also builds multis and{" "}
          <Link href="/features/ultimate-bet" className="text-court hover:underline">
            The Ultimate Bet
          </Link>{" "}
          for the next 48 hours. {priceLabel}/month.
        </p>
        <Link href="/signup" className="display mt-4 inline-block rounded-xl bg-court px-5 py-3 font-bold text-ink-950 hover:bg-court-soft">
          Join {site.name}
        </Link>
      </section>

      <section className="max-w-3xl">
        <h2 className="display text-2xl font-extrabold sm:text-3xl">How the calculators work</h2>
        <div className="mt-4 space-y-5 text-ink-300">
          {FAQ.map((f) => (
            <div key={f.q}>
              <h3 className="display text-lg font-bold text-ink-100">{f.q}</h3>
              <p className="mt-1">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {guides.length > 0 && (
        <section>
          <h2 className="display mb-4 text-2xl font-extrabold">Betting maths guides</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((p) => (
              <PostCard key={p.slug} p={p} />
            ))}
          </div>
        </section>
      )}
      <ResponsibleGambling />
    </main>
  );
}
