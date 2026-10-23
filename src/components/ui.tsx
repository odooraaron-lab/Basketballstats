import Link from "next/link";
import type { GameCard, GameSide } from "@/lib/model";
import { fmt, fmtDay, fmtTime } from "@/lib/format";
import { TeamLogo } from "./Img";

export function Card({
  title,
  right,
  children,
  className = "",
  pad = true,
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-h">
          <span>{title}</span>
          {right && <span className="font-sans text-xs font-normal normal-case tracking-normal text-ink-500">{right}</span>}
        </div>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function PageTitle({ children, sub, right }: { children: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="display text-3xl font-extrabold text-ink-100 sm:text-4xl">{children}</h1>
        {sub && <p className="mt-1 text-sm text-ink-400">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "win" | "loss" | "accent" }) {
  const toneCls = tone === "win" ? "text-win" : tone === "loss" ? "text-loss" : tone === "accent" ? "text-court" : "text-ink-100";
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950/60 px-3 py-2.5">
      <div className="display text-[11px] font-semibold text-ink-500">{label}</div>
      <div className={`num mt-0.5 text-xl font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-500">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-ink-700 px-4 py-8 text-center text-sm text-ink-500">{children}</div>;
}

export function Tabs({ base, tabs, active, params = {} }: { base: string; tabs: { id: string; label: string }[]; active: string; params?: Record<string, string | undefined> }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-ink-800 pb-2">
      {tabs.map((t) => {
        const q = new URLSearchParams();
        Object.entries({ ...params, tab: t.id }).forEach(([k, v]) => v && q.set(k, v));
        return (
          <Link key={t.id} href={`${base}?${q}`} scroll={false} className={`tab ${active === t.id ? "tab-active" : ""}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export function SeasonPicker({
  base,
  current,
  year,
  type,
  extra = {},
}: {
  base: string;
  current: number;
  year: number;
  type: number;
  extra?: Record<string, string | undefined>;
}) {
  const years = Array.from({ length: 6 }, (_, i) => current - i);
  const href = (y: number, t: number) => {
    const q = new URLSearchParams();
    Object.entries(extra).forEach(([k, v]) => v && q.set(k, v));
    q.set("season", String(y));
    q.set("type", String(t));
    return `${base}?${q}`;
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {years.map((y) => (
        <Link
          key={y}
          href={href(y, type)}
          className={`chip num ${y === year ? "!border-court !text-court" : "hover:text-ink-100"}`}
        >
          {y - 1}-{String(y).slice(2)}
        </Link>
      ))}
      <span className="mx-1 h-4 w-px bg-ink-700" />
      <Link href={href(year, 2)} className={`chip ${type === 2 ? "!border-court !text-court" : ""}`}>
        Regular
      </Link>
      <Link href={href(year, 3)} className={`chip ${type === 3 ? "!border-court !text-court" : ""}`}>
        Playoffs
      </Link>
    </div>
  );
}

function SideRow({ s, state, bold }: { s: GameSide; state: GameCard["state"]; bold: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamLogo src={s.team.logo} alt={s.team.abbr} size={26} />
      <span className={`flex-1 truncate text-sm ${bold ? "font-semibold text-ink-100" : "text-ink-300"}`}>
        {s.team.shortName || s.team.name}
        {s.record && <span className="num ml-1.5 text-[11px] text-ink-500">{s.record}</span>}
      </span>
      {state !== "pre" && <span className={`num text-lg ${bold ? "font-bold text-ink-100" : "text-ink-400"}`}>{s.score ?? ""}</span>}
    </div>
  );
}

export function GameTile({ g, league, projection }: { g: GameCard; league: string; projection?: { away: number; home: number } | null }) {
  const awayWin = g.state === "post" && (g.away.winner || (g.away.score ?? 0) > (g.home.score ?? 0));
  const homeWin = g.state === "post" && !awayWin;
  return (
    <Link
      href={`/${league}/games/${g.id}`}
      className="card group block p-3 transition hover:border-ink-600"
    >
      <div className="mb-2 flex items-center justify-between text-[11px]">
        {g.state === "in" ? (
          <span className="flex items-center gap-1.5 font-semibold text-loss">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-loss" />
            {g.shortDetail || g.detail}
          </span>
        ) : g.state === "post" ? (
          <span className="font-semibold text-ink-400">{g.shortDetail || "Final"}</span>
        ) : (
          <span className="text-ink-400">
            {fmtDay(g.date)} · <span className="text-ink-200">{fmtTime(g.date)}</span>
          </span>
        )}
        <span className="truncate pl-2 text-ink-600">{g.broadcast}</span>
      </div>
      <div className="space-y-1.5">
        <SideRow s={g.away} state={g.state} bold={g.state !== "post" || awayWin} />
        <SideRow s={g.home} state={g.state} bold={g.state !== "post" || homeWin} />
      </div>
      {(g.odds || projection || g.state === "pre") && g.state !== "post" && (
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-ink-800 pt-2 text-[11px] text-ink-500">
          {g.odds?.details && <span>Line {g.odds.details}</span>}
          {g.odds?.overUnder != null && <span>O/U <span className="num text-ink-300">{g.odds.overUnder}</span></span>}
          {projection && (
            <span>
              Proj{" "}
              <span className="num text-ink-300">
                {fmt(projection.away, "int")}–{fmt(projection.home, "int")}
              </span>{" "}
              (<span className="num text-court-soft">{fmt(projection.away + projection.home, "int")}</span>)
            </span>
          )}
          {g.state === "pre" && <span className="ml-auto text-court group-hover:underline">Compare players →</span>}
        </div>
      )}
    </Link>
  );
}

/** Horizontal comparison bar for two teams. */
export function CompareBar({
  label,
  a,
  b,
  fmtKind = "1",
  colorA,
  colorB,
  lowerBetter,
}: {
  label: string;
  a: number | null;
  b: number | null;
  fmtKind?: Parameters<typeof fmt>[1];
  colorA: string;
  colorB: string;
  lowerBetter?: boolean;
}) {
  const av = a ?? 0;
  const bv = b ?? 0;
  const total = Math.abs(av) + Math.abs(bv) || 1;
  const aBetter = lowerBetter ? av < bv : av > bv;
  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={`num ${aBetter ? "font-semibold text-ink-100" : "text-ink-400"}`}>{fmt(a, fmtKind)}</span>
        <span className="display text-[11px] text-ink-500">{label}</span>
        <span className={`num ${!aBetter && av !== bv ? "font-semibold text-ink-100" : "text-ink-400"}`}>{fmt(b, fmtKind)}</span>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-ink-800">
        <div style={{ width: `${(Math.abs(av) / total) * 100}%`, background: colorA }} />
        <div className="ml-auto" style={{ width: `${(Math.abs(bv) / total) * 100}%`, background: colorB }} />
      </div>
    </div>
  );
}

export function Bars({ items, max, fmtKind = "1", color = "#f26b1d" }: { items: { label: string; value: number; sub?: string }[]; max?: number; fmtKind?: Parameters<typeof fmt>[1]; color?: string }) {
  const m = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-1.5">
      {items.map((i) => (
        <div key={i.label} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-2 text-xs">
          <span className="truncate text-ink-300">{i.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-ink-800">
            <span className="block h-full rounded-full" style={{ width: `${(i.value / m) * 100}%`, background: color }} />
          </span>
          <span className="num text-right text-ink-200">
            {fmt(i.value, fmtKind)}
            {i.sub && <span className="ml-1 text-ink-500">{i.sub}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
