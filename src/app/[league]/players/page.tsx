import Link from "next/link";
import { SortableTable, type Column, type Row } from "@/components/SortableTable";
import { Card, Empty, PageTitle, SeasonPicker } from "@/components/ui";
import { getLeague } from "@/leagues/registry";
import { LEADER_SORTS, getLeaders } from "@/lib/espn";
import { resolveSeason } from "@/lib/league";
import { emptyBox, effectiveFg, trueShooting } from "@/lib/stats";

export const revalidate = 900;

export default async function PlayersPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ season?: string; type?: string; sort?: string; page?: string; all?: string }>;
}) {
  const { league: id } = await params;
  const sp = await searchParams;
  const league = getLeague(id);
  const sel = await resolveSeason(league, sp);
  const sortKey = sp.sort && LEADER_SORTS[sp.sort] ? sp.sort : "pts";
  const page = Math.max(1, Number(sp.page) || 1);
  const qualified = sp.all !== "1";
  const data = await getLeaders(league, { season: sel.year, seasonType: sel.type, sortKey, page, limit: 100, qualified });

  const href = (o: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const merged = { season: sp.season, type: sp.type, sort: sortKey, all: sp.all, ...o };
    Object.entries(merged).forEach(([k, v]) => v != null && v !== "" && q.set(k, String(v)));
    return `/${league.id}/players?${q}`;
  };

  const columns: Column[] = [
    { key: "gp", label: "GP", fmt: "int" },
    { key: "min", label: "MIN" },
    { key: "pts", label: "PTS", group: true, heat: true },
    { key: "fgm", label: "FGM", group: true },
    { key: "fga", label: "FGA" },
    { key: "fgp", label: "FG%", fmt: "1" },
    { key: "tpm", label: "3PM" },
    { key: "tpa", label: "3PA" },
    { key: "tpp", label: "3P%", fmt: "1" },
    { key: "ftm", label: "FTM" },
    { key: "fta", label: "FTA" },
    { key: "ftp", label: "FT%", fmt: "1" },
    { key: "reb", label: "REB", group: true, heat: true },
    { key: "ast", label: "AST", heat: true },
    { key: "stl", label: "STL", heat: true },
    { key: "blk", label: "BLK", heat: true },
    { key: "tov", label: "TOV", invert: true, heat: true },
    { key: "pf", label: "PF" },
    { key: "ts", label: "TS%", fmt: "pct", group: true, heat: true },
    { key: "efg", label: "eFG%", fmt: "pct", heat: true },
    { key: "astto", label: "AST/TO", fmt: "2" },
    { key: "dd2", label: "DD2", fmt: "int", group: true },
    { key: "td3", label: "TD3", fmt: "int" },
  ];

  const rows: Row[] = data.rows.map((r) => {
    const v = r.values;
    const box = {
      ...emptyBox(),
      pts: v.avgPoints ?? 0,
      fgm: v.avgFieldGoalsMade ?? 0,
      fga: v.avgFieldGoalsAttempted ?? 0,
      tpm: v.avgThreePointFieldGoalsMade ?? 0,
      tpa: v.avgThreePointFieldGoalsAttempted ?? 0,
      ftm: v.avgFreeThrowsMade ?? 0,
      fta: v.avgFreeThrowsAttempted ?? 0,
    };
    return {
      key: r.player.id,
      lead: {
        label: r.player.name,
        sub: [r.teamAbbr, r.player.pos].filter(Boolean).join(" · "),
        img: r.player.headshot,
        href: `/${league.id}/players/${r.player.id}`,
      },
      cells: {
        gp: v.gamesPlayed ?? null,
        min: v.avgMinutes ?? null,
        pts: v.avgPoints ?? null,
        fgm: v.avgFieldGoalsMade ?? null,
        fga: v.avgFieldGoalsAttempted ?? null,
        fgp: v.fieldGoalPct ?? null,
        tpm: v.avgThreePointFieldGoalsMade ?? null,
        tpa: v.avgThreePointFieldGoalsAttempted ?? null,
        tpp: v.threePointFieldGoalPct ?? null,
        ftm: v.avgFreeThrowsMade ?? null,
        fta: v.avgFreeThrowsAttempted ?? null,
        ftp: v.freeThrowPct ?? null,
        reb: v.avgRebounds ?? null,
        ast: v.avgAssists ?? null,
        stl: v.avgSteals ?? null,
        blk: v.avgBlocks ?? null,
        tov: v.avgTurnovers ?? null,
        pf: v.avgFouls ?? null,
        ts: trueShooting(box),
        efg: effectiveFg(box),
        astto: v.avgTurnovers ? (v.avgAssists ?? 0) / v.avgTurnovers : null,
        dd2: v.doubleDouble ?? null,
        td3: v.tripleDouble ?? null,
      },
    };
  });

  return (
    <div className="space-y-5">
      <PageTitle
        sub={`${league.shortName} player leaderboard · ${sel.label} · per game`}
        right={<SeasonPicker base={`/${league.id}/players`} current={sel.current} year={sel.year} type={sel.type} extra={{ sort: sortKey }} />}
      >
        Players
      </PageTitle>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="display mr-1 text-xs text-ink-500">Rank by</span>
        {Object.entries(LEADER_SORTS).map(([k, v]) => (
          <Link key={k} href={href({ sort: k, page: 1 })} className={`chip ${k === sortKey ? "!border-court !text-court" : "hover:text-ink-100"}`}>
            {v.label}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-ink-700" />
        <Link href={href({ all: qualified ? "1" : "", page: 1 })} className={`chip ${!qualified ? "!border-court !text-court" : ""}`}>
          {qualified ? "Qualified only" : "All players"}
        </Link>
      </div>

      <Card title={`${LEADER_SORTS[sortKey].label} leaders`} right={`${data.count} players · page ${page} of ${data.pages || 1}`} pad={false}>
        {rows.length ? (
          <SortableTable columns={columns} rows={rows} searchable maxHeight={760} />
        ) : (
          <div className="p-4">
            <Empty>
              No player stats for {sel.label} yet.{" "}
              <Link className="text-court" href={href({ season: sel.current - 1, page: 1 })}>
                See last season →
              </Link>
            </Empty>
          </div>
        )}
      </Card>

      {data.pages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={href({ page: page - 1 })} className="chip">
              ← Prev
            </Link>
          )}
          <span className="chip num">
            {page} / {data.pages}
          </span>
          {page < data.pages && (
            <Link href={href({ page: page + 1 })} className="chip">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
