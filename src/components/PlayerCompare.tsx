"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CompareData, ComparePlayer, CompareTeam } from "@/lib/compare";
import { fmt, hex, type Fmt } from "@/lib/format";
import { Headshot, TeamLogo } from "./Img";

interface Col {
  key: string;
  label: string;
  fmt?: Fmt;
  invert?: boolean; // lower is better
  title?: string;
}

const C = {
  gp: { key: "gp", label: "GP", fmt: "int" },
  gs: { key: "gs", label: "GS", fmt: "int" },
  min: { key: "min", label: "MIN" },
  pts: { key: "pts", label: "PTS" },
  reb: { key: "reb", label: "REB" },
  ast: { key: "ast", label: "AST" },
  stl: { key: "stl", label: "STL" },
  blk: { key: "blk", label: "BLK" },
  tov: { key: "tov", label: "TOV", invert: true },
  pf: { key: "pf", label: "PF", invert: true },
  fgm: { key: "fgm", label: "FGM" },
  fga: { key: "fga", label: "FGA" },
  fgp: { key: "fgp", label: "FG%", fmt: "pct" },
  twom: { key: "twom", label: "2PM" },
  twoa: { key: "twoa", label: "2PA" },
  twop: { key: "twop", label: "2P%", fmt: "pct" },
  tpm: { key: "tpm", label: "3PM" },
  tpa: { key: "tpa", label: "3PA" },
  tpp: { key: "tpp", label: "3P%", fmt: "pct" },
  ftm: { key: "ftm", label: "FTM" },
  fta: { key: "fta", label: "FTA" },
  ftp: { key: "ftp", label: "FT%", fmt: "pct" },
  oreb: { key: "oreb", label: "OREB" },
  dreb: { key: "dreb", label: "DREB" },
  stocks: { key: "stocks", label: "STL+BLK", title: "Steals + blocks" },
  pra: { key: "pra", label: "P+R+A", title: "Points + rebounds + assists" },
  astto: { key: "astto", label: "AST/TO", fmt: "2" },
  ts: { key: "ts", label: "TS%", fmt: "pct", title: "True shooting %" },
  efg: { key: "efg", label: "eFG%", fmt: "pct", title: "Effective FG %" },
  usg: { key: "usg", label: "USG%", title: "Usage rate (estimated from team totals)" },
  per: { key: "per", label: "PER", title: "Player efficiency rating (estimated)" },
  gmsc: { key: "gmsc", label: "GmSc", title: "Game score" },
  ftr: { key: "ftr", label: "FTr", fmt: "3", title: "Free throw rate (FTA / FGA)" },
  tpr: { key: "tpr", label: "3PAr", fmt: "3", title: "Share of shots that are threes" },
  pm: { key: "pm", label: "+/-", fmt: "signed1" },
  p36pts: { key: "p36pts", label: "PTS/36" },
  p36reb: { key: "p36reb", label: "REB/36" },
  p36ast: { key: "p36ast", label: "AST/36" },
  p36stl: { key: "p36stl", label: "STL/36" },
  p36blk: { key: "p36blk", label: "BLK/36" },
  p36tov: { key: "p36tov", label: "TOV/36", invert: true },
  p36tpm: { key: "p36tpm", label: "3PM/36" },
  h_cont: { key: "h_cont", label: "CONTESTS" },
  h_defl: { key: "h_defl", label: "DEFL" },
  h_chg: { key: "h_chg", label: "CHARGES" },
  h_scr: { key: "h_scr", label: "SCR AST" },
  h_lb: { key: "h_lb", label: "LOOSE BALLS" },
  h_bo: { key: "h_bo", label: "BOX OUTS" },
  o_ortg: { key: "o_ortg", label: "ORtg" },
  o_drtg: { key: "o_drtg", label: "DRtg", invert: true },
  o_net: { key: "o_net", label: "NET", fmt: "signed1" },
  o_pie: { key: "o_pie", label: "PIE", fmt: "pct" },
  o_usg: { key: "o_usg", label: "USG%", fmt: "pct" },
  o_ts: { key: "o_ts", label: "TS%", fmt: "pct" },
} satisfies Record<string, Col>;

