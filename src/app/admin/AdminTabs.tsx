"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/traffic", label: "Traffic" },
  { href: "/admin/setup", label: "Setup" },
];

export function AdminTabs() {
  const path = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto" aria-label="Admin">
      {TABS.map((t) => {
        const on = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`tab ${on ? "tab-active" : ""}`} aria-current={on ? "page" : undefined}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
