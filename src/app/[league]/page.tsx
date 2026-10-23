import Link from "next/link";
import { Headshot, TeamLogo } from "@/components/Img";
import { Card, Empty, GameTile, PageTitle, Stat } from "@/components/ui";
import { getLeague } from "@/leagues/registry";
import { getLeaders, getUpcoming, seasonLabel } from "@/lib/espn";
import { espnDayLabel, fmt } from "@/lib/format";
import { getLeagueTable, projectGame, resolveSeason } from "@/lib/league";

export const revalidate = 60;

export default async function Dashboard({ params }: { params: Promise<{ league: string }> }) {
  const { league: id } = await params;
  const league = getLeague(id);
  const season = await resolveSeason(league, undefined);

  let table = await getLeagueTable(league, season.year, 2);
  let tableYear = season.year;
  if (!table.averages) {
    table = await getLeagueTable(league, season.year - 1, 2);
    tableYear = season.year - 1;
  }
  const rowMap = new Map(table.rows.map((r) => [r.team.id, r]));

  const cats = ["pts", "reb", "ast", "stl", "blk", "tpm"] as const;
  let leaderYear = season.year;
  let leaders = await Promise.all(cats.map((c) => getLeaders(league, { season: leaderYear, sortKey: c, limit: 5 })));
  if (leaders.every((l) => !l.rows.length)) {
    leaderYear = season.year - 1;
    leaders = await Promise.all(cats.map((c) => getLeaders(league, { season: leaderYear, sortKey: c, limit: 5 })));
  }

  const days = await getUpcoming(league, 7);
  const today = days[0]?.games ?? [];
  const later = days.slice(1).filter((d) => d.games.length);
  const live = today.filter((g) => g.state === "in").length;

  const totals = table.rows
    .filter((r) => r.avgTotal != null)
    .sort((a, b) => (b.avgTotal ?? 0) - (a.avgTotal ?? 0));

  const leaderMeta: Record<(typeof cats)[number], { title: string; key: string }> = {
    pts: { title: "Points", key: "avgPoints" },
    reb: { title: "Rebounds", key: "avgRebounds" },
    ast: { title: "Assists", key: "avgAssists" },
    stl: { title: "Steals", key: "avgSteals" },
    blk: { title: "Blocks", key: "avgBlocks" },
    tpm: { title: "3-Pointers made", key: "avgThreePointFieldGoalsMade" },
  };

  return (
    <div className="space-y-6">
      <PageTitle sub={`${league.name} · ${season.label} season`}>Dashboard</PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="League PPG" value={fmt(table.averages?.ppg, "1")} sub={seasonLabel(tableYear)} />
        <Stat label="Avg game total" value={fmt(table.averages?.total, "1")} sub="Both teams combined" tone="accent" />
        <Stat label="Avg pace" value={fmt(table.averages?.pace, "1")} sub="Possessions / 48" />
        <Stat label="Avg off. rating" value={fmt(table.averages?.ortg, "1")} sub="Pts / 100 poss" />
        <Stat label="Games today" value={today.length} sub="US Eastern game day" />
        <Stat label="Live now" value={live} tone={live ? "loss" : undefined} />
      </div>

      <Card
        title={`Today · ${days[0] ? espnDayLabel(days[0].date) : ""}`}
        right={
          <span className="flex items-center gap-3">
            <span>Times shown in NZ time</span>
            {today.length > 0 && (
              <Link href={`/${league.id}/scan`} className="display rounded-md bg-court px-2.5 py-1 text-xs font-bold text-ink-950 hover:bg-court-soft">
                Scan today&apos;s games
              </Link>
            )}
          </span>
        }
      >
        {today.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {today.map((g) => (
              <GameTile key={g.id} g={g} league={league.id} projection={projectGame(g, rowMap)} />
            ))}
          </div>
        ) : (
          <Empty>No games today.</Empty>
        )}
      </Card>

      <Card title="Upcoming — next 7 days" right="Proj = blended team PPG vs opponent's points allowed">
        {later.length ? (
          <div className="space-y-5">
            {later.map((d) => (
              <div key={d.date}>
                <div className="display mb-2 text-sm font-semibold text-ink-400">{espnDayLabel(d.date)}</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {d.games.map((g) => (
                    <GameTile key={g.id} g={g} league={league.id} projection={projectGame(g, rowMap)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No upcoming games found.</Empty>
        )}
      </Card>

      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="display text-xl font-bold">League leaders</h2>
          <Link href={`/${league.id}/players?season=${leaderYear}`} className="text-xs text-court hover:underline">
            Full leaderboard · {seasonLabel(leaderYear)} →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c, i) => (
            <Card key={c} title={leaderMeta[c].title} pad={false}>
              {leaders[i].rows.length ? (
                <ol>
                  {leaders[i].rows.map((r, n) => (
                    <li key={r.player.id} className="flex items-center gap-3 border-t border-ink-850 px-4 py-2 first:border-t-0">
                      <span className="num w-4 text-xs text-ink-500">{n + 1}</span>
                      <Headshot src={r.player.headshot} name={r.player.name} size={n === 0 ? 40 : 30} />
                      <Link href={`/${league.id}/players/${r.player.id}`} className="min-w-0 flex-1 hover:text-court">
                        <div className="truncate text-sm font-medium">{r.player.name}</div>
                        <div className="text-[11px] text-ink-500">{r.teamAbbr}</div>
                      </Link>
                      <span className={`num ${n === 0 ? "text-lg font-semibold text-court" : "text-sm text-ink-200"}`}>
                        {fmt(r.values[leaderMeta[c].key], "1")}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="p-4">
                  <Empty>No data yet.</Empty>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Highest average game totals" right={`${seasonLabel(tableYear)} · team PPG + opp PPG`} pad={false}>
          <div className="max-h-[420px] overflow-auto">
            <table className="stat-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>PPG</th>
                  <th>OPP</th>
                  <th>Total</th>
                  <th>Pace</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((r) => (
                  <tr key={r.team.id}>
                    <td>
                      <Link href={`/${league.id}/teams/${r.team.id}`} className="flex items-center gap-2 font-sans hover:text-court">
                        <TeamLogo src={r.team.logo} alt={r.team.abbr} size={20} />
                        {r.team.name}
                      </Link>
                    </td>
                    <td>{fmt(r.ppg, "1")}</td>
                    <td>{fmt(r.oppg, "1")}</td>
                    <td className="font-semibold !text-court-soft">{fmt(r.avgTotal, "1")}</td>
                    <td>{fmt(r.pace, "1")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Net rating" right="Points per 100 possessions (off − def)" pad={false}>
          <div className="max-h-[420px] overflow-auto">
            <table className="stat-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>W-L</th>
                  <th>ORtg</th>
                  <th>DRtg</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {[...table.rows]
                  .filter((r) => r.net != null)
                  .sort((a, b) => (b.net ?? 0) - (a.net ?? 0))
                  .map((r) => (
                    <tr key={r.team.id}>
                      <td>
                        <Link href={`/${league.id}/teams/${r.team.id}`} className="flex items-center gap-2 font-sans hover:text-court">
                          <TeamLogo src={r.team.logo} alt={r.team.abbr} size={20} />
                          {r.team.name}
                        </Link>
                      </td>
                      <td>{r.standing ? `${r.standing.wins}-${r.standing.losses}` : "–"}</td>
                      <td>{fmt(r.ortg, "1")}</td>
                      <td>{fmt(r.drtg, "1")}</td>
                      <td className={(r.net ?? 0) > 0 ? "!text-win" : "!text-loss"}>{fmt(r.net, "signed1")}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
