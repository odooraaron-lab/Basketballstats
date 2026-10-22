export type Fmt = "int" | "1" | "2" | "3" | "pct" | "pct0" | "signed" | "signed1" | "text" | "min";

export const DISPLAY_TZ = process.env.NEXT_PUBLIC_DISPLAY_TZ || "Pacific/Auckland";

export function fmt(v: number | string | null | undefined, kind: Fmt = "1"): string {
  if (v == null || v === "" || (typeof v === "number" && !Number.isFinite(v))) return "–";
  if (typeof v === "string") return v;
  switch (kind) {
    case "int":
      return Math.round(v).toString();
    case "1":
      return v.toFixed(1);
    case "2":
      return v.toFixed(2);
    case "3":
      return v.toFixed(3).replace(/^0\./, ".");
    case "pct":
      return (v * 100).toFixed(1);
    case "pct0":
      return (v * 100).toFixed(0) + "%";
    case "signed":
      return (v > 0 ? "+" : "") + Math.round(v);
    case "signed1":
      return (v > 0 ? "+" : "") + v.toFixed(1);
    case "min": {
      const m = Math.floor(v);
      const s = Math.round((v - m) * 60);
      return `${m}:${String(s).padStart(2, "0")}`;
    }
    default:
      return String(v);
  }
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-NZ", { timeZone: DISPLAY_TZ, ...opts }).format(d);
}

export const fmtTime = (iso: string) => fmtDate(iso, { hour: "numeric", minute: "2-digit" });
export const fmtDay = (iso: string) => fmtDate(iso, { weekday: "short", day: "numeric", month: "short" });
export const fmtDayTime = (iso: string) =>
  fmtDate(iso, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** ESPN yyyymmdd (US Eastern game day) -> readable label */
export function espnDayLabel(d: string): string {
  const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T12:00:00-05:00`;
  return new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "long", timeZone: "America/New_York" }).format(
    new Date(iso),
  );
}

export function shiftEspnDay(d: string, days: number): string {
  const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8) + days));
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export const hex = (c: string | undefined, fallback = "5b6573") => `#${(c || fallback).replace("#", "")}`;
