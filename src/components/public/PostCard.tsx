import Link from "next/link";
import { readingMinutes, zoneById, type Post } from "@/content/blog";
import { fmtDate } from "@/lib/format";

export function PostCard({ p }: { p: Post }) {
  return (
    <Link href={`/blog/${p.slug}`} className="card flex flex-col p-5 hover:border-ink-600">
      <span className="display text-xs font-bold text-court">{zoneById(p.zone)?.label}</span>
      <h3 className="display mt-1 text-xl font-bold leading-tight">{p.title}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm text-ink-400">{p.description}</p>
      <p className="mt-3 text-xs text-ink-500">
        {fmtDate(p.date, { day: "numeric", month: "short", year: "numeric" })} · {readingMinutes(p)} min read
      </p>
    </Link>
  );
}
