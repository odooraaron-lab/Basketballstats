"use client";
// "Take a look inside": tabbed product tour with a screenshot, a short pitch and three points.
import { useState } from "react";

export interface ShowcaseItem {
  id: string;
  tab: string;
  title: string;
  body: string;
  points: string[];
  img?: string;
  alt: string;
  portrait?: boolean;
  /** Built-in illustration instead of a screenshot */
  visual?: "racing";
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
          {cur.visual === "racing" ? (
            <RaceCardIllustration />
          ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={cur.img}
            src={cur.img}
            alt={cur.alt}
            loading="lazy"
            className={`rounded-xl border border-ink-700 shadow-2xl shadow-black/40 ${cur.portrait ? "max-h-[520px] w-auto" : "w-full"}`}
          />
          )}
        </div>
      </div>
    </div>
  );
}

/** Illustrative race card (example layout, not real runners) for the racing tab. */
function RaceCardIllustration() {
  const rows = [
    { n: 1, b: 4, name: "Runner One", j: "Jockey A", jr: "21%", t: "Trainer X", tr: "18%", win: "3.40", pl: "1.55", ch: "26%", flag: "Firming", tone: "text-win" },
    { n: 2, b: 7, name: "Runner Two", j: "Jockey B (a2)", jr: "14%", t: "Trainer Y", tr: "12%", win: "4.80", pl: "1.90", ch: "19%", flag: "Won last start", tone: "text-win" },
    { n: 3, b: 1, name: "Runner Three", j: "Jockey C", jr: "9%", t: "Trainer Z", tr: "16%", win: "7.50", pl: "2.60", ch: "12%", flag: "Drifting", tone: "text-loss" },
    { n: 4, b: 9, name: "Runner Four", j: "Jockey D", jr: "17%", t: "Trainer X", tr: "18%", win: "9.00", pl: "3.00", ch: "10%", flag: "Jockey 17% wins", tone: "text-court" },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-ink-800 px-4 py-3">
        <span className="display grid h-10 w-10 place-items-center rounded-lg bg-court text-lg font-extrabold text-ink-950">R5</span>
        <div className="min-w-0 flex-1">
          <div className="display truncate text-lg font-extrabold">Rating 75 · 1400m</div>
          <div className="text-xs text-ink-500">Good4 · Fine · 3 places paid</div>
        </div>
        <span className="rounded bg-ink-800 px-2 py-0.5 text-[10px] font-bold text-ink-400">EXAMPLE</span>
      </div>
      <ul className="divide-y divide-ink-800">
        {rows.map((r) => (
          <li key={r.n} className="flex gap-3 px-4 py-2.5">
            <span className="display grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ink-800 font-extrabold">{r.n}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {r.name} <span className="text-xs font-normal text-ink-500">({r.b})</span>
              </div>
              <div className="truncate text-[11px] text-ink-400">
                J: {r.j} · {r.jr} &nbsp; T: {r.t} · {r.tr}
              </div>
              <span className={`mt-0.5 inline-block rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-semibold ${r.tone}`}>{r.flag}</span>
            </div>
            <div className="shrink-0 text-right">
              <div className="num text-sm font-semibold">
                ${r.win} <span className="font-normal text-ink-500">/ ${r.pl}</span>
              </div>
              <div className="text-[11px] text-ink-500">{r.ch} win</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
