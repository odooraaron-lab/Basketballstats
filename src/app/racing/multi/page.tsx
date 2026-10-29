import Link from "next/link";
import { AddToSlip } from "@/components/BetSlip";
import { Card, Empty, PageTitle } from "@/components/ui";
import { fmtTime } from "@/lib/format";
import { keyOf, marketChances, type RaceCard, type Runner, type Tally } from "@/lib/racing/core";
import { nzShift, nzToday, ratesFor } from "@/lib/racing/store";
import { getMeetings, getRace } from "@/lib/racing/tab";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Style = "banker" | "balanced" | "big";
type Bet = "win" | "place";
const STYLES: { id: Style; label: string; blurb: string }[] = [
  { id: "banker", label: "Banker", blurb: "The most likely runner in each race. Highest chance, shortest price." },
  { id: "balanced", label: "Balanced", blurb: "Solid chances at better prices: second-line favourites and value runners." },
  { id: "big", label: "Big Price", blurb: "Longer-priced runners our numbers still rate. Bigger payout, more risk." },
];
// Chance band each style looks in (win / place)
const BAND: Record<Style, Record<Bet, [number, number]>> = {
  banker: { win: [0, 1], place: [0, 1] },
  balanced: { win: [0.2, 0.42], place: [0.45, 0.72] },
  big: { win: [0.08, 0.25], place: [0.25, 0.5] },
};

interface Leg {
  race: RaceCard;
  r: Runner;
  p: number;
  odds: number | null;
  score: number;
  why: string;
}

