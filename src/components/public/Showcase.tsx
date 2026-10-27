"use client";
// "Take a look inside": tabbed product tour with a screenshot, a short pitch and three points.
import { useState } from "react";

export interface ShowcaseItem {
  id: string;
  tab: string;
  title: string;
  body: string;
  points: string[];
  img: string;
  alt: string;
  portrait?: boolean;
}

export function Showcase({ items }: { items: ShowcaseItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const cur = items.find((i) => i.id === active) ?? items[0];
  if (!cur) return null;
  return (
    <div>
      <div role="tablist" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {items.map((i) => (
          <button
            key={i.id}
            role="tab"
            aria-selected={i.id === cur.id}
            onClick={() => setActive(i.id)}
            className={`display shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${i.id === cur.id ? "border-court bg-court text-ink-950" : "border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-100"}`}
          >
            {i.tab}
          </button>
        ))}
      </div>
      <div className="mt-6 grid items-center gap-8 lg:grid-cols-[1fr_1.35fr]">
        <div className="min-w-0">
          <h3 className="display text-2xl font-extrabold sm:text-3xl">{cur.title}</h3>
          <p className="mt-3 text-ink-300">{cur.body}</p>
          <ul className="mt-5 space-y-2.5">
            {cur.points.map((p) => (
              <li key={p} className="flex gap-3 text-sm text-ink-200">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-court/15 text-[11px] font-bold text-court">✓</span>
                {p}
              </li>
            ))}
          </ul>
          <a href="/signup" className="display mt-6 inline-block rounded-xl bg-court px-5 py-3 font-bold text-ink-950 hover:bg-court-soft">
            Get access
          </a>
        </div>
        <div className={`min-w-0 ${cur.portrait ? "flex justify-center" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={cur.img}
            src={cur.img}
            alt={cur.alt}
            loading="lazy"
            className={`rounded-xl border border-ink-700 shadow-2xl shadow-black/40 ${cur.portrait ? "max-h-[520px] w-auto" : "w-full"}`}
          />
        </div>
      </div>
    </div>
  );
}