function groupsFor(d: CompareData): { id: string; label: string; cols: Col[] }[] {
  const last = d.split === "l5" || d.split === "l10";
  const g = [
    { id: "overview", label: "Overview", cols: [C.gp, C.min, C.pts, C.reb, C.ast, C.stl, C.blk, C.tov, C.fgp, C.tpp, ...(last ? [C.pm] : [C.pra])] },
    { id: "shooting", label: "Shooting", cols: [C.pts, C.fga, C.fgp, C.twoa, C.twop, C.tpm, C.tpa, C.tpp, C.fta, C.ftp] },
    { id: "boards", label: "Rebounds & defense", cols: [C.min, C.oreb, C.dreb, C.reb, C.stl, C.blk, C.stocks, C.pf] },
    { id: "playmaking", label: "Playmaking", cols: [C.min, C.ast, C.tov, C.astto, C.usg, C.pra] },
    { id: "efficiency", label: "Efficiency", cols: [C.min, C.ts, C.efg, C.usg, C.per, C.gmsc, C.ftr, C.tpr] },
    { id: "per36", label: "Per 36 min", cols: [C.min, C.p36pts, C.p36reb, C.p36ast, C.p36stl, C.p36blk, C.p36tov, C.p36tpm] },
  ];
  if (d.hasHustle) g.push({ id: "hustle", label: "Hustle", cols: [C.min, C.h_cont, C.h_defl, C.h_chg, C.h_scr, C.h_lb, C.h_bo] });
  if (d.hasOfficial) g.push({ id: "official", label: "NBA ratings", cols: [C.min, C.o_ortg, C.o_drtg, C.o_net, C.o_usg, C.o_ts, C.o_pie] });
  g.push({
    id: "all",
    label: "All stats",
    cols: [C.gp, C.gs, C.min, C.pts, C.fgm, C.fga, C.fgp, C.tpm, C.tpa, C.tpp, C.ftm, C.fta, C.ftp, C.oreb, C.dreb, C.reb, C.ast, C.stl, C.blk, C.tov, C.pf, ...(last ? [C.pm] : []), C.astto, C.ts, C.efg, C.usg, C.per, C.gmsc],
  });
  return g;
}

type Sort = { key: string; dir: "asc" | "desc" };

