import Link from "next/link";
import { PostCard } from "@/components/public/PostCard";
import { POSTS, ZONES } from "@/content/blog";
import { site } from "@/site.config";

export const metadata = {
  title: "Betting stats guides for NZ & Australian sport",
  description: "Free guides to betting odds, multis, NZ horse racing form and detailed stats for the All Blacks, NRL, Super Rugby, ANZ Premiership netball, A-League, Super Smash, cricket, NBA and NBL.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Betting stats guides</h1>
      <p className="mt-2 max-w-2xl text-ink-400">How to read the numbers that actually move markets, sport by sport, written for NZ and Australian punters by the {site.name} team.</p>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Sports">
        {ZONES.map((z) => (
          <Link key={z.id} href={`/blog/sport/${z.id}`} className="chip !px-3 !py-1 !text-sm hover:text-ink-100">
            {z.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {POSTS.map((p) => (
          <PostCard key={p.slug} p={p} />
        ))}
      </div>
    </main>
  );
}
