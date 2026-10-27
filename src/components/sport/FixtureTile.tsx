import Link from "next/link";
import { fmtDay, fmtTime } from "@/lib/format";
import type { Fixture, Projection } from "@/sports/model";
import { TeamMark } from "./TeamMark";

const pct = (p: number) => `${Math.round(p * 100)}%`;

export function FixtureTile({ f, proj, ladder }: { f: Fixture; proj?: Projection | null; ladder?: Map<string, number> }) {
  const rows = [
    { s: f.home, p: proj?.pHome, exp: proj?.home },
    { s: f.away, p: proj?.pAway, exp: proj?.away },
  ];
  return (
    <Link href={`/sport/${f.comp}/match/${f.id}?season=${f.season}`} className="card block p-3 transition hover:border-ink-600">
      <div className="mb-2 flex items-center gap-2 text-[11px]">
        {f.state === "in" ? (
          <span className="flex items-center gap-1 font-semibold text-loss">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-loss" /> LIVE {f.status}
          </span>
        ) : f.state === "pre" ? (
          <span className="text-ink-300">
            {fmtDay(f.date)} · {fmtTime(f.date)}
          </span>
        ) : (
          <span className="font-semibold text-ink-400">Full time · {fmtDay(f.date)}</span>
        )}
        <span className="ml-auto truncate text-ink-600">{f.final ? f.roundLabel : f.stage || f.venue}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(({ s, p, exp }) => {
          const won = f.winnerId === s.id;
          return (
            <div key={s.id} className="flex items-center gap-2.5">
              <TeamMark t={s} size={24} />
              <span className={`flex-1 truncate text-sm ${won ? "font-semibold text-ink-100" : "text-ink-300"}`}>
                {s.name}
                {ladder?.get(s.id) && <span className="ml-1 text-[10px] text-ink-500">{ladder.get(s.id)}</span>}
              </span>
              {f.state === "pre" ? (
                p != null && (
                  <span className="num text-xs text-ink-400">
                    {exp != null && <span className="mr-2 text-ink-500">{exp.toFixed(f.comp.startsWith("a-league") ? 1 : 0)}</span>}
                    <b className={p >= 0.5 ? "text-court" : "text-ink-300"}>{pct(p)}</b>
                  </span>
                )
              ) : (
                <span className={`num text-sm ${won ? "font-bold text-ink-100" : "text-ink-300"}`}>{s.score ?? ""}</span>
              )}
            </div>
          );
        })}
      </div>
      {f.state === "pre" && proj && proj.pDraw > 0.05 && <div className="mt-1 text-right text-[10px] text-ink-500">draw {pct(proj.pDraw)}</div>}
    </Link>
  );
}
