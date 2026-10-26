"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SportNav({ comp, short, accent, siblings }: { comp: string; short: string; accent: string; siblings?: { id: string; label: string }[] }) {
  const path = usePathname();
  const base = `/sport/${comp}`;
  const items: { href: string; label: string; exact?: boolean }[] = [
    { href: base, label: "Home", exact: true },
    { href: `${base}/fixtures`, label: "Fixtures" },
    { href: `${base}/ladder`, label: "Ladder" },
    { href: `${base}/stats`, label: "Stats" },
    { href: `${base}/teams`, label: "Teams" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
        <Link href={base} className="display flex items-center gap-2 text-xl font-extrabold">
          Court<span className="text-court">side</span>
          <span className="rounded px-1.5 py-0.5 text-xs font-bold text-ink-950" style={{ background: accent }}>
            {short}
          </span>
        </Link>
        {siblings && (
          <div className="flex rounded-md bg-ink-900 p-0.5 text-xs">
            {siblings.map((s) => (
              <Link key={s.id} href={path.replace(`/sport/${comp}`, `/sport/${s.id}`).replace(/\/(match|teams|players)\/.*/, "")} className={`rounded px-2 py-0.5 ${s.id === comp ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-100"}`}>
                {s.label}
              </Link>
            ))}
          </div>
        )}
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
        <form action="/api/logout" method="post" className="ml-auto md:ml-0">
          <button className="text-xs text-ink-500 hover:text-ink-200" type="submit">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
