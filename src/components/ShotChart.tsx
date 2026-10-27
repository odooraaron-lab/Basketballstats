"use client";

import { useMemo, useState } from "react";
import type { Shot } from "@/lib/pbp";

const BASELINE_Y = -5.25;
const sx = (x: number) => x * 10;
const sy = (y: number) => Math.min(465, Math.max(5, (y - BASELINE_Y) * 10));

/** Three-point line in feet: arc radius and corner distance from the hoop. */
export interface ThreePointGeo {
  arc: number;
  corner: number;
}
const NBA_THREE: ThreePointGeo = { arc: 23.75, corner: 22 };

function threePath(g: ThreePointGeo) {
  const r = g.arc * 10;
  const hoopY = -BASELINE_Y * 10; // 52.5
  const top = hoopY + Math.sqrt(Math.max(0, g.arc ** 2 - g.corner ** 2)) * 10;
  const l = 250 - g.corner * 10;
  const rt = 250 + g.corner * 10;
  return `M${l} 0 L${l} ${top.toFixed(1)} A${r} ${r} 0 0 0 ${rt} ${top.toFixed(1)} L${rt} 0`;
}

export function Court({
  children,
  stroke = "rgb(var(--ink-600))",
  three = NBA_THREE,
}: {
  children?: React.ReactNode;
  stroke?: string;
  three?: ThreePointGeo;
}) {
  return (
    <svg viewBox="0 0 500 470" className="h-auto w-full" role="img" aria-label="Half court shot chart">
      <rect x="0" y="0" width="500" height="470" fill="#13171c" />
      <g fill="none" stroke={stroke} strokeWidth="2">
        <rect x="1" y="1" width="498" height="468" />
        {/* paint */}
        <rect x="170" y="0" width="160" height="190" />
        <rect x="190" y="0" width="120" height="190" />
        {/* free throw circle */}
        <path d="M190 190 A60 60 0 0 0 310 190" />
        <path d="M190 190 A60 60 0 0 1 310 190" strokeDasharray="8 8" />
        {/* restricted area */}
        <path d="M210 52.5 A40 40 0 0 0 290 52.5" />
        {/* backboard + rim */}
        <line x1="220" y1="40" x2="280" y2="40" strokeWidth="3" />
        <circle cx="250" cy="52.5" r="7.5" stroke="#f26b1d" />
        {/* three point line */}
        <path d={threePath(three)} />
        {/* half court */}
        <path d="M190 470 A60 60 0 0 1 310 470" />
      </g>
      {children}
    </svg>
  );
}

interface TeamOpt {
  id: string;
  abbr: string;
  color: string;
}
interface PlayerOpt {
  id: string;
  name: string;
  teamId: string;
}

