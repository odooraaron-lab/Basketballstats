"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({
  league,
  accent,
  shortName,
  tracking,
  odds = true,
}: {
  league: string;
  accent: string;
  shortName: string;
  tracking: boolean;
  odds?: boolean;
}) {
  const path = usePathname();
  const items: { href: string; label: string; exact?: boolean }[] = [
    { href: `/${league}`, label: "Dashboard", exact: true },
    { href: `/${league}/games`, label: "Games" },
    { href: `/${league}/teams`, label: "Teams" },
    { href: `/${league}/players`, label: "Players" },
    ...(odds ? [{ href: `/${league}/odds`, label: "Odds check" }] : []),
    ...(tracking ? [{ href: `/${league}/tracking`, label: "Tracking" }] : []),
    { href: `/${league}/standings`, label: "Standings" },
    { href: `/${league}/glossary`, label: "Glossary" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
        <Link href={`/${league}`} className="display flex items-center gap-2 text-xl font-extrabold">
          <span>Quick <span className="text-court">Read</span></span>
          <span
            className="rounded px-1.5 py-0.5 text-xs font-bold text-ink-950"
            style={{ background: accent }}
            title="Active league environment"
          >
            {shortName}
          </span>
        </Link>
        <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1">
          {items.map((i) => {
            const active = i.exact ? path === i.href : path.startsWith(i.href);
            return (
              <Link key={i.href} href={i.href} className={`tab ${active ? "tab-active" : ""}`}>
                {i.label}
              </Link>
            );
          })}
        </nav>
        <form action="/api/auth/logout" method="post" className="ml-auto md:ml-0">
          <button className="text-xs text-ink-500 hover:text-ink-200" type="submit">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
