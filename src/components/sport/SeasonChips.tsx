import Link from "next/link";

export function SeasonChips({ base, seasons, season, params = {}, crossYear }: { base: string; seasons: number[]; season: number; params?: Record<string, string | undefined>; crossYear?: boolean }) {
  if (seasons.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {seasons.map((s) => {
        const q = new URLSearchParams();
        Object.entries({ ...params, season: String(s) }).forEach(([k, v]) => v && q.set(k, v));
        return (
          <Link key={s} href={`${base}?${q}`} className={`chip ${s === season ? "!border-court !text-court" : "hover:text-ink-100"}`}>
            {crossYear ? `${s}–${String(s + 1).slice(2)}` : s}
          </Link>
        );
      })}
    </div>
  );
}

export const seasonName = (s: number, crossYear?: boolean) => (crossYear ? `${s}–${String(s + 1).slice(2)}` : String(s));
