// Small server-rendered SVG: daily visitors (bars) with signups and new subscribers (dots).
export function DailyChart({ data }: { data: { d: string; visitors: number; signups: number; subs: number }[] }) {
  const W = 720;
  const H = 180;
  const pad = { l: 30, r: 8, t: 10, b: 22 };
  const maxV = Math.max(4, ...data.map((x) => x.visitors));
  const maxS = Math.max(2, ...data.map((x) => Math.max(x.signups, x.subs)));
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length);
  const y = (v: number, m: number) => H - pad.b - (v / m) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Daily visitors, signups and new subscribers">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={W - pad.r} y1={y(maxV * f, maxV)} y2={y(maxV * f, maxV)} stroke="rgb(var(--ink-800))" />
          <text x={pad.l - 4} y={y(maxV * f, maxV) + 3} fontSize="9" textAnchor="end" fill="rgb(var(--ink-500))">{Math.round(maxV * f)}</text>
        </g>
      ))}
      {data.map((x, i) => (
        <g key={x.d}>
          <rect x={pad.l + i * bw + 1} y={y(x.visitors, maxV)} width={Math.max(1, bw - 2)} height={H - pad.b - y(x.visitors, maxV)} fill="rgb(var(--ink-700))" rx="1.5">
            <title>{`${x.d}: ${x.visitors} visitors, ${x.signups} signups, ${x.subs} new members`}</title>
          </rect>
          {x.signups > 0 && <circle cx={pad.l + i * bw + bw / 2} cy={y(x.signups, maxS)} r="3.5" fill="#f26b1d" />}
          {x.subs > 0 && <circle cx={pad.l + i * bw + bw / 2} cy={y(x.subs, maxS)} r="3.5" fill="#3fb57a" />}
          {(i % 7 === 0 || i === data.length - 1) && (
            <text x={pad.l + i * bw + bw / 2} y={H - 6} fontSize="9" textAnchor="middle" fill="rgb(var(--ink-500))">{x.d.slice(8)}/{x.d.slice(5, 7)}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