export function PlayerCompare({ data, league }: { data: CompareData; league: string }) {
  const groups = useMemo(() => groupsFor(data), [data]);
  const [groupId, setGroupId] = useState("overview");
  const [layout, setLayout] = useState<"side" | "combined">("side");
  const [sort, setSort] = useState<Sort>({ key: "pts", dir: "desc" });
  const [hideOut, setHideOut] = useState(false);
  const [rotation, setRotation] = useState(false);

  const group = groups.find((g) => g.id === groupId) ?? groups[0];
  const cols = group.cols;
  const sortCol = cols.find((c) => c.key === sort.key);

  const visible = useMemo(
    () =>
      data.players.filter(
        (p) => (!hideOut || !/out|doubtful/i.test(p.status ?? "")) && (!rotation || (p.cells.min ?? 0) >= 15),
      ),
    [data.players, hideOut, rotation],
  );

  const sorted = useMemo(() => {
    const k = sort.key;
    return [...visible].sort((a, b) => {
      const av = a.cells[k];
      const bv = b.cells[k];
      if (av == null && bv == null) return (b.cells.min ?? 0) - (a.cells.min ?? 0);
      if (av == null) return 1;
      if (bv == null) return -1;
      return sort.dir === "desc" ? bv - av : av - bv;
    });
  }, [visible, sort]);

  // Shared colour scale + leader across BOTH teams, so a value means the same thing on each side.
  const scale = useMemo(() => {
    const out: Record<string, { min: number; max: number; best: number | null }> = {};
    const qualified = visible.filter((p) => (p.cells.gp ?? 0) > 0 && (p.cells.min ?? 0) >= 8);
    for (const c of cols) {
      const vals = qualified.map((p) => p.cells[c.key]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      if (!vals.length) continue;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      out[c.key] = { min, max, best: c.key === "gp" || c.key === "gs" || c.key === "min" ? null : c.invert ? min : max };
    }
    return out;
  }, [visible, cols]);

  const click = (key: string) => {
    const col = cols.find((c) => c.key === key);
    setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: col?.invert ? "asc" : "desc" }));
  };

  const pickGroup = (id: string) => {
    setGroupId(id);
    const g = groups.find((x) => x.id === id)!;
    if (!g.cols.some((c) => c.key === sort.key)) {
      const first = g.cols.find((c) => !["gp", "gs", "min"].includes(c.key)) ?? g.cols[0];
      setSort({ key: first.key, dir: first.invert ? "asc" : "desc" });
    }
  };

  const chip = (on: boolean) => `chip cursor-pointer select-none ${on ? "!border-court !text-court" : "hover:text-ink-100"}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {groups.map((g) => (
          <button key={g.id} onClick={() => pickGroup(g.id)} className={chip(g.id === groupId)}>
            {g.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="display mr-1 text-ink-500">Layout</span>
        <button onClick={() => setLayout("side")} className={chip(layout === "side")}>
          Side by side
        </button>
        <button onClick={() => setLayout("combined")} className={chip(layout === "combined")}>
          One list
        </button>
        <span className="mx-1 h-4 w-px bg-ink-700" />
        <button onClick={() => setRotation((v) => !v)} className={chip(rotation)}>
          Rotation only (15+ min)
        </button>
        <button onClick={() => setHideOut((v) => !v)} className={chip(hideOut)}>
          Hide injured
        </button>
        <span className="ml-auto text-ink-500">
          Sorted by <span className="text-court">{sortCol?.label ?? sort.key}</span> {sort.dir === "desc" ? "high → low" : "low → high"} · click any column
        </span>
      </div>

      {layout === "side" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.teams.map((t) => (
            <TeamTable
              key={t.id}
              team={t}
              players={sorted.filter((p) => p.teamId === t.id)}
              cols={cols}
              sort={sort}
              onSort={click}
              scale={scale}
              league={league}
            />
          ))}
        </div>
      ) : (
        <TeamTable players={sorted} teams={data.teams} cols={cols} sort={sort} onSort={click} scale={scale} league={league} />
      )}

      <p className="text-[11px] text-ink-500">
        Colour shading uses one scale across both teams · <span className="text-court">orange</span> = best value in the matchup · per game unless
        noted · USG% and PER are estimated from team totals.
      </p>
    </div>
  );
}

function TeamTable({
  team,
  teams,
  players,
  cols,
  sort,
  onSort,
  scale,
  league,
}: {
  team?: CompareTeam;
  teams?: CompareTeam[];
  players: ComparePlayer[];
  cols: Col[];
  sort: Sort;
  onSort: (k: string) => void;
  scale: Record<string, { min: number; max: number; best: number | null }>;
  league: string;
}) {
  const teamById = new Map((teams ?? (team ? [team] : [])).map((t) => [t.id, t]));
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the sorted column visible when the table is wider than its card.
  useEffect(() => {
    const box = scroller.current;
    const th = box?.querySelector<HTMLElement>(`th[data-key="${sort.key}"]`);
    const lead = box?.querySelector<HTMLElement>("th[data-lead]");
    if (!box || !th) return;
    const leadW = lead?.offsetWidth ?? 0;
    const left = th.offsetLeft - leadW;
    const right = th.offsetLeft + th.offsetWidth;
    if (left < box.scrollLeft) box.scrollTo({ left: Math.max(0, left - 8), behavior: "smooth" });
    else if (right > box.scrollLeft + box.clientWidth) box.scrollTo({ left: right - box.clientWidth + 8, behavior: "smooth" });
  }, [sort.key, cols]);
  const color = team ? hex(team.color) : undefined;

  const bg = (c: Col, v: number | null) => {
    const s = scale[c.key];
    if (v == null || !s || s.max === s.min || c.key === "gp" || c.key === "gs") return undefined;
    let t = (v - s.min) / (s.max - s.min);
    if (c.invert) t = 1 - t;
    return t > 0.5 ? `rgba(242,107,29,${((t - 0.5) * 0.45).toFixed(3)})` : `rgba(91,140,200,${((0.5 - t) * 0.3).toFixed(3)})`;
  };

  return (
    <section className="card overflow-hidden">
      {team && (
        <div className="flex items-center gap-3 border-b border-ink-800 px-4 py-2.5" style={{ background: `linear-gradient(90deg, ${color}33, transparent 70%)` }}>
          <TeamLogo src={team.logo} alt={team.abbr} size={30} />
          <Link href={`/${league}/teams/${team.id}`} className="display truncate text-lg font-bold hover:text-court">
            {team.name}
          </Link>
          {team.record && <span className="num whitespace-nowrap text-xs text-ink-400">{team.record}</span>}
          <span className="ml-auto hidden whitespace-nowrap text-xs text-ink-500 sm:inline">{players.length} players</span>
        </div>
      )}
      <div ref={scroller} className="max-h-[78vh] overflow-auto">
        <table className="stat-table compact">
          <thead>
            <tr>
              <th data-lead className="!text-left">Player</th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  data-key={c.key}
                  title={c.title}
                  onClick={() => onSort(c.key)}
                  className={`cursor-pointer select-none ${sort.key === c.key ? "!text-court" : "hover:!text-ink-200"}`}
                >
                  {c.label}
                  {sort.key === c.key ? (sort.dir === "desc" ? " ↓" : " ↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => {
              const t = teamById.get(p.teamId);
              const out = /out/i.test(p.status ?? "");
              const noStats = p.cells.gp == null || p.cells.gp === 0;
              return (
                <tr key={p.id} className={noStats || out ? "opacity-55" : ""}>
                  <td className="!py-1">
                    <Link href={`/${league}/players/${p.id}`} className="flex min-w-[10rem] max-w-[12rem] items-center gap-2 font-sans hover:[&_.nm]:text-court">
                      <span className="num w-4 text-right text-[10px] text-ink-600">{i + 1}</span>
                      {!team && t && <span className="h-6 w-1 shrink-0 rounded" style={{ background: hex(t.color) }} />}
                      <Headshot src={p.headshot} name={p.name} size={28} />
                      <span className="min-w-0">
                        <span className="nm block truncate text-[13px] font-medium text-ink-100">{p.name}</span>
                        <span className="block truncate text-[10px] text-ink-500">
                          {!team && t ? `${t.abbr} · ` : ""}
                          {p.jersey ? `#${p.jersey} · ` : ""}
                          {p.pos}
                          {p.status && <span className="text-loss"> · {p.status}</span>}
                        </span>
                      </span>
                    </Link>
                  </td>
                  {cols.map((c) => {
                    const v = p.cells[c.key] ?? null;
                    const best = scale[c.key]?.best;
                    const isBest = v != null && best != null && v === best;
                    return (
                      <td
                        key={c.key}
                        className={`!py-1 ${isBest ? "font-bold !text-court" : ""} ${sort.key === c.key ? "!text-ink-100" : ""}`}
                        style={{ background: bg(c, v) }}
                      >
                        {fmt(v, c.fmt ?? "1")}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          {team && Object.keys(team.footer).length > 0 && (
            <tfoot>
              <tr>
                <td className="font-sans text-xs">Team per game</td>
                {cols.map((c) => (
                  <td key={c.key}>{c.key in team.footer ? fmt(team.footer[c.key], c.fmt ?? "1") : ""}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
