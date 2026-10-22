// Turns NBA.com record arrays into SortableTable columns/rows (server-side helper).
import { COL_LABELS, ID_COLS, isPctCol, nbaHeadshot, nbaLogo, type Rec } from "@/lib/nbacom";
import type { Column, Row } from "./SortableTable";

export interface ColSpec {
  key: string;
  label?: string;
  invert?: boolean;
  group?: boolean;
  heat?: boolean;
  signed?: boolean;
}

/** Pick numeric stat columns automatically (in source order). */
export function autoCols(recs: Rec[], exclude: string[] = [], limit = 40): ColSpec[] {
  const first = recs[0];
  if (!first) return [];
  return Object.keys(first)
    .filter((k) => !ID_COLS.has(k) && !exclude.includes(k) && recs.some((r) => typeof r[k] === "number"))
    .slice(0, limit)
    .map((key) => ({ key, heat: true, invert: /TOV|PF$|DEF_RATING|D_FG_PCT/.test(key) }));
}

const scale = (k: string, v: unknown): number | string | null => {
  if (typeof v !== "number") return (v as string | null) ?? null;
  if (isPctCol(k) && Math.abs(v) <= 1.5) return v * 100;
  return v;
};

export function toColumns(specs: ColSpec[], lead: string[] = ["GP", "MIN"]): Column[] {
  const leadCols: Column[] = lead.map((k) => ({ key: k, label: COL_LABELS[k] ?? k, fmt: k === "GP" || k === "G" ? "int" : "1" }));
  return [
    ...leadCols,
    ...specs
      .filter((s) => !lead.includes(s.key))
      .map((s, i) => ({
        key: s.key,
        label: s.label ?? COL_LABELS[s.key] ?? s.key.replace(/_/g, " ").replace(/\|/g, " · "),
        title: s.key,
        fmt: "1" as const,
        heat: s.heat ?? true,
        invert: s.invert,
        group: s.group ?? i === 0,
        signed: s.signed,
      })),
  ];
}

export function playerRows(league: string, recs: Rec[], keys: string[], extra?: (r: Rec) => Record<string, number | string | null>): Row[] {
  return recs.map((r, i) => ({
    key: `${r.PLAYER_ID ?? r.TEAM_ID ?? i}-${i}`,
    lead: {
      label: String(r.PLAYER_NAME ?? r.TEAM_NAME ?? ""),
      sub: String(r.TEAM_ABBREVIATION ?? r.PLAYER_LAST_TEAM_ABBREVIATION ?? ""),
      img: nbaHeadshot(r.PLAYER_ID as number),
      href: `/${league}/go?player=${encodeURIComponent(String(r.PLAYER_NAME ?? ""))}&team=${r.TEAM_ABBREVIATION ?? r.PLAYER_LAST_TEAM_ABBREVIATION ?? ""}`,
    },
    cells: { ...Object.fromEntries(keys.map((k) => [k, scale(k, r[k])])), ...(extra?.(r) ?? {}) },
  }));
}

export function teamRows(league: string, recs: Rec[], keys: string[], extra?: (r: Rec) => Record<string, number | string | null>): Row[] {
  return recs.map((r, i) => ({
    key: `${r.TEAM_ID ?? i}-${i}`,
    lead: {
      label: String(r.TEAM_NAME ?? r.TEAM_ABBREVIATION ?? ""),
      img: nbaLogo(r.TEAM_ID as number),
      imgKind: "team" as const,
      href: `/${league}/go?team=${r.TEAM_ABBREVIATION ?? ""}`,
    },
    cells: { ...Object.fromEntries(keys.map((k) => [k, scale(k, r[k])])), ...(extra?.(r) ?? {}) },
  }));
}

export const pctScale = scale;
