"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { site } from "@/site.config";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`display flex items-center gap-1.5 text-2xl font-extrabold text-ink-100 ${className}`} aria-label={`${site.name} home`}>
      <span className="grid h-7 w-7 place-items-center rounded-md bg-court text-xs font-extrabold text-ink-950">QR</span>
      <span>Quick <span className="text-court">Read</span></span>
    </Link>
  );
}

export function PublicHeader() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => setSignedIn(/(?:^|; )cs_in=1/.test(document.cookie)), []);
  const links = [
    { href: "/#sports", label: "Sports" },
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Logo />
        <nav className="hidden flex-1 gap-5 text-sm text-ink-300 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink-100">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <Link href="/app" className="rounded-lg bg-court px-4 py-2 text-sm font-bold text-ink-950 hover:bg-court-soft">
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden px-3 py-2 text-sm text-ink-300 hover:text-ink-100 sm:block">
                Log in
              </Link>
              <Link href="/signup" className="rounded-lg bg-court px-4 py-2 text-sm font-bold text-ink-950 hover:bg-court-soft">
                Join now
              </Link>
            </>
          )}
          <button className="rounded-md p-2 text-ink-300 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            ☰
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-ink-800 px-4 py-2 md:hidden" aria-label="Mobile">
          {[...links, ...(signedIn ? [] : [{ href: "/login", label: "Log in" }])].map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-2 text-ink-200">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