export function ShotChart({
  shots,
  teams,
  players,
  initialTeam,
  initialPlayer,
  compact,
  three,
}: {
  shots: Shot[];
  teams: TeamOpt[];
  players: PlayerOpt[];
  initialTeam?: string;
  initialPlayer?: string;
  compact?: boolean;
  three?: ThreePointGeo;
}) {
  const [team, setTeam] = useState(initialTeam ?? "all");
  const [player, setPlayer] = useState(initialPlayer ?? "all");
  const [result, setResult] = useState<"all" | "made" | "missed">("all");
  const [mode, setMode] = useState<"shots" | "heat">("shots");

  const colorOf = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.color])), [teams]);
  const filtered = shots.filter(
    (s) =>
      (team === "all" || s.teamId === team) &&
      (player === "all" || s.playerId === player) &&
      (result === "all" || (result === "made" ? s.made : !s.made)) &&
      s.x != null &&
      s.y != null,
  );
  const made = filtered.filter((s) => s.made).length;
  const noLoc = shots.filter(
    (s) => (team === "all" || s.teamId === team) && (player === "all" || s.playerId === player) && (s.x == null || s.y == null),
  ).length;

  const cells = useMemo(() => {
    if (mode !== "heat") return [];
    const size = 3; // feet
    const m = new Map<string, { cx: number; cy: number; a: number; m: number }>();
    for (const s of filtered) {
      const cx = Math.floor((s.x ?? 0) / size);
      const cy = Math.floor(((s.y ?? 0) - BASELINE_Y) / size);
      const k = `${cx},${cy}`;
      const c = m.get(k) ?? { cx, cy, a: 0, m: 0 };
      c.a++;
      if (s.made) c.m++;
      m.set(k, c);
    }
    const max = Math.max(1, ...[...m.values()].map((c) => c.a));
    return [...m.values()].map((c) => ({ ...c, size, max }));
  }, [filtered, mode]);

  const visiblePlayers = players.filter((p) => team === "all" || p.teamId === team);

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <select
            value={team}
            onChange={(e) => {
              setTeam(e.target.value);
              setPlayer("all");
            }}
            className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1"
          >
            <option value="all">Both teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.abbr}
              </option>
            ))}
          </select>
          <select value={player} onChange={(e) => setPlayer(e.target.value)} className="max-w-[12rem] rounded-md border border-ink-700 bg-ink-950 px-2 py-1">
            <option value="all">All players</option>
            {visiblePlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {(["all", "made", "missed"] as const).map((r) => (
            <button key={r} onClick={() => setResult(r)} className={`chip capitalize ${result === r ? "!border-court !text-court" : ""}`}>
              {r}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-ink-700" />
          <button onClick={() => setMode("shots")} className={`chip ${mode === "shots" ? "!border-court !text-court" : ""}`}>
            Shots
          </button>
          <button onClick={() => setMode("heat")} className={`chip ${mode === "heat" ? "!border-court !text-court" : ""}`}>
            Heatmap
          </button>
          <span className="num ml-auto text-ink-400">
            {made}/{filtered.length} {filtered.length ? `(${((made / filtered.length) * 100).toFixed(1)}%)` : ""}
          </span>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-ink-800">
        <Court three={three}>
          {mode === "heat"
            ? cells.map((c) => {
                const pct = c.a ? c.m / c.a : 0;
                // hot (orange) when > 50%, cold (blue) when < 35%
                const hue = pct >= 0.5 ? "242,107,29" : pct >= 0.35 ? "214,220,228" : "91,140,200";
                return (
                  <rect
                    key={`${c.cx},${c.cy}`}
                    x={c.cx * c.size * 10}
                    y={c.cy * c.size * 10}
                    width={c.size * 10}
                    height={c.size * 10}
                    fill={`rgba(${hue},${(0.25 + 0.65 * (c.a / c.max)).toFixed(2)})`}
                  >
                    <title>
                      {c.m}/{c.a} ({(pct * 100).toFixed(0)}%)
                    </title>
                  </rect>
                );
              })
            : filtered.map((s) => {
                const c = colorOf[s.teamId ?? ""] ?? "#f26b1d";
                const x = sx(s.x!);
                const y = sy(s.y!);
                return s.made ? (
                  <circle key={s.playId} cx={x} cy={y} r={6} fill={c} stroke="rgb(var(--ink-950))" strokeWidth="1.5" opacity={0.95}>
                    <title>{s.text}</title>
                  </circle>
                ) : (
                  <g key={s.playId} stroke={c} strokeWidth="2.2" opacity={0.75}>
                    <title>{s.text}</title>
                    <line x1={x - 4.5} y1={y - 4.5} x2={x + 4.5} y2={y + 4.5} />
                    <line x1={x - 4.5} y1={y + 4.5} x2={x + 4.5} y2={y - 4.5} />
                  </g>
                );
              })}
        </Court>
      </div>
      {!compact && (
        <p className="mt-2 text-[11px] text-ink-500">
          ● made · ✕ missed{noLoc ? ` · ${noLoc} shots without a recorded location` : ""}. Heatmap: orange = 50%+, white = 35–50%, blue = under 35%; opacity = volume.
        </p>
      )}
    </div>
  );
}
