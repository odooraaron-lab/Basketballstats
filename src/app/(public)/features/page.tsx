import Link from "next/link";
import { FEATURES } from "@/content/features";
import { priceLabel, site } from "@/site.config";

export const metadata = {
  title: "Features: live stats, multi builder, racing form & more",
  description: `Everything in ${site.name}: live sports stats, an automated multi builder, The Ultimate Bet, NZ horse racing form, All Blacks stats, and an odds and boost checker. ${priceLabel}/month.`,
  alternates: { canonical: "/features" },
};

export default function FeaturesIndex() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Everything in {site.name}</h1>
      <p className="mt-2 max-w-2xl text-ink-400">Every sport and every tool for {priceLabel} a month. Pick a feature to see how it works.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Link key={f.slug} href={`/features/${f.slug}`} className="card block p-6 hover:border-ink-600">
            <span className="display text-xs font-bold text-court">{f.kicker}</span>
            <h2 className="display mt-1 text-2xl font-bold leading-tight">{f.nav}</h2>
            <p className="mt-2 text-sm text-ink-400">{f.description}</p>
          </Link>
        ))}
        <Link href="/tools/betting-odds-calculator" className="card block p-6 hover:border-ink-600">
          <span className="display text-xs font-bold text-court">Free tool</span>
          <h2 className="display mt-1 text-2xl font-bold leading-tight">Betting odds calculator</h2>
          <p className="mt-2 text-sm text-ink-400">Convert odds, remove the bookmaker&apos;s margin, price a multi and check if a boost is worth it. Free, no sign-up.</p>
        </Link>
      </div>
    </main>
  );
}
