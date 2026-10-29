import Link from "next/link";
import { after } from "next/server";
import { AddToSlip } from "@/components/BetSlip";
import { Card, Empty } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import { CATEGORY_LABEL, formString, isFinal, keyOf, marketChances, placesPaid, slugOf, tally, type RaceCard, type Runner, type RunRow, type Tally } from "@/lib/racing/core";
import { horseHistory, ratesFor, saveCard } from "@/lib/racing/store";
import { getMeeting, getRace } from "@/lib/racing/tab";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const pct = (p: number | null | undefined) => (p == null ? "–" : `${Math.round(p * 100)}%`);
const money = (v: number | null) => (v == null ? "–" : `$${v.toFixed(2)}`);
const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;

export default async function RacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getRace(id, false);
  if (!card) return <Empty>We couldn&apos;t load this race from the racing feed. It may have been removed, or the feed is down — try again shortly.</Empty>;
  after(() => saveCard(card).catch(() => null));

  const final = isFinal(card);
  const [meeting, history, jRates, tRates] = await Promise.all([
    card.meetingId ? getMeeting(card.meetingId).catch(() => null) : null,
    horseHistory(card.runners.map((r) => keyOf(r.name)), card.start),
    ratesFor("jockey", [...new Set(card.runners.map((r) => keyOf(r.jockey)).filter(Boolean))], 90),
    ratesFor("trainer", [...new Set(card.runners.map((r) => keyOf(r.trainer)).filter(Boolean))], 90),
  ]);
  const chances = marketChances(card.runners);
  const starters = card.runners.filter((r) => !r.scratched);
  const races = meeting?.races ?? [];
  const idx = races.findIndex((r) => r.id === card.id);
  const prev = idx > 0 ? races[idx - 1] : null;
  const next = idx >= 0 && idx < races.length - 1 ? races[idx + 1] : null;
  const resultBy = new Map(card.results.map((r) => [r.number, r]));
  const overround = [...chances.values()][0]?.overround ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <Link href={card.meetingId ? `/racing/meeting/${card.meetingId}` : "/racing"} className="text-ink-400 hover:text-court">
          ← {card.meetingName || "Meetings"}
        </Link>
        <div className="flex gap-3">
          {prev && (
            <Link href={`/racing/race/${prev.id}`} className="text-ink-400 hover:text-court">
              ← R{prev.number}
            </Link>
          )}
          {next && (
            <Link href={`/racing/race/${next.id}`} className="text-ink-400 hover:text-court">
              R{next.number} →
            </Link>
          )}
        </div>
      </div>

      {races.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {races.map((r) => (
            <Link key={r.id} href={`/racing/race/${r.id}`} className={`chip shrink-0 ${r.id === card.id ? "!border-court !text-court" : ""}`}>
              R{r.number}
            </Link>
          ))}
        </div>
      )}

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className="display grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-court text-xl font-extrabold text-ink-950">R{card.number}</span>
          <div className="min-w-0 flex-1">
            <h1 className="display text-2xl font-extrabold leading-tight sm:text-3xl">{card.name || `Race ${card.number}`}</h1>
            <p className="mt-1 text-sm text-ink-400">
              {card.meetingName} · {CATEGORY_LABEL[card.category]} · {card.start ? `${fmtDate(card.start, { weekday: "short", day: "numeric", month: "short" })} ${fmtTime(card.start)}` : ""}
            </p>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs font-bold ${final ? "bg-ink-800 text-ink-300" : /closed|live/i.test(card.status) ? "bg-loss/15 text-loss" : "bg-win/15 text-win"}`}>{card.status || "Open"}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          {[
            ["Distance", card.distance ? `${card.distance}m` : "–"],
            ["Track", card.trackCondition || "–"],
            ["Weather", card.weather || "–"],
            ["Starters", `${starters.length}${card.runners.length > starters.length ? ` (${card.runners.length - starters.length} scr)` : ""}`],
            ["Places paid", placesPaid(starters.length) ? String(placesPaid(starters.length)) : "No place betting"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-ink-800 bg-ink-950/60 px-3 py-2">
              <div className="display text-[10px] text-ink-500">{k}</div>
              <div className="font-semibold">{v}</div>
            </div>
          ))}
        </div>
        {card.comment && <p className="mt-3 text-sm text-ink-300">{card.comment}</p>}
      </section>

      {final && card.results.length > 0 && <Results card={card} />}

      <Card
        pad={false}
        title="Field"
        right={overround ? `Market ${Math.round(overround * 100)}% · chances shown with the margin removed` : "Fixed odds appear when the market opens"}
      >
        <ul className="divide-y divide-ink-800">
          {card.runners.map((r) => (
            <RunnerRow key={r.number} r={r} card={card} hist={history.get(keyOf(r.name)) ?? []} j={jRates.get(keyOf(r.jockey))} t={tRates.get(keyOf(r.trainer))} ch={chances.get(r.number)} res={resultBy.get(r.number)?.position} />
          ))}
        </ul>
        <p className="px-4 py-2 text-[11px] text-ink-500">
          Form and strike rates come from results we&apos;ve recorded (last 90 days for jockeys and trainers). Chance = the fixed-odds market with the bookmaker&apos;s margin taken out. Compare with your
          bookie before you bet.
        </p>
      </Card>
    </div>
  );
}

function RunnerRow({ r, card, hist, j, t, ch, res }: { r: Runner; card: RaceCard; hist: RunRow[]; j?: Tally; t?: Tally; ch?: { win: number | null; place: number | null }; res?: number }) {
  const last = [...hist].reverse().find((x) => x.final);
  const recorded = formString(hist);
  const form = r.form || recorded;
  const horseTally = hist.length ? tally(hist) : null;
  const flags: { label: string; tone: string }[] = [];
  if (last?.position === 1) flags.push({ label: "Won last start", tone: "text-win" });
  else if (last?.position && last.position <= 3) flags.push({ label: `${ord(last.position)} last start`, tone: "text-ink-200" });
  if (j && j.starts >= 10 && j.winPct >= 0.18) flags.push({ label: `Jockey ${pct(j.winPct)} wins`, tone: "text-court" });
  if (t && t.starts >= 10 && t.winPct >= 0.18) flags.push({ label: `Trainer ${pct(t.winPct)} wins`, tone: "text-court" });
  if (r.flucs.length >= 2 && r.flucs[r.flucs.length - 1] < r.flucs[0] * 0.8) flags.push({ label: "Firming", tone: "text-win" });
  if (r.flucs.length >= 2 && r.flucs[r.flucs.length - 1] > r.flucs[0] * 1.25) flags.push({ label: "Drifting", tone: "text-loss" });
  const game = `${card.meetingName} R${card.number}`;
  return (
    <li className={`flex gap-3 px-3 py-3 sm:px-4 ${r.scratched ? "opacity-45" : ""}`}>
      <div className="flex w-9 shrink-0 flex-col items-center gap-1">
        <span className={`display grid h-9 w-9 place-items-center rounded-lg text-base font-extrabold ${res === 1 ? "bg-court text-ink-950" : "bg-ink-800 text-ink-100"}`}>{r.number}</span>
        {r.barrier != null && <span className="text-[10px] text-ink-500">({r.barrier})</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link href={`/racing/horse/${slugOf(r.name)}`} className={`font-semibold hover:text-court ${r.scratched ? "line-through" : ""}`}>
            {r.name}
          </Link>
          {res && <span className="text-xs font-bold text-court">{ord(res)}</span>}
          {r.scratched && <span className="text-[11px] font-bold text-loss">SCRATCHED</span>}
          <span className="num text-xs text-ink-500">{form ? form.slice(-8) : ""}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-400">
          {r.jockey && (
            <span>
              {card.category === "H" ? "D" : "J"}:{" "}
              <Link href={`/racing/jockey/${slugOf(r.jockey)}`} className="text-ink-200 hover:text-court">
                {r.jockey}
              </Link>
              {r.claim && <span className="text-ink-500"> ({r.claim})</span>}
              {j && j.starts > 0 && <span className="text-ink-500"> · {pct(j.winPct)} ({j.wins}/{j.starts})</span>}
            </span>
          )}
          {r.trainer && (
            <span>
              T:{" "}
              <Link href={`/racing/trainer/${slugOf(r.trainer)}`} className="text-ink-200 hover:text-court">
                {r.trainer}
              </Link>
              {t && t.starts > 0 && <span className="text-ink-500"> · {pct(t.winPct)} ({t.wins}/{t.starts})</span>}
            </span>
          )}
          {r.weight != null && <span>{r.weight}kg</span>}
          {(r.age || r.sex) && <span>{[r.age ? `${r.age}yo` : "", r.sex].filter(Boolean).join(" ")}</span>}
          {horseTally && horseTally.starts > 0 && (
            <span>
              Recorded: {horseTally.starts}: {horseTally.wins}-{horseTally.seconds}-{horseTally.thirds}
            </span>
          )}
        </div>
        {last && (
          <div className="mt-0.5 text-[11px] text-ink-500">
            Last start: {last.position ? ord(last.position) : "unplaced"} of {last.field_size} at {last.meeting} R{last.race_no}, {fmtDate(last.date + "T00:00:00Z", { day: "numeric", month: "short" })}
            {last.distance ? ` · ${last.distance}m` : ""}
            {last.track_condition ? ` · ${last.track_condition}` : ""}
            {last.win_odds ? ` · $${last.win_odds.toFixed(2)}` : ""}
          </div>
        )}
        {flags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {flags.map((f) => (
              <span key={f.label} className={`rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-semibold ${f.tone}`}>
                {f.label}
              </span>
            ))}
          </div>
        )}
        {r.formComment && <p className="mt-1 line-clamp-2 text-[11px] text-ink-500">{r.formComment}</p>}
      </div>
      {!r.scratched && (
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <div className="num text-sm">
            <span className="font-semibold text-ink-100">{money(r.winOdds)}</span>
            <span className="text-ink-500"> / {money(r.placeOdds)}</span>
          </div>
          <div className="text-[11px] text-ink-500">
            {pct(ch?.win)} win{ch?.place != null ? ` · ${pct(ch.place)} place` : ""}
          </div>
          {r.flucs.length >= 2 && (
            <div className="num text-[10px] text-ink-500">
              {r.flucs[0].toFixed(2)} → {r.flucs[r.flucs.length - 1].toFixed(2)}
            </div>
          )}
          {ch?.win != null && (
            <div className="flex gap-1">
              <AddToSlip legs={[{ id: `${card.id}:win:${r.number}`, gameId: card.id, game, label: `${r.number}. ${r.name} win`, p: ch.win }]} label="+ Win" />
              {ch.place != null && <AddToSlip legs={[{ id: `${card.id}:place:${r.number}`, gameId: card.id, game, label: `${r.number}. ${r.name} place`, p: ch.place }]} label="+ Place" />}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Results({ card }: { card: RaceCard }) {
  const byNo = new Map(card.runners.map((r) => [r.number, r]));
  const divs = card.dividends.filter((d) => d.dividend != null);
  return (
    <Card title="Result" right={card.status}>
      <ol className="space-y-1.5">
        {card.results.map((x) => {
          const r = byNo.get(x.number);
          return (
            <li key={`${x.position}-${x.number}`} className="flex items-center gap-3 text-sm">
              <span className={`display grid h-7 w-7 place-items-center rounded-md font-extrabold ${x.position === 1 ? "bg-court text-ink-950" : "bg-ink-800"}`}>{x.position}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="text-ink-500">{x.number}.</span> {x.name || r?.name}
                {r?.jockey && <span className="text-xs text-ink-500"> · {r.jockey}</span>}
              </span>
              {x.margin != null && x.position > 1 && <span className="text-xs text-ink-500">{x.margin}L</span>}
              {r?.winOdds && <span className="num text-xs text-ink-400">${r.winOdds.toFixed(2)}</span>}
            </li>
          );
        })}
      </ol>
      {divs.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="stat-table compact">
            <thead>
              <tr>
                <th className="!text-left">Bet type</th>
                <th className="!text-left">Runners</th>
                <th>Dividend</th>
                <th>Pool</th>
              </tr>
            </thead>
            <tbody>
              {divs.slice(0, 16).map((d, i) => (
                <tr key={i}>
                  <td className="!text-left font-sans">
                    {d.product}
                    {d.tote && <span className="text-ink-500"> · {d.tote}</span>}
                  </td>
                  <td className="!text-left">{d.positions.map((p) => p.number).join("-")}</td>
                  <td className="font-semibold !text-ink-100">{d.dividend != null ? `$${d.dividend.toFixed(2)}` : "–"}</td>
                  <td>{d.pool != null ? `$${Math.round(d.pool).toLocaleString()}` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
