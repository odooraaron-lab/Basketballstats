import type { Flow } from "@/lib/pbp";

export function LeadChart({
  flow,
  homeColor,
  awayColor,
  homeAbbr,
  awayAbbr,
  periodBreaks,
}: {
  flow: Flow;
  homeColor: string;
  awayColor: string;
  homeAbbr: string;
  awayAbbr: string;
  periodBreaks: { t: number; label: string }[];
}) {
  const W = 800;
  const H = 220;
  const pad = { l: 34, r: 10, t: 12, b: 22 };
  const maxM = Math.max(5, ...flow.points.map((p) => Math.abs(p.margin)));
  const total = flow.totalSeconds || 1;
  const x = (t: number) => pad.l + (t / total) * (W - pad.l - pad.r);
  const y = (m: number) => pad.t + ((maxM - m) / (2 * maxM)) * (H - pad.t - pad.b);
  // step path
  let d = `M${x(0)},${y(0)}`;
  let prev = 0;
  for (const p of flow.points) {
    d += ` L${x(p.t)},${y(prev)} L${x(p.t)},${y(p.margin)}`;
    prev = p.margin;
  }
  const area = `${d} L${x(total)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [maxM, Math.round(maxM / 2), 0, -Math.round(maxM / 2), -maxM];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Score margin over time">
      <defs>
        <clipPath id="above">
          <rect x="0" y="0" width={W} height={y(0)} />
        </clipPath>
        <clipPath id="below">
          <rect x="0" y={y(0)} width={W} height={H} />
        </clipPath>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#3a4350" : "#1c2129"} />
          <text x={pad.l - 6} y={y(t) + 3} fontSize="10" textAnchor="end" fill="#5b6573" fontFamily="var(--font-mono)">
            {Math.abs(t)}
          </text>
        </g>
      ))}
      {periodBreaks.map((b) => (
        <g key={b.label}>
          <line x1={x(b.t)} x2={x(b.t)} y1={pad.t} y2={H - pad.b} stroke="#283039" strokeDasharray="3 3" />
          <text x={x(b.t) + 4} y={H - 6} fontSize="10" fill="#5b6573" fontFamily="var(--font-display)">
            {b.label}
          </text>
        </g>
      ))}
      <path d={area} fill={homeColor} opacity="0.35" clipPath="url(#above)" />
      <path d={area} fill={awayColor} opacity="0.35" clipPath="url(#below)" />
      <path d={d} fill="none" stroke="#d6dce4" strokeWidth="1.4" />
      <text x={pad.l + 4} y={pad.t + 10} fontSize="11" fill={homeColor} fontWeight="700" fontFamily="var(--font-display)">
        {homeAbbr} LEADS
      </text>
      <text x={pad.l + 4} y={H - pad.b - 4} fontSize="11" fill={awayColor} fontWeight="700" fontFamily="var(--font-display)">
        {awayAbbr} LEADS
      </text>
    </svg>
  );
}

/** Simple bar chart of points per period for both teams. */
export function PeriodBars({
  labels,
  away,
  home,
  awayColor,
  homeColor,
}: {
  labels: string[];
  away: number[];
  home: number[];
  awayColor: string;
  homeColor: string;
}) {
  const max = Math.max(1, ...away, ...home);
  return (
    <div className="flex h-36 items-end gap-3">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-28 w-full items-end justify-center gap-1">
            {[
              [away[i] ?? 0, awayColor],
              [home[i] ?? 0, homeColor],
            ].map(([v, c], j) => (
              <div key={j} className="flex w-1/2 max-w-[22px] flex-col items-center justify-end">
                <span className="num mb-0.5 text-[10px] text-ink-400">{v as number}</span>
                <div className="w-full rounded-t" style={{ height: `${((v as number) / max) * 88}px`, background: c as string }} />
              </div>
            ))}
          </div>
          <span className="display text-[11px] text-ink-500">{l}</span>
        </div>
      ))}
    </div>
  );
}
