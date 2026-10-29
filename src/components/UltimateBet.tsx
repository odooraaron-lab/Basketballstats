"use client";
// "The Ultimate Bet" button + popup: three cross-sport multis for the next 48 hours.
import Link from "next/link";
import { useEffect, useState } from "react";
import { slip, useSlip } from "@/lib/betslip";
import type { UltimateOption, UltimateResult } from "@/lib/ultimate";

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

  useEffect(() => {
    let alive = true;
    fetch("/api/ultimate")
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 402 ? "The Ultimate Bet is for members." : "Couldn't scan the games just now. Try again in a minute.");
        return r.json();
      })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      alive = false;
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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
              Every game in the next 48 hours, across every sport, rated by our models. One pick per sport code.
            </p>
          </div>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-xl leading-none text-ink-400 hover:bg-ink-800 hover:text-ink-100" aria-label="Close">
            ×
          </button>
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
            <p className="py-10 text-center text-sm text-ink-400">No games we can rate in the next 48 hours. Check back closer to the weekend.</p>
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
              {opt && <OptionView o={opt} />}
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
        {inAll ? "✓ In your multi — tap to remove" : `Add Option ${o.n} to my multi`}
      </button>
    </div>
  );
}
