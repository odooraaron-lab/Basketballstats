"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fmt, type Fmt } from "@/lib/format";
import { Headshot, TeamLogo } from "./Img";

export interface Column {
  key: string;
  label: string;
  title?: string;
  fmt?: Fmt;
  /** Render a coloured +/- style value. */
  signed?: boolean;
  /** Visually group (adds left border) */
  group?: boolean;
  /** Lower is better (affects heat colouring). */
  invert?: boolean;
  heat?: boolean;
}

export interface Row {
  key: string;
  lead: { label: string; sub?: string; img?: string; imgKind?: "player" | "team"; href?: string; muted?: boolean };
  cells: Record<string, number | string | null>;
}

export function SortableTable({
  columns,
  rows,
  defaultSort,
  footer,
  leadLabel = "Player",
  maxHeight,
  dense,
  searchable,
}: {
  columns: Column[];
  rows: Row[];
  defaultSort?: { key: string; dir: "asc" | "desc" };
  footer?: Record<string, number | string | null> & { _label?: string };
  leadLabel?: string;
  maxHeight?: number;
  dense?: boolean;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(defaultSort ?? null);

  const sorted = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = needle
      ? rows.filter((r) => `${r.lead.label} ${r.lead.sub ?? ""}`.toLowerCase().includes(needle))
      : rows;
    if (!sort) return base;
    const s = [...base].sort((a, b) => {
      const av = sort.key === "_lead" ? a.lead.label : a.cells[sort.key];
      const bv = sort.key === "_lead" ? b.lead.label : b.cells[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return s;
  }, [rows, sort, q]);

  const ranges = useMemo(() => {
    const r: Record<string, [number, number]> = {};
    for (const c of columns) {
      if (!c.heat) continue;
      const vals = rows.map((x) => x.cells[c.key]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      if (vals.length > 2) r[c.key] = [Math.min(...vals), Math.max(...vals)];
    }
    return r;
  }, [rows, columns]);

  const click = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: key === "_lead" ? "asc" : "desc" }));

  const heatBg = (c: Column, v: unknown) => {
    const rg = ranges[c.key];
    if (!rg || typeof v !== "number") return undefined;
    let t = rg[1] === rg[0] ? 0.5 : (v - rg[0]) / (rg[1] - rg[0]);
    if (c.invert) t = 1 - t;
    if (t > 0.5) return `rgba(242,107,29,${((t - 0.5) * 0.5).toFixed(3)})`;
    return `rgba(91,140,200,${((0.5 - t) * 0.35).toFixed(3)})`;
  };

  return (
    <div>
      {searchable && (
        <div className="border-b border-ink-800 px-3 py-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name or team…"
            className="w-full max-w-xs rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-sm outline-none focus:border-court"
          />
        </div>
      )}
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="stat-table">
        <thead>
          <tr>
            <th onClick={() => click("_lead")} className="cursor-pointer select-none !text-left">
              {leadLabel}
            </th>
            {columns.map((c) => (
              <th
                key={c.key}
                title={c.title}
                onClick={() => click(c.key)}
                className={`cursor-pointer select-none ${c.group ? "border-l border-ink-800" : ""} ${
                  sort?.key === c.key ? "!text-court" : ""
                }`}
              >
                {c.label}
                {sort?.key === c.key ? (sort.dir === "desc" ? " ↓" : " ↑") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.key} className={r.lead.muted ? "opacity-50" : ""}>
              <td className={dense ? "!py-1" : ""}>
                <LeadCell lead={r.lead} />
              </td>
              {columns.map((c) => {
                const v = r.cells[c.key];
                const signedCls =
                  c.signed && typeof v === "number" ? (v > 0 ? "text-win" : v < 0 ? "text-loss" : "") : "";
                return (
                  <td
                    key={c.key}
                    className={`${c.group ? "border-l border-ink-800" : ""} ${signedCls} ${dense ? "!py-1" : ""}`}
                    style={{ background: c.heat ? heatBg(c, v) : undefined }}
                  >
                    {typeof v === "number" ? fmt(v, c.fmt ?? "1") : v ?? "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr>
              <td>{footer._label ?? "Totals"}</td>
              {columns.map((c) => {
                const v = footer[c.key];
                return (
                  <td key={c.key} className={c.group ? "border-l border-ink-800" : ""}>
                    {typeof v === "number" ? fmt(v, c.fmt ?? "1") : v ?? ""}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
    </div>
  );
}

function LeadCell({ lead }: { lead: Row["lead"] }) {
  const inner = (
    <span className="flex min-w-[10rem] items-center gap-2.5 font-sans">
      {lead.img != null &&
        (lead.imgKind === "team" ? (
          <TeamLogo src={lead.img} alt={lead.label} size={22} />
        ) : (
          <Headshot src={lead.img} name={lead.label} size={28} />
        ))}
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink-100">{lead.label}</span>
        {lead.sub && <span className="block truncate text-[11px] text-ink-500">{lead.sub}</span>}
      </span>
    </span>
  );
  return lead.href ? (
    <Link href={lead.href} className="hover:[&_span]:text-court">
      {inner}
    </Link>
  ) : (
    inner
  );
}
