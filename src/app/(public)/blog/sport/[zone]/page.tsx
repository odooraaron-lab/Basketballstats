import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/public/PostCard";
import { ZONES, postsInZone, zoneById, type ZoneId } from "@/content/blog";
import { priceLabel } from "@/site.config";

export const generateStaticParams = () => ZONES.map((z) => ({ zone: z.id }));

export async function generateMetadata({ params }: { params: Promise<{ zone: string }> }) {
  const z = zoneById((await params).zone);
  if (!z) return {};
  return { title: `${z.label} betting stats & guides`, description: `${z.blurb} Guides to ${z.label} live stats, detailed stats and betting odds for NZ & Australian punters.`, alternates: { canonical: `/blog/sport/${z.id}` } };
}

export default async function Zone({ params }: { params: Promise<{ zone: string }> }) {
  const z = zoneById((await params).zone);
  if (!z) notFound();
  const posts = postsInZone(z.id as ZoneId);
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <Link href="/blog" className="text-sm text-ink-400 hover:text-court">← All guides</Link>
      <h1 className="display mt-2 text-4xl font-extrabold sm:text-5xl">{z.label} betting stats</h1>
      <p className="mt-2 max-w-2xl text-ink-400">{z.blurb}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <PostCard key={p.slug} p={p} />
        ))}
      </div>
      <div className="card mt-10 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="display text-2xl font-extrabold">Live {z.label} stats, projections & the multi builder</div>
          <p className="text-sm text-ink-400">Every game, every player, every tool — {priceLabel}/month.</p>
        </div>
        <Link href="/signup" className="display rounded-xl bg-court px-5 py-3 font-bold text-ink-950 hover:bg-court-soft">Join now</Link>
      </div>
    </main>
  );
}
