import Link from "next/link";
import type { CompDef } from "@/sports/comps";
import type { LadderRow } from "@/sports/model";
import { TeamMark } from "./TeamMark";

const formCls = (r: string) => (r === "W" ? "bg-win/25 text-win" : r === "L" ? "bg-loss/25 text-loss" : "bg-ink-700 text-ink-300");

export function LadderTable({ comp, rows, compact = false, season }: { comp: CompDef; rows: LadderRow[]; compact?: boolean; season?: number }) {
  if (!rows.length) return <p className="p-4 text-sm text-ink-500">No ladder yet.</p>;
  const showDraw = comp.sport !== "netball";
  const showBye = Boolean(comp.points.bye);
  const showBonus = comp.points.lossBonusMargin != null || rows.some((r) => r.bonus);
  return (
    <div className="overflow-x-auto">
      <table className="stat-table compact">
        <thead>
          <tr>
            <th>#</th>
            <th className="!text-left">Team</th>
            <th>P</th>
            <th>W</th>
            {showDraw && <th>D</th>}
            <th>L</th>
            {showBye && !compact && <th>B</th>}
            {!compact && <th>{comp.sport === "soccer" ? "GF" : "PF"}</th>}
            {!compact && <th>{comp.sport === "soccer" ? "GA" : "PA"}</th>}
            <th>{comp.sport === "soccer" ? "GD" : "Diff"}</th>
            {showBonus && !compact && <th>BP</th>}
            <th>Pts</th>
            {!compact && <th className="!text-left">Form</th>}
            {!compact && <th>Home</th>}
            {!compact && <th>Away</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.teamId} className={r.pos === comp.finals ? "border-b-2 border-b-court/60" : ""}>
              <td className={r.pos <= comp.finals ? "font-semibold !text-court" : ""}>{r.pos}</td>
              <td className="!text-left font-sans">
                <Link href={`/sport/${comp.id}/teams/${r.teamId}${season ? `?season=${season}` : ""}`} className="flex items-center gap-2 hover:text-court">
                  <TeamMark t={r.team} size={20} />
                  <span className="truncate">{compact ? r.team.abbr || r.team.name : r.team.name}</span>
                </Link>
              </td>
              <td>{r.played}</td>
              <td>{r.won}</td>
              {showDraw && <td>{r.drawn}</td>}
              <td>{r.lost}</td>
              {showBye && !compact && <td>{r.byes}</td>}
              {!compact && <td>{r.pf}</td>}
              {!compact && <td>{r.pa}</td>}
              <td className={r.diff > 0 ? "!text-win" : r.diff < 0 ? "!text-loss" : ""}>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              {showBonus && !compact && <td>{r.bonus}</td>}
              <td className="font-bold !text-ink-100">{r.points}</td>
              {!compact && (
                <td className="!text-left">
                  <span className="inline-flex gap-0.5">
                    {r.form.map((x, i) => (
                      <span key={i} className={`w-4 rounded text-center text-[10px] font-bold ${formCls(x)}`}>
                        {x}
                      </span>
                    ))}
                  </span>
                </td>
              )}
              {!compact && <td className="text-xs">{r.homeRec}</td>}
              {!compact && <td className="text-xs">{r.awayRec}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
