import Link from "next/link";
import { TeamMark } from "@/components/sport/TeamMark";
import { PageTitle } from "@/components/ui";
import { ordinal } from "@/sports/comps";
import { getSeasonBook, requireComp, resolveSeason } from "@/sports/data";

export const revalidate = 300;

export default async function Teams({ params, searchParams }: { params: Promise<{ comp: string }>; searchParams: Promise<{ season?: string }> }) {
  const comp = requireComp((await params).comp);
  const season = await resolveSeason(comp, (await searchParams).season);
  const book = await getSeasonBook(comp, season, false);
  const teams = [...book.teamSides.values()].sort((a, b) => a.name.localeCompare(b.name));
  const pos = new Map(book.ladder.map((r) => [r.teamId, r]));
  return (
    <div>
      <PageTitle sub={`${teams.length} teams`}>Teams</PageTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => {
          const r = pos.get(t.id);
          return (
            <Link key={t.id} href={`/sport/${comp.id}/teams/${t.id}?season=${season}`} className="card flex items-center gap-3 p-3 hover:border-ink-600">
              <TeamMark t={t} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{t.name}</div>
                {r && (
                  <div className="text-xs text-ink-400">
                    {ordinal(r.pos)} · {r.won}-{comp.sport !== "netball" ? `${r.drawn}-` : ""}
                    {r.lost} · {r.points} pts
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
