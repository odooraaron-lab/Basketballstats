import { SeasonChips } from "@/components/sport/SeasonChips";
import { SortableTable, type Column, type Row } from "@/components/SortableTable";
import { Empty, PageTitle, Tabs } from "@/components/ui";
import { perGame, statOf } from "@/sports/comps";
import { getSeasonBook, getSeasons, requireComp, resolveSeason } from "@/sports/data";

export const revalidate = 300;
export const maxDuration = 60;

export default async function Stats({ params, searchParams }: { params: Promise<{ comp: string }>; searchParams: Promise<{ season?: string; tab?: string; per?: string; team?: string }> }) {
  const comp = requireComp((await params).comp);
  const sp = await searchParams;
  const [season, seasons] = await Promise.all([resolveSeason(comp, sp.season), getSeasons(comp)]);
  const book = await getSeasonBook(comp, season, true);
  const tab = sp.tab === "teams" ? "teams" : sp.tab === "against" ? "against" : "players";
  const per = sp.per === "total" ? "total" : "avg";
  const cross = comp.source.kind === "espn" && comp.source.crossYear;
  const base = `/sport/${comp.id}/stats`;
  // National team: our players by default (?team=all shows the opposition too)
  const teamFilter = sp.team === "all" ? undefined : sp.team ?? comp.team?.id;

  const header = (
    <>
      <PageTitle sub={`${book.files.length} completed matches added up. Click any column to sort.`} right={<SeasonChips base={base} seasons={seasons} season={season} crossYear={cross} params={{ tab: sp.tab, per: sp.per }} />}>
        Stats
      </PageTitle>
      <Tabs
        base={base}
        active={tab}
        params={{ season: String(season), per: sp.per }}
        tabs={[
          { id: "players", label: "Players" },
          { id: "teams", label: "Team (for)" },
          { id: "against", label: "Team (against)" },
        ]}
      />
    </>
  );
  if (!book.files.length) return <div>{header}<Empty>No completed matches with stats yet this season.</Empty></div>;

  if (tab === "players") {
    const defs = comp.featured.filter((d) => book.players.some((p) => statOf(p.totals, d) != null));
    const maxGames = Math.max(...book.players.map((p) => p.games));
    const minGames = per === "avg" ? Math.max(1, Math.round(maxGames * 0.3)) : 1;
    const columns: Column[] = [
      { key: "team", label: "Team" },
      { key: "gp", label: "GP", fmt: "int" },
      ...defs.map((d) => ({ key: d.label, label: d.short, title: d.label, fmt: (per === "avg" ? (d.fmt === "pct" ? "pct" : "1") : d.fmt === "1" ? "1" : "int") as Column["fmt"], heat: true, invert: d.lowerBetter })),
    ];
    const rows: Row[] = book.players
      .filter((p) => p.games >= minGames && (!teamFilter || p.teamId === teamFilter))
      .map((p) => {
        const t = book.teamSides.get(p.teamId);
        return {
          key: p.id,
          lead: { label: p.name, sub: p.position, href: `/sport/${comp.id}/players/${p.id}?season=${season}`, img: p.headshot, imgKind: "player" as const },
          cells: {
            team: t?.abbr ?? "",
            gp: p.games,
            ...Object.fromEntries(defs.map((d) => {
              return [d.label, per === "avg" ? perGame(p.totals, p.games, d) : d.rate ? statOf(p.totals, d) : statOf(p.totals, d)];
            })),
          },
        };
      });
    const first = defs.find((d) => !d.lowerBetter);
    return (
      <div>
        {header}
        <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
          {(["avg", "total"] as const).map((x) => (
            <a key={x} href={`${base}?season=${season}&tab=players&per=${x}`} className={`chip ${per === x ? "!border-court !text-court" : ""}`}>
              {x === "avg" ? `Per game (min ${minGames} games)` : "Season totals"}
            </a>
          ))}
          {comp.team && (
            <a href={`${base}?season=${season}&tab=players&per=${per}&team=${teamFilter ? "all" : comp.team.id}`} className="chip">
              {teamFilter ? `${comp.team.nickname} only · show opponents too` : `Everyone · ${comp.team.nickname} only`}
            </a>
          )}
        </div>
        <SortableTable columns={columns} rows={rows} defaultSort={first ? { key: first.label, dir: "desc" } : undefined} searchable maxHeight={720} dense />
      </div>
    );
  }

  // Team tables: every stat key the feed gave, per game
  const against = tab === "against";
  const keyLabel = new Map<string, string>();
  for (const f of book.files) for (const r of f.teamStats) if (!keyLabel.has(r.key)) keyLabel.set(r.key, r.label);
  const featuredKeys = comp.teamFeatured.flatMap((d) => d.keys);
  const keys = [...keyLabel.keys()].sort((a, b) => {
    const ia = featuredKeys.indexOf(a);
    const ib = featuredKeys.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  }).slice(0, 28);
  const lower = new Set(comp.teamFeatured.filter((d) => d.lowerBetter).flatMap((d) => d.keys));
  const ladder = new Map(book.ladder.map((r) => [r.teamId, r]));
  const columns: Column[] = [
    { key: "gp", label: "GP", fmt: "int" },
    { key: "pf", label: against ? "Conceded" : "Scored", title: `${comp.scoreWord} per game`, fmt: "1", heat: true, invert: against },
    ...keys.map((k) => ({ key: k, label: keyLabel.get(k)!.length > 14 ? keyLabel.get(k)!.slice(0, 13) + "…" : keyLabel.get(k)!, title: keyLabel.get(k), fmt: "1" as const, heat: true, invert: against ? !lower.has(k) : lower.has(k) })),
  ];
  const rows: Row[] = book.teams.map((t) => {
    const side = book.teamSides.get(t.teamId);
    const lr = ladder.get(t.teamId);
    const src = against ? t.against : t.totals;
    return {
      key: t.teamId,
      lead: { label: side?.name ?? t.teamId, img: side?.logo, imgKind: "team" as const, href: `/sport/${comp.id}/teams/${t.teamId}?season=${season}` },
      cells: {
        gp: t.games,
        pf: lr && lr.played ? (against ? lr.pa : lr.pf) / lr.played : null,
        ...Object.fromEntries(keys.map((k) => [k, src[k] != null ? src[k] / t.games : null])),
      },
    };
  });
  return (
    <div>
      {header}
      <SortableTable columns={columns} rows={rows} leadLabel="Team" defaultSort={{ key: "pf", dir: against ? "asc" : "desc" }} />
      <p className="mt-2 text-[11px] text-ink-500">Per-game averages from every completed match. Green = better.</p>
    </div>
  );
}
