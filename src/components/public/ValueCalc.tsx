"use client";
// Free "is this price worth it?" calculator: bookie odds (and an optional boost) against a
// chance you believe in. Shows the implied chance, the fair price and the expected return.
import { useState } from "react";

const n = (s: string) => {
  const v = Number(s.replace(",", "."));
  return Number.isFinite(v) ? v : NaN;
};

export function ValueCalc() {
  const [odds, setOdds] = useState("2.10");
  const [boost, setBoost] = useState("2.40");
  const [chance, setChance] = useState("45");
  const [stake, setStake] = useState("10");

  const o = n(odds);
  const b = n(boost);
  const p = n(chance) / 100;
  const st = n(stake);
  const ok = o > 1 && p > 0 && p < 1 && st > 0;
  const fair = ok ? 1 / p : NaN;
  const ev = (price: number) => (price > 1 ? st * (p * price - 1) : NaN);
  const evO = ev(o);
  const evB = b > 1 ? ev(b) : NaN;
  const money = (v: number) => (Number.isFinite(v) ? `${v >= 0 ? "+" : "−"}$${Math.abs(v).toFixed(2)}` : "–");
  const verdict = (v: number) => (!Number.isFinite(v) ? "" : v > 0.005 * st ? "Value" : v > -0.03 * st ? "About fair" : "Poor value");
  const tone = (v: number) => (!Number.isFinite(v) ? "text-ink-500" : v > 0.005 * st ? "text-win" : v > -0.03 * st ? "text-ink-200" : "text-loss");

  const field = (label: string, value: string, set: (v: string) => void, suffix?: string) => (
    <label className="block">
      <span className="display text-xs font-semibold text-ink-400">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-ink-700 bg-ink-950 focus-within:border-court">
        <input inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} className="num w-full min-w-0 bg-transparent px-3 py-2.5 text-lg text-ink-100 outline-none" />
        {suffix && <span className="pr-3 text-sm text-ink-500">{suffix}</span>}
      </div>
    </label>
  );

  return (
    <div className="card grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-4">
        {field("Bookie odds", odds, setOdds)}
        {field("Boosted odds (optional)", boost, setBoost)}
        {field("Your chance", chance, setChance, "%")}
        {field("Stake", stake, setStake, "NZD")}
        <p className="col-span-2 text-xs text-ink-500">Members get our chance filled in for every game, market and anytime scorer. Here you can type your own.</p>
      </div>
      <div className="grid content-start gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3">
            <div className="display text-[11px] text-ink-500">Bookie&apos;s implied chance</div>
            <div className="num mt-1 text-2xl font-semibold">{o > 1 ? `${(100 / o).toFixed(1)}%` : "–"}</div>
          </div>
          <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3">
            <div className="display text-[11px] text-ink-500">Fair price at your chance</div>
            <div className="num mt-1 text-2xl font-semibold text-court">{Number.isFinite(fair) ? fair.toFixed(2) : "–"}</div>
          </div>
        </div>
        {[
          ["At the normal price", evO, o],
          ["At the boosted price", evB, b],
        ].map(([label, v, price]) => (
          <div key={label as string} className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-950/60 p-3">
            <div>
              <div className="display text-[11px] text-ink-500">{label as string}</div>
              <div className="text-sm text-ink-300">
                Expected return {Number.isFinite(price as number) && (price as number) > 1 ? `@ ${(price as number).toFixed(2)}` : ""}
              </div>
            </div>
            <div className="text-right">
              <div className={`num text-xl font-semibold ${tone(v as number)}`}>{money(v as number)}</div>
              <div className={`text-xs font-semibold ${tone(v as number)}`}>{verdict(v as number)}</div>
            </div>
          </div>
        ))}
        <p className="text-[11px] leading-relaxed text-ink-500">
          Expected return is the long-run average per bet if your chance is right, not a promise about any single bet. A price only has value when it is longer than the fair price.
        </p>
      </div>
    </div>
  );
}
