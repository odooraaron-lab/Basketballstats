"use client";
// "The Ultimate Bet" button + popup: three cross-sport multis for the next 48 hours.
import Link from "next/link";
import { useEffect, useState } from "react";
import { slip, useSlip } from "@/lib/betslip";
import type { UltimateOption, UltimateResult } from "@/lib/ultimate";

const WINDOWS = [
  { h: 0.5, label: "30 minutes", short: "30m" },
  { h: 1, label: "1 hour", short: "1h" },
  { h: 2, label: "2 hours", short: "2h" },
  { h: 4, label: "4 hours", short: "4h" },
  { h: 8, label: "8 hours", short: "8h" },
  { h: 12, label: "12 hours", short: "12h" },
  { h: 24, label: "24 hours", short: "24h" },
  { h: 48, label: "48 hours", short: "48h" },
];
const pct = (p: number) => `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;
const CODE_LABEL: Record<string, string> = { basketball: "Basketball", "rugby-league": "Rugby league", rugby: "Rugby union", soccer: "Football", netball: "Netball", cricket: "Cricket", racing: "Racing" };
const CODE_COLOR: Record<string, string> = { basketball: "#f26b1d", "rugby-league": "#3b82f6", rugby: "#e8e8e8", soccer: "#22c55e", netball: "#d6336c", cricket: "#2fb36d", racing: "#c8a24a" };
const when = (iso: string) =>
  new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export function UltimateBetButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="display flex shrink-0 items-center gap-1 rounded-md bg-court px-2.5 py-1 text-xs font-bold text-ink-950 hover:bg-court-soft"
        title="The Ultimate Bet: the best cross-sport multi for the next 48 hours"
      >
        <span aria-hidden>★</span> <span className="hidden sm:inline">Ultimate Bet</span>
        <span className="sm:hidden">Ultimate</span>
      </button>
      {open && <UltimateModal onClose={() => setOpen(false)} />}
    </>
  );
}

function UltimateModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<UltimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [step, setStep] = useState(() => {
    try {
      const v = Number(localStorage.getItem("ultimate.window"));
      return v >= 0 && v < WINDOWS.length ? v : WINDOWS.length - 1;
    } catch {
      return WINDOWS.length - 1;
    }
  });
  const [hours, setHours] = useState(WINDOWS[step].h);
  // Debounce the slider so dragging doesn't fire a request per notch
  useEffect(() => {
    const t = setTimeout(() => setHours(WINDOWS[step].h), 350);
    try {
      localStorage.setItem("ultimate.window", String(step));
    } catch {}
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    setTab(0);
    setFlipped(false);
    fetch(`/api/ultimate?hours=${hours}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 402 ? "The Ultimate Bet is for members." : "Couldn't scan the games just now. Try again in a minute.");
        return r.json();
      })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [hours]);

  const opt = data?.options[tab];
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="The Ultimate Bet">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-ink-700 bg-ink-900 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-ink-800 bg-gradient-to-r from-court/25 to-transparent px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="display text-2xl font-extrabold">
              <span className="text-court">★</span> The Ultimate Bet
            </h2>
            <p className="text-xs text-ink-400">
              Every game starting in the next {WINDOWS[step].label}, across every sport, rated by our models. One pick per sport code.
            </p>
          </div>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-xl leading-none text-ink-400 hover:bg-ink-800 hover:text-ink-100" aria-label="Close">
            ×
          </button>
        </div>

        <div className="border-b border-ink-800 px-5 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="display font-semibold text-ink-400">Starting within</span>
            <span className="display text-sm font-extrabold text-court">{WINDOWS[step].label}</span>
          </div>
          <input
            type="range"
            min={0}
            max={WINDOWS.length - 1}
            step={1}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            className="mt-2 w-full accent-[#f26b1d]"
            aria-label="Time window"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-ink-500">
            {WINDOWS.map((w, i) => (
              <button key={w.label} type="button" onClick={() => setStep(i)} className={i === step ? "text-court" : "hover:text-ink-200"}>
                {w.short}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="py-10 text-center text-sm text-loss">{error}</p>
          ) : !data ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-ink-700 border-t-court" />
              <p className="mt-3 text-sm text-ink-400">Scanning NBA, NBL, rugby, football, netball, cricket and NZ racing…</p>
              <p className="text-xs text-ink-500">First scan of the hour takes up to 30 seconds.</p>
            </div>
          ) : !data.options.length ? (
            <p className="py-10 text-center text-sm text-ink-400">Nothing we can rate starts in the next {WINDOWS[step].label}. Slide the window out to see more games.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5 text-[11px] text-ink-500">
                Scanned:
                {data.scanned.map((s) => (
                  <span key={s.code} className="rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">
                    {CODE_LABEL[s.code]} {s.games}
                  </span>
                ))}
              </div>
              {!flipped ? (
                <>
                  <div role="tablist" className="grid grid-cols-3 gap-1.5">
                    {data.options.map((o, i) => (
                      <button
                        key={o.n}
                        role="tab"
                        aria-selected={i === tab}
                        onClick={() => setTab(i)}
                        className={`rounded-xl border px-2 py-2 text-left transition ${i === tab ? "border-court bg-court/10" : "border-ink-700 hover:border-ink-500"}`}
                      >
                        <div className="display text-[11px] font-bold text-ink-400">Option {o.n}</div>
                        <div className="display truncate text-sm font-extrabold text-ink-100 sm:text-base">{o.name}</div>
                        <div className="num text-xs text-court">${o.fair.toFixed(2)}</div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFlipped(true)}
                    className="display mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-600 py-2 text-sm font-bold text-ink-200 hover:border-loss hover:text-loss"
                    title="Ignore every game in Options 1–3 and build a second multi from what's left"
                  >
                    <span aria-hidden>⟲</span> Flipper → The Grim Reaper
                  </button>
                  {opt && <OptionView o={opt} />}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 rounded-xl border border-loss/40 bg-gradient-to-r from-loss/20 to-transparent px-3 py-2.5">
                    <span className="text-2xl" aria-hidden>☠</span>
                    <div className="min-w-0 flex-1">
                      <div className="display text-lg font-extrabold leading-tight">The Grim Reaper</div>
                      <div className="text-[11px] text-ink-400">Second calculation · none of the games from Options 1–3</div>
                    </div>
                    <button type="button" onClick={() => setFlipped(false)} className="shrink-0 rounded-md border border-ink-700 px-2 py-1 text-xs text-ink-300 hover:text-ink-100">
                      ← Options
                    </button>
                  </div>
                  {data.reaper ? (
                    <OptionView o={data.reaper} />
                  ) : (
                    <p className="py-8 text-center text-sm text-ink-400">Every rateable game in this window is already in Options 1–3. Slide the window out to give the Grim Reaper more to work with.</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
        <p className="border-t border-ink-800 px-5 py-2.5 text-[10px] leading-relaxed text-ink-500">
          Chances are our model&apos;s, not a guarantee. Compare the fair price with your bookie: only back it if their price is longer. 18+. Gamble responsibly — NZ 0800 654 655, AU 1800 858 858.
        </p>
      </div>
    </div>
  );
}

function OptionView({ o }: { o: UltimateOption }) {
  const cur = useSlip();
  const legs = o.legs.map((l) => ({ id: `${l.slipLeague}:${l.id}`, league: l.slipLeague, gameId: l.gameId, game: `${l.game} · ${l.comp}`, label: l.pick, p: l.p }));
  const inAll = legs.every((l) => cur.some((c) => c.id === l.id));
  const codes = new Set(o.legs.map((l) => l.code)).size;
  return (
    <div className="mt-4">
      <p className="text-sm text-ink-300">{o.blurb}</p>
      <ol className="mt-3 space-y-2">
        {o.legs.map((l, i) => (
          <li key={l.id} className="rounded-xl border border-ink-800 bg-ink-950/60 p-3">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="display grid h-5 w-5 place-items-center rounded-full bg-ink-800 font-bold text-ink-200">{i + 1}</span>
              <span className="rounded px-1.5 py-0.5 font-bold text-ink-950" style={{ background: CODE_COLOR[l.code] }}>
                {CODE_LABEL[l.code]}
              </span>
              <span className="truncate text-ink-400">{l.comp}</span>
              <span className="ml-auto shrink-0 text-ink-400">{when(l.date)}</span>
            </div>
            <div className="mt-1.5 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <Link href={l.href} className="block truncate text-xs text-ink-400 hover:text-court">
                  {l.game} →
                </Link>
                <div className="font-semibold text-ink-100">
                  {l.pick} <span className="text-xs font-normal text-ink-500">· {l.market}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-ink-500">{l.why}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="num font-semibold text-ink-100">{pct(l.p)}</div>
                <div className="num text-xs text-court">{(1 / l.p).toFixed(2)}</div>
                {l.confidence === "low" && <div className="text-[10px] text-ink-500">low data</div>}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-ink-700 bg-ink-950 p-3 text-center">
        <div>
          <div className="display text-[10px] text-ink-500">Legs</div>
          <div className="num font-semibold">
            {o.legs.length} <span className="text-xs text-ink-500">· {codes} sport{codes > 1 ? "s" : ""}</span>
          </div>
        </div>
        <div>
          <div className="display text-[10px] text-ink-500">All land</div>
          <div className="num font-semibold">{pct(o.p)}</div>
        </div>
        <div>
          <div className="display text-[10px] text-ink-500">Fair price</div>
          <div className="num font-semibold text-court">${o.fair.toFixed(2)}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => (inAll ? legs.forEach((l) => slip.remove(l.id)) : slip.add(legs))}
        className={`display mt-3 w-full rounded-xl py-3 text-lg font-bold transition ${inAll ? "border border-court text-court" : "bg-court text-ink-950 hover:bg-court-soft"}`}
      >
        {inAll ? "✓ In your multi — tap to remove" : o.n ? `Add Option ${o.n} to my multi` : "Add the Grim Reaper to my multi"}
      </button>
    </div>
  );
}
