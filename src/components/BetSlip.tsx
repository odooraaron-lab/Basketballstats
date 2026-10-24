"use client";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { slip, useSlip, type SlipLeg } from "@/lib/betslip";

const pct = (p: number) => `${(p * 100).toFixed(p < 0.01 ? 2 : p < 0.1 ? 1 : 0)}%`;
const money = (v: number) => `$${v >= 1000 ? Math.round(v).toLocaleString() : v.toFixed(2)}`;

/** "+ Multi" button for one or more legs. */
export type NewLeg = Omit<SlipLeg, "addedAt" | "league">;
export function AddToSlip({ legs: raw, label, className = "" }: { legs: NewLeg[]; label?: string; className?: string }) {
  const cur = useSlip();
  const league = usePathname().split("/")[1] ?? "";
  const legs = raw.map((l) => ({ ...l, id: `${league}:${l.id}`, league }));
  const inAll = legs.length > 0 && legs.every((l) => cur.some((c) => c.id === l.id));
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (inAll) legs.forEach((l) => slip.remove(l.id));
        else slip.add(legs);
      }}
      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold transition ${inAll ? "border-court bg-court text-ink-950" : "border-ink-700 text-ink-300 hover:border-court hover:text-court"} ${className}`}
      title={inAll ? "Remove from multi" : "Add to multi"}
    >
      {inAll ? "✓ In multi" : label ?? "+ Multi"}
    </button>
  );
}

/** Floating multi button + review panel. */
export function BetSlip() {
  const legs = useSlip();
  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState("10");
  const [bump, setBump] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const f = () => {
      setBump(true);
      setTimeout(() => setBump(false), 450);
    };
    window.addEventListener("betslip:added", f);
    return () => window.removeEventListener("betslip:added", f);
  }, []);

  const byGame = useMemo(() => {
    const m = new Map<string, SlipLeg[]>();
    for (const l of legs) m.set(l.gameId, [...(m.get(l.gameId) ?? []), l]);
    return [...m.values()];
  }, [legs]);

  const ourP = legs.reduce((a, l) => a * l.p, 1);
  const priced = legs.length > 0 && legs.every((l) => l.price && l.price > 1);
  const bookPrice = priced ? legs.reduce((a, l) => a * (l.price as number), 1) : null;
  const sameGame = byGame.some((g) => g.length > 1);
  const stakeN = Number(stake) || 0;
  const edge = bookPrice ? ourP * bookPrice - 1 : null;

  const text = () =>
    [
      `Multi — ${legs.length} legs`,
      ...byGame.flatMap((g) => [g[0].game, ...g.map((l) => `  • ${l.label}${l.price ? ` @ ${l.price.toFixed(2)}` : ""} (${pct(l.p)})`)]),
      bookPrice ? `Price: ${bookPrice.toFixed(2)} · ${money(stakeN)} returns ${money(stakeN * bookPrice)}` : `Fair price: ${(1 / ourP).toFixed(2)}`,
    ].join("\n");

  if (!legs.length && !open) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-court px-4 py-2.5 font-bold text-ink-950 shadow-lg shadow-black/40 transition ${bump ? "scale-110" : ""}`}
      >
        Multi <span className="num rounded-full bg-ink-950 px-2 py-0.5 text-xs text-court">{legs.length}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col border-l border-ink-800 bg-ink-950 shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
              <div>
                <h2 className="display text-lg font-bold">Your multi</h2>
                <p className="text-xs text-ink-400">
                  {legs.length} legs · {byGame.length} {byGame.length === 1 ? "game" : "games"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-xl text-ink-400 hover:text-ink-100" aria-label="Close">
                ✕
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {!legs.length && <p className="text-sm text-ink-400">No legs yet. Use “+ Multi” on combinations or longshots from any game.</p>}
              {byGame.map((g) => (
                <section key={g[0].gameId} className="rounded-lg border border-ink-800">
                  <h3 className="flex justify-between border-b border-ink-800 px-3 py-1.5 text-xs text-ink-400">
                    <span className="font-semibold text-ink-200">{g[0].game}</span>
                    {g.length > 1 && <span className="text-court-soft">same game · {g.length}</span>}
                  </h3>
                  <ul className="divide-y divide-ink-850">
                    {g.map((l) => (
                      <li key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{l.label}</div>
                          <div className="text-[11px] text-ink-500">
                            our chance {pct(l.p)} · fair {(1 / l.p).toFixed(2)}
                            {l.price ? <span className={l.p * l.price >= 1 ? " text-win" : " text-loss"}> · {l.p * l.price >= 1 ? "value" : "short"}</span> : null}
                          </div>
                        </div>
                        <input
                          inputMode="decimal"
                          placeholder="odds"
                          defaultValue={l.price ?? ""}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            slip.setPrice(l.id, v > 1 ? v : undefined);
                          }}
                          className="num w-16 rounded border border-ink-700 bg-ink-900 px-1.5 py-1 text-right text-xs"
                          aria-label="Bookmaker odds"
                        />
                        <button onClick={() => slip.remove(l.id)} className="text-ink-500 hover:text-loss" aria-label="Remove">
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {legs.length > 0 && (
              <footer className="space-y-3 border-t border-ink-800 p-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-court/15 py-2">
                    <div className="display text-[10px] text-ink-400">All hit</div>
                    <div className="num text-lg font-bold text-court">{pct(ourP)}</div>
                  </div>
                  <div className="rounded-md bg-ink-900 py-2">
                    <div className="display text-[10px] text-ink-500">Fair price</div>
                    <div className="num text-lg font-semibold">{(1 / ourP).toFixed(ourP < 0.01 ? 0 : 2)}</div>
                  </div>
                  <div className="rounded-md bg-ink-900 py-2">
                    <div className="display text-[10px] text-ink-500">Bookie price</div>
                    <div className={`num text-lg font-semibold ${edge == null ? "text-ink-500" : edge >= 0 ? "text-win" : "text-loss"}`}>{bookPrice ? bookPrice.toFixed(2) : "–"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <label className="text-ink-400">Stake $</label>
                  <input value={stake} onChange={(e) => setStake(e.target.value)} inputMode="decimal" className="num w-20 rounded border border-ink-700 bg-ink-900 px-2 py-1" />
                  <span className="ml-auto text-ink-300">
                    returns <b className="num text-ink-100">{money(stakeN * (bookPrice ?? 1 / ourP))}</b>
                    {!bookPrice && <span className="text-[10px] text-ink-500"> at fair</span>}
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-ink-500">
                  {edge != null ? (edge >= 0 ? `Priced above our estimate (+${Math.round(edge * 100)}% expected). ` : `Priced below our estimate (${Math.round(edge * 100)}% expected). `) : "Type the bookie's odds next to each leg to compare. "}
                  Chance multiplies the legs{sameGame ? "; legs from the same game are linked, so the real chance can differ — check it in Build combinations" : ""}.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(text());
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {}
                    }}
                    className="flex-1 rounded-md bg-court py-2 font-bold text-ink-950"
                  >
                    {copied ? "Copied ✓" : "Copy multi"}
                  </button>
                  <button onClick={() => slip.clear()} className="rounded-md border border-ink-700 px-3 text-sm text-ink-300 hover:text-loss">
                    Clear
                  </button>
                </div>
              </footer>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
