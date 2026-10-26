"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SWITCH_COMPS } from "@/sports/comps";

export interface LeagueOption {
  id: string;
  shortName: string;
  name: string;
  region: string;
  accent: string;
  tracking: boolean;
}

// Sections whose deeper URLs carry league-specific IDs (teams, players, games). Switching
// league from one of those lands on the section's index page instead of a dead ID.
const ID_SECTIONS = new Set(["teams", "players", "games"]);

function targetPath(path: string, from: string, to: LeagueOption): string {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== from) return `/${to.id}`;
  const section = parts[1];
  if (!section) return `/${to.id}`;
  if (section === "tracking" && !to.tracking) return `/${to.id}`;
  if (ID_SECTIONS.has(section)) return `/${to.id}/${section}`;
  return `/${to.id}/${parts.slice(1).join("/")}`;
}

// Non-basketball sections: cricket and the field-sport competitions.
const OTHER: { id: string; href: string; label: string; region: string; accent: string; title: string }[] = [
  ...SWITCH_COMPS.map((c) => ({ id: c.id, href: `/sport/${c.id}`, label: c.short, region: c.region, accent: c.accent, title: c.name })),
  { id: "cricket", href: "/cricket", label: "Cricket", region: "World", accent: "#2fb36d", title: "Cricket — every match in the world" },
  { id: "super-smash", href: "/cricket/super-smash", label: "Super Smash", region: "NZ T20", accent: "#f2c400", title: "Super Smash — NZ men's T20" },
];

export function LeagueSwitch({ current: given, leagues }: { current: string; leagues: LeagueOption[] }) {
  const path = usePathname();
  const current = path.startsWith("/cricket/super-smash") ? "super-smash" : given;
  const remember = (id: string) => {
    try {
      document.cookie = `league=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      /* cookies blocked — switching still works, it just won't be remembered */
    }
  };
  return (
    <div className="border-b border-ink-800 bg-ink-900">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5">
        <span className="display hidden text-[11px] font-semibold text-ink-500 sm:inline">League</span>
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-ink-950 p-0.5" role="tablist" aria-label="Choose league">
          {leagues.map((l) => {
            const active = l.id === current;
            return (
              <Link
                key={l.id}
                href={targetPath(path, current, l)}
                onClick={() => remember(l.id)}
                role="tab"
                aria-selected={active}
                title={l.name}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors ${
                  active ? "bg-ink-800 text-ink-100" : "text-ink-400 hover:text-ink-100"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: l.accent, opacity: active ? 1 : 0.5 }} />
                <span className="display font-bold">{l.shortName}</span>
                <span className="text-xs text-ink-500">{l.region}</span>
              </Link>
            );
          })}
          <span className="mx-0.5 w-px self-stretch bg-ink-800" />
          {OTHER.map((o) => {
            const active = current === o.id;
            return (
              <Link
                key={o.id}
                href={o.href}
                onClick={() => remember(o.id)}
                role="tab"
                aria-selected={active}
                title={o.title}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors ${active ? "bg-ink-800 text-ink-100" : "text-ink-400 hover:text-ink-100"}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: o.accent, opacity: active ? 1 : 0.5 }} />
                <span className="display whitespace-nowrap font-bold">{o.label}</span>
                <span className="whitespace-nowrap text-xs text-ink-500">{o.region}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
