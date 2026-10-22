import Link from "next/link";
import { TeamLogo } from "@/components/Img";
import { SortableTable, type Column, type Row } from "@/components/SortableTable";
import { Card, PageTitle, SeasonPicker } from "@/components/ui";
import { getLeague } from "@/leagues/registry";
import { fmt, hex } from "@/lib/format";
import { getLeagueTable, resolveSeason } from "@/lib/league";
import { fgPct, ftPct, tpPct } from "@/lib/stats";

export const revalidate = 600;

export default async function TeamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ season?: string; type?: string }>;
}) {
  const { league: id } = await params;
  const league = getLeague(id);
  const sel = await resolveSeason(league, await searchParams);
  const table = await getLeagueTable(league, sel.year, sel.type);

  const conferences = [...new Set(table.rows.map((r) => r.standing?.conference).filter(Boolean))] as string[];

  const columns: Column[] = [
    { key: "gp", label: "GP", fmt: "int" },
    { key: "w", label: "W", fmt: "int" },
    { key: "l", label: "L", fmt: "int" },
    { key: "ppg", label: "PPG", group: true, heat: true },
    { key: "oppg", label: "OPP", heat: true, invert: true },
    { key: "total", label: "TOTAL", title: "Average combined points per game" },
    { key: "pace", label: "PACE", group: true, heat: true },
    { key: "ortg", label: "ORtg", heat: true },
    { key: "drtg", label: "DRtg", heat: true, invert: true },
    { key: "net", label: "NET", fmt: "signed1", signed: true },
    { key: "fgp", label: "FG%", fmt: "pct", group: true },
    { key: "tpp", label: "3P%", fmt: "pct" },
    { key: "ftp", label: "FT%", fmt: "pct" },
    { key: "efg", label: "eFG%", fmt: "pct", heat: true },
    { key: "ts", label: "TS%", fmt: "pct", heat: true },
    { key: "fgm", label: "FGM", group: true },
    { key: "fga", label: "FGA" },
    { key: "tpm", label: "3PM" },
    { key: "tpa", label: "3PA" },
    { key: "ftm", label: "FTM" },
    { key: "fta", label: "FTA" },
    { key: "oreb", label: "OREB", group: true },
    { key: "dreb", label: "DREB" },
    { key: "reb", label: "REB", heat: true },
    { key: "ast", label: "AST", heat: true },
    { key: "stl", label: "STL", heat: true },
    { key: "blk", label: "BLK", heat: true },
    { key: "tov", label: "TOV", heat: true, invert: true },
    { key: "pf", label: "PF" },
    { key: "tovPct", label: "TOV%", fmt: "pct", group: true, title: "Turnovers per 100 plays" },
    { key: "ftr", label: "FTr", fmt: "3", title: "FTA / FGA" },
    { key: "tpr", label: "3PAr", fmt: "3", title: "Share of shots that are threes" },
  ];

  const rows: Row[] = table.rows.map((r) => {
    const pg = r.season?.perGame;
    return {
      key: r.team.id,
      lead: { label: r.team.name, img: r.team.logo, imgKind: "team", href: `/${league.id}/teams/${r.team.id}`, sub: r.standing?.conference },
      cells: {
        gp: r.gp || null,
        w: r.standing?.wins ?? null,
        l: r.standing?.losses ?? null,
        ppg: pg ? r.ppg : null,
        oppg: r.oppg,
        total: r.avgTotal,
        pace: pg ? r.pace : null,
        ortg: r.ortg,
        drtg: r.drtg,
        net: r.net,
        fgp: pg ? fgPct(pg) : null,
        tpp: pg ? tpPct(pg) : null,
        ftp: pg ? ftPct(pg) : null,
        efg: r.efg,
        ts: r.ts,
        fgm: pg?.fgm ?? null,
        fga: pg?.fga ?? null,
        tpm: pg?.tpm ?? null,
        tpa: pg?.tpa ?? null,
        ftm: pg?.ftm ?? null,
        fta: pg?.fta ?? null,
        oreb: pg?.oreb ?? null,
        dreb: pg?.dreb ?? null,
        reb: pg?.reb ?? null,
        ast: pg?.ast ?? null,
        stl: pg?.stl ?? null,
        blk: pg?.blk ?? null,
        tov: pg?.tov ?? null,
        pf: pg?.pf ?? null,
        tovPct: r.tovPct,
        ftr: r.ftRate,
        tpr: r.threeRate,
      },
    };
  });

  return (
    <div className="space-y-6">
      <PageTitle
        sub={`${league.shortName} teams · ${sel.label}`}
        right={<SeasonPicker base={`/${league.id}/teams`} current={sel.current} year={sel.year} type={sel.type} />}
      >
        Teams
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-2">
        {(conferences.length ? conferences : ["All"]).map((conf) => (
          <div key={conf}>
            <h2 className="display mb-2 text-lg font-bold text-ink-300">{conf}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {table.rows
                .filter((r) => conf === "All" || r.standing?.conference === conf)
                .sort((a, b) => (b.standing?.pct ?? 0) - (a.standing?.pct ?? 0) || a.team.name.localeCompare(b.team.name))
                .map((r) => (
                  <Link
                    key={r.team.id}
                    href={`/${league.id}/teams/${r.team.id}`}
                    className="card group relative overflow-hidden p-3 transition hover:border-ink-600"
                  >
                    <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: hex(r.team.color) }} />
                    <div className="flex items-center gap-2">
                      <TeamLogo src={r.team.logo} alt={r.team.abbr} size={32} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold group-hover:text-court">{r.team.shortName}</div>
                        <div className="num text-xs text-ink-400">
                          {r.standing ? `${r.standing.wins}-${r.standing.losses}` : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="num mt-2 flex justify-between text-[11px] text-ink-500">
                      <span>{fmt(r.ppg || null, "1")} ppg</span>
                      <span className={(r.net ?? 0) >= 0 ? "text-win" : "text-loss"}>{fmt(r.net, "signed1")}</span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>

      <Card title="League team stats — per game" right="Click a column to sort · colour = league rank" pad={false}>
        <SortableTable columns={columns} rows={rows} leadLabel="Team" defaultSort={{ key: "net", dir: "desc" }} maxHeight={720} />
      </Card>
    </div>
  );
}
