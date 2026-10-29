"use client";
// Free betting calculators: odds converter, bookmaker margin, multi (parlay) and each-way.
import { useState } from "react";

const num = (s: string) => {
  const v = Number(String(s).replace(",", ".").trim());
  return Number.isFinite(v) ? v : NaN;
};
const money = (v: number) => (Number.isFinite(v) ? `$${v.toFixed(2)}` : "–");
const pct = (v: number, d = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(d)}%` : "–");

function Field({ label, value, set, suffix, wide }: { label: string; value: string; set: (v: string) => void; suffix?: string; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "col-span-2" : ""}`}>
      <span className="display text-xs font-semibold text-ink-400">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-ink-700 bg-ink-950 focus-within:border-court">
        <input inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} className="num w-full min-w-0 bg-transparent px-3 py-2.5 text-lg text-ink-100 outline-none" />
        {suffix && <span className="pr-3 text-sm text-ink-500">{suffix}</span>}
      </div>
    </label>
  );
}

function Out({ label, value, tone = "text-ink-100" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3">
      <div className="display text-[11px] text-ink-500">{label}</div>
      <div className={`num mt-1 text-xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

/** Decimal ↔ fractional ↔ American ↔ implied probability */
export function OddsConverter() {
  const [dec, setDec] = useState("2.50");
  const d = num(dec);
  const ok = d > 1;
  let frac = "–";
  if (ok) {
    const n = Math.round((d - 1) * 100);
    const g = gcd(n, 100);
    frac = `${n / g}/${100 / g}`;
  }
  const us = ok ? (d >= 2 ? `+${Math.round((d - 1) * 100)}` : `${Math.round(-100 / (d - 1))}`) : "–";
  return (
    <div className="card grid gap-4 p-5 sm:grid-cols-[1fr_2fr]">
      <Field label="Decimal odds (NZ/AU)" value={dec} set={setDec} />
      <div className="grid grid-cols-3 gap-3">
        <Out label="Implied chance" value={ok ? pct(1 / d) : "–"} tone="text-court" />
        <Out label="Fractional" value={frac} />
        <Out label="American" value={us} />
      </div>
    </div>
  );
}

/** Market margin (overround) and fair odds for every outcome */
export function MarginCalc() {
  const [text, setText] = useState("1.85, 1.95");
  const prices = text
    .split(/[\s,;]+/)
    .map(num)
    .filter((v) => v > 1);
  const book = prices.reduce((s, p) => s + 1 / p, 0);
  return (
    <div className="card grid gap-4 p-5 lg:grid-cols-2">
      <label className="block">
        <span className="display text-xs font-semibold text-ink-400">Every price in the market (comma or space separated)</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="num mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-ink-100 outline-none focus:border-court" />
        <span className="mt-1 block text-xs text-ink-500">e.g. a head to head (1.85, 1.95) or a whole race field.</span>
      </label>
      <div className="min-w-0 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Out label="Market total" value={prices.length ? pct(book) : "–"} />
          <Out label="Bookmaker margin" value={prices.length > 1 ? pct(book - 1) : "–"} tone={book - 1 > 0.1 ? "text-loss" : "text-court"} />
        </div>
        {prices.length > 1 && (
          <div className="max-h-56 overflow-y-auto rounded-lg border border-ink-800">
            <table className="stat-table compact">
              <thead>
                <tr>
                  <th className="!text-left">Price</th>
                  <th>Implied</th>
                  <th>Fair chance</th>
                  <th>Fair price</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p, i) => (
                  <tr key={i}>
                    <td className="!text-left">{p.toFixed(2)}</td>
                    <td>{pct(1 / p)}</td>
                    <td>{pct(1 / p / book)}</td>
                    <td className="font-semibold !text-court">{(p * book).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Multi / parlay: combined price, implied chance, and value if you enter your own chances */
export function MultiCalc() {
  const [legs, setLegs] = useState([
    { odds: "1.80", chance: "60" },
    { odds: "1.65", chance: "65" },
    { odds: "2.10", chance: "50" },
  ]);
  const [stake, setStake] = useState("10");
  const set = (i: number, k: "odds" | "chance", v: string) => setLegs((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const valid = legs.map((l) => ({ o: num(l.odds), c: num(l.chance) / 100 })).filter((l) => l.o > 1);
  const price = valid.reduce((s, l) => s * l.o, 1);
  const withChance = valid.every((l) => l.c > 0 && l.c < 1);
  const chance = withChance ? valid.reduce((s, l) => s * l.c, 1) : NaN;
  const st = num(stake);
  const ev = withChance && st > 0 ? st * (chance * price - 1) : NaN;
  return (
    <div className="card grid gap-5 p-5 lg:grid-cols-2">
      <div className="min-w-0 space-y-2">
        {legs.map((l, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2">
            <span className="display pb-3 text-sm font-bold text-ink-500">{i + 1}</span>
            <Field label="Odds" value={l.odds} set={(v) => set(i, "odds", v)} />
            <Field label="Your chance" value={l.chance} set={(v) => set(i, "chance", v)} suffix="%" />
            <button onClick={() => setLegs((x) => x.filter((_, j) => j !== i))} className="mb-2 rounded-md px-2 py-1 text-ink-500 hover:text-loss" aria-label={`Remove leg ${i + 1}`} disabled={legs.length <= 2}>
              ×
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-end gap-3 pt-1">
          <button onClick={() => setLegs((x) => [...x, { odds: "2.00", chance: "50" }])} className="rounded-lg border border-ink-700 px-3 py-2 text-sm hover:border-court" disabled={legs.length >= 12}>
            + Add leg
          </button>
          <div className="w-32">
            <Field label="Stake" value={stake} set={setStake} suffix="NZD" />
          </div>
        </div>
      </div>
      <div className="grid content-start gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Out label="Multi price" value={valid.length ? price.toFixed(2) : "–"} />
          <Out label="Returns" value={valid.length && st > 0 ? money(price * st) : "–"} />
          <Out label="Bookie's implied chance" value={valid.length ? pct(1 / price, 2) : "–"} />
          <Out label="Your chance it lands" value={pct(chance, 2)} tone="text-court" />
          <Out label="Fair price (your chances)" value={withChance ? (1 / chance).toFixed(2) : "–"} tone="text-court" />
          <Out label="Expected return" value={Number.isFinite(ev) ? `${ev >= 0 ? "+" : "−"}$${Math.abs(ev).toFixed(2)}` : "–"} tone={ev > 0 ? "text-win" : "text-loss"} />
        </div>
        <p className="text-[11px] leading-relaxed text-ink-500">Assumes the legs are independent (different games). Legs from the same game are linked, so same game multis are priced differently.</p>
      </div>
    </div>
  );
}

/** Each-way: a win bet plus a place bet of the same stake */
export function EachWayCalc() {
  const [win, setWin] = useState("8.00");
  const [place, setPlace] = useState("2.40");
  const [stake, setStake] = useState("5");
  const w = num(win);
  const pl = num(place);
  const st = num(stake);
  const ok = w > 1 && pl > 1 && st > 0;
  return (
    <div className="card grid gap-4 p-5 lg:grid-cols-2">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Win odds" value={win} set={setWin} />
        <Field label="Place odds" value={place} set={setPlace} />
        <Field label="Stake each way" value={stake} set={setStake} suffix="$" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Out label="Total outlay" value={ok ? money(st * 2) : "–"} />
        <Out label="If it wins" value={ok ? money(st * w + st * pl) : "–"} tone="text-win" />
        <Out label="If it only places" value={ok ? money(st * pl) : "–"} />
      </div>
    </div>
  );
}
