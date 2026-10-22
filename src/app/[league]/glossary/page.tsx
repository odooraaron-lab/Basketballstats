import { Card, PageTitle } from "@/components/ui";
import { getLeague } from "@/leagues/registry";
import { periodLabel } from "@/lib/rules";

export default async function GlossaryPage({ params }: { params: Promise<{ league: string }> }) {
  const { league: id } = await params;
  const league = getLeague(id);
  const r = league.rules;

  const roadmap: [string, string, string][] = [
    ["Live", "Box scores, play-by-play, shot locations, standings, rosters, injuries, schedules, odds lines", "ESPN public feeds"],
    ["Live", "TS%, eFG%, USG%, AST%, REB%, OREB%/DREB%, STL%, BLK%, PER (est.), Game Score, ORtg/DRtg/Net, Pace, Four Factors", "Calculated in-app"],
    ["Live", "Shot zones, shot charts & heatmaps, xPPS / shot-making, runs, lead changes, clutch splits, live- vs dead-ball turnovers, possession log, reconstructed 5-man lineups", "Calculated from play-by-play"],
    ["Proxy", "Play type (drive, pull-up, post, catch-and-shoot)", "Estimated from shot descriptions + assisted/unassisted"],
    ["Not public", "Shot contest level, defensive matchups (who guarded who), hustle stats (deflections, box-outs, charges), Synergy play types", "NBA tracking data — stats.nba.com blocks cloud servers like Vercel; would need a paid feed or a manual-tracking module"],
    ["Next", "Manual stat entry (touch / keyboard) for your own leagues, saved to a database", "Add a Postgres (e.g. Neon) league environment"],
  ];

  return (
    <div className="space-y-5">
      <PageTitle sub={`How every number in the ${league.shortName} environment is defined`}>Glossary & rules</PageTitle>

      <Card title={`${league.shortName} rule set`} right="Every timing calculation reads from this">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {(
            [
              ["Game", `${r.periods} × ${r.periodMinutes} min`],
              ["Overtime", `${r.overtimeMinutes} min (${periodLabel(r, r.periods + 1)})`],
              ["Shot clock", r.shotClock ? `${r.shotClock}s (reset ${r.shotClockOffensiveReset}s on OREB)` : "None"],
              ["Foul out", `${r.foulOutLimit} fouls`],
              ["Bonus", `${r.bonusFouls} team fouls / period`],
              ["3PT line", `${r.threePointFt} ft (corner ${r.cornerThreeFt} ft)`],
              ["Clutch", `Last ${r.clutch.seconds / 60} min of ${periodLabel(r, r.periods)}/OT, ≤ ${r.clutch.margin} pts`],
              ["On court", `${r.playersOnCourt} per side`],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-md bg-ink-950/60 px-3 py-2">
              <dt className="display text-[11px] text-ink-500">{k}</dt>
              <dd className="mt-0.5 text-ink-100">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Stat definitions" pad={false}>
        <table className="stat-table">
          <thead>
            <tr>
              <th>Stat</th>
              <th className="!text-left">Name</th>
              <th className="!text-left">Formula</th>
              <th className="!text-left">What it tells you</th>
            </tr>
          </thead>
          <tbody>
            {league.statDefinitions.map((d) => (
              <tr key={d.key}>
                <td className="display font-semibold !text-court">{d.label}</td>
                <td className="!text-left font-sans">{d.name}</td>
                <td className="!text-left !whitespace-normal text-xs text-ink-400">{d.formula ?? "—"}</td>
                <td className="!text-left !whitespace-normal font-sans text-ink-300">{d.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Expected FG% by zone (xPPS baseline)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(league.zoneBaselines).map(([z, v]) => (
            <div key={z} className="rounded-md bg-ink-950/60 px-3 py-2">
              <div className="display text-[11px] text-ink-500">{z}</div>
              <div className="num text-lg">{(v * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Data coverage" pad={false}>
        <table className="stat-table">
          <tbody>
            {roadmap.map(([s, what, src]) => (
              <tr key={what}>
                <td>
                  <span
                    className={`chip ${s === "Live" ? "!border-win/50 !text-win" : s === "Proxy" ? "!border-court/50 !text-court" : s === "Next" ? "" : "!border-loss/40 !text-loss"}`}
                  >
                    {s}
                  </span>
                </td>
                <td className="!text-left !whitespace-normal font-sans text-ink-200">{what}</td>
                <td className="!text-left !whitespace-normal font-sans text-xs text-ink-500">{src}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
