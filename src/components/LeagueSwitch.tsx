"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function LeagueSwitch({ current, leagues }: { current: string; leagues: LeagueOption[] }) {
  const path = usePathname();
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
        <div className="flex gap-1 rounded-lg bg-ink-950 p-0.5" role="tablist" aria-label="Choose league">
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
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors ${
                  active ? "bg-ink-800 text-ink-100" : "text-ink-400 hover:text-ink-100"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: l.accent, opacity: active ? 1 : 0.5 }} />
                <span className="display font-bold">{l.shortName}</span>
                <span className="text-xs text-ink-500">{l.region}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