const pct = (p: number) => `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;

export default async function RacingMulti({ searchParams }: { searchParams: Promise<{ d?: string; m?: string; bet?: string; legs?: string; style?: string; r?: string }> }) {
  const sp = await searchParams;
  const today = nzToday();
  const day = sp.d === nzShift(today, 1) ? sp.d : today;
  const region = sp.r === "AUS" ? "AUS" : "NZ";
  const bet: Bet = sp.bet === "place" ? "place" : "win";
  const style: Style = (["banker", "balanced", "big"] as const).find((s) => s === sp.style) ?? "banker";
  const n = Math.min(8, Math.max(2, Number(sp.legs) || 4));
  const meetings = await getMeetings(day, day, { country: region });
  const meetingId = meetings.some((m) => m.id === sp.m) ? sp.m! : "all";
  const now = Date.now();
  const races = meetings
    .filter((m) => meetingId === "all" || m.id === meetingId)
    .flatMap((m) => m.races)
    .filter((r) => Date.parse(r.start) > now + 2 * 60_000 && !/final|abandon|interim|closed/i.test(r.status))
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .slice(0, 40);
  const cards = (await Promise.all(races.map((r) => getRace(r.id).catch(() => null)))).filter((c): c is RaceCard => Boolean(c));
  const [jr, tr] = await Promise.all([
    ratesFor("jockey", [...new Set(cards.flatMap((c) => c.runners.map((r) => keyOf(r.jockey))))], 90).catch(() => new Map<string, Tally>()),
    ratesFor("trainer", [...new Set(cards.flatMap((c) => c.runners.map((r) => keyOf(r.trainer))))], 90).catch(() => new Map<string, Tally>()),
  ]);

  // Best runner per race for the chosen style, then the best N races
  const [lo, hi] = BAND[style][bet];
  const best: Leg[] = [];
  for (const c of cards) {
    const ch = marketChances(c.runners);
    const cands: Leg[] = [];
    for (const r of c.runners) {
      const m = ch.get(r.number);
      const base = bet === "win" ? m?.win : m?.place;
      const odds = bet === "win" ? r.winOdds : r.placeOdds;
      if (r.scratched || base == null || !odds) continue;
      const j = jr.get(keyOf(r.jockey));
      const t = tr.get(keyOf(r.trainer));
      const form = [j, t].filter((x) => x && x.starts >= 15).map((x) => Math.max(-0.1, Math.min(0.1, (x!.winPct - 0.15) * 0.5)));
      const nudge = 1 + form.reduce((a, b) => a + b, 0) / Math.max(1, form.length);
      const p = Math.min(0.95, base * nudge);
      if (p < lo || p > hi) continue;
      const value = p * odds; // > 1 means our chance beats the price
      const score = style === "banker" ? p : value + p * 0.3;
      const bits = [j && j.starts >= 10 ? `${r.jockey} ${Math.round(j.winPct * 100)}%` : r.jockey, t && t.starts >= 10 ? `${r.trainer} ${Math.round(t.winPct * 100)}%` : r.trainer].filter(Boolean);
      cands.push({ race: c, r, p, odds, score, why: `${bits.join(" / ")}${r.flucs.length > 1 && r.flucs[r.flucs.length - 1] < r.flucs[0] * 0.85 ? " · firming" : ""}` });
    }
    cands.sort((a, b) => b.score - a.score);
    if (cands[0]) best.push(cands[0]);
  }
  const legs = [...best].sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => (a.race.start < b.race.start ? -1 : 1));
  const chance = legs.reduce((s, l) => s * l.p, 1);
  const price = legs.reduce((s, l) => s * (l.odds ?? 1), 1);
  const href = (o: Record<string, string>) => {
    const q = new URLSearchParams({ d: day, m: meetingId, bet, legs: String(n), style, ...(region === "AUS" ? { r: "AUS" } : {}), ...o });
    return `/racing/multi?${q}`;
  };
  const chip = (on: boolean) => `chip ${on ? "!border-court !text-court" : ""}`;

  return (
    <div className="space-y-5">
      <PageTitle sub="Builds a racing multi (all-up) across upcoming races: one runner per race, with each leg's chance from the fixed-odds market (margin removed) adjusted for jockey and trainer form.">Racing multi builder</PageTitle>

      <div className="card space-y-3 p-4 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 text-ink-500">Day</span>
          <Link href={href({ d: today, m: "all" })} className={chip(day === today)}>Today</Link>
          <Link href={href({ d: nzShift(today, 1), m: "all" })} className={chip(day !== today)}>Tomorrow</Link>
          <span className="mx-1 w-px self-stretch bg-ink-800" />
          <Link href={href({ r: "NZ", m: "all" })} className={chip(region === "NZ")}>NZ</Link>
          <Link href={href({ r: "AUS", m: "all" })} className={chip(region === "AUS")}>Australia</Link>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 text-ink-500">Meeting</span>
          <Link href={href({ m: "all" })} className={chip(meetingId === "all")}>All meetings</Link>
          {meetings.map((m) => (
            <Link key={m.id} href={href({ m: m.id })} className={chip(meetingId === m.id)}>
              {m.name}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 text-ink-500">Bet</span>
          <Link href={href({ bet: "win" })} className={chip(bet === "win")}>Win</Link>
          <Link href={href({ bet: "place" })} className={chip(bet === "place")}>Place</Link>
          <span className="mx-1 w-px self-stretch bg-ink-800" />
          <span className="text-ink-500">Legs</span>
          {[2, 3, 4, 5, 6, 8].map((k) => (
            <Link key={k} href={href({ legs: String(k) })} className={chip(n === k)}>{k}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 text-ink-500">Style</span>
          {STYLES.map((s) => (
            <Link key={s.id} href={href({ style: s.id })} className={chip(style === s.id)} title={s.blurb}>{s.label}</Link>
          ))}
          <span className="text-ink-500">{STYLES.find((s) => s.id === style)?.blurb}</span>
        </div>
      </div>

      {!legs.length ? (
        <Empty>{cards.length ? "No runners fit this style right now — try another style, bet type or meeting." : "No upcoming races with fixed odds for this selection yet. Markets usually open the day before."}</Empty>
      ) : (
        <Card pad={false} title={`${legs.length}-leg ${bet} multi · ${STYLES.find((s) => s.id === style)?.label}`} right={`from ${cards.length} upcoming races`}>
          <ol className="divide-y divide-ink-800">
            {legs.map((l, i) => (
              <li key={l.race.id} className="flex items-center gap-3 px-4 py-3">
                <span className="display grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-800 text-sm font-bold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/racing/race/${l.race.id}`} className="block truncate text-xs text-ink-400 hover:text-court">
                    {fmtTime(l.race.start)} · {l.race.meetingName} R{l.race.number} · {l.race.distance ? `${l.race.distance}m` : ""} →
                  </Link>
                  <div className="truncate font-semibold">
                    {l.r.number}. {l.r.name} <span className="text-xs font-normal text-ink-500">({l.r.barrier ?? "–"}) · {bet}</span>
                  </div>
                  <div className="truncate text-[11px] text-ink-500">{l.why}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="num font-semibold">${l.odds?.toFixed(2)}</div>
                  <div className="num text-xs text-court">{pct(l.p)} · fair ${(1 / l.p).toFixed(2)}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="grid grid-cols-3 gap-2 border-t border-ink-800 p-4 text-center">
            <div>
              <div className="display text-[10px] text-ink-500">Fixed-odds multi</div>
              <div className="num text-lg font-semibold">${price.toFixed(2)}</div>
            </div>
            <div>
              <div className="display text-[10px] text-ink-500">Our chance</div>
              <div className="num text-lg font-semibold">{pct(chance)}</div>
            </div>
            <div>
              <div className="display text-[10px] text-ink-500">Fair price</div>
              <div className={`num text-lg font-semibold ${price > 1 / chance ? "text-win" : "text-court"}`}>${(1 / chance).toFixed(2)}</div>
            </div>
          </div>
          <div className="px-4 pb-4">
            <AddToSlip
              className="!w-full !py-2.5 !text-sm"
              label={`+ Add all ${legs.length} legs to my multi`}
              legs={legs.map((l) => ({ id: `${l.race.id}:${bet}:${l.r.number}`, gameId: l.race.id, game: `${l.race.meetingName} R${l.race.number}`, label: `${l.r.number}. ${l.r.name} ${bet}`, p: l.p }))}
            />
            <p className="mt-2 text-[11px] text-ink-500">
              The multi price is the fixed odds multiplied together; your bookie&apos;s all-up price may differ. Green fair price = the multi pays more than our chance says it should. 18+, gamble responsibly — 0800 654 655.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
