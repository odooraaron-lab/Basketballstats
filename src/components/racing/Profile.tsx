// Horse / jockey / trainer profile, built from every result we've recorded.
import Link from "next/link";
import { toggleFollowAction } from "@/app/racing/actions";
import { Card, Empty, PageTitle, Stat } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import { CATEGORY_LABEL, formString, slugOf, tally, type RunRow, type Tally } from "@/lib/racing/core";
import { follows, runsFor, upcomingFor, type PersonKind } from "@/lib/racing/store";
import { getViewer } from "@/lib/session";

const pct = (p: number) => `${Math.round(p * 100)}%`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}$${Math.abs(v).toFixed(2)}`;
const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;
const KIND_LABEL: Record<PersonKind, string> = { horse: "Horse", jockey: "Jockey / driver", trainer: "Trainer" };

function distBand(d: number | null) {
  if (!d) return "Unknown";
  if (d <= 1200) return "Up to 1200m";
  if (d <= 1600) return "1201–1600m";
  if (d <= 2000) return "1601–2000m";
  return "Over 2000m";
}
function going(c: string) {
  const s = c.toLowerCase();
  if (!s) return "Unknown";
  if (/heavy/.test(s)) return "Heavy";
  if (/soft/.test(s)) return "Soft";
  if (/good/.test(s)) return "Good";
  if (/firm|fast/.test(s)) return "Firm / fast";
  if (/synth|all.?weather|awt/.test(s)) return "Synthetic";
  return c;
}
function priceBand(o: number | null) {
  if (!o) return "No price";
  if (o <= 3) return "Up to $3";
  if (o <= 6) return "$3–$6";
  if (o <= 12) return "$6–$12";
  return "Over $12";
}

function Splits({ title, runs, by, min = 1 }: { title: string; runs: RunRow[]; by: (r: RunRow) => string; min?: number }) {
  const groups = new Map<string, RunRow[]>();
  for (const r of runs.filter((x) => x.final)) groups.set(by(r), [...(groups.get(by(r)) ?? []), r]);
  const rows = [...groups.entries()].map(([k, rs]) => ({ k, t: tally(rs) })).filter((x) => x.t.starts >= min).sort((a, b) => b.t.starts - a.t.starts).slice(0, 10);
  if (!rows.length) return null;
  return (
    <Card pad={false} title={title}>
      <div className="overflow-x-auto">
        <table className="stat-table compact">
          <thead>
            <tr>
              <th className="!text-left" />
              <th>Starts</th>
              <th>W</th>
              <th>Pl</th>
              <th>Win %</th>
              <th>$1 P/L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ k, t }) => (
              <tr key={k}>
                <td className="!text-left font-sans">{k}</td>
                <td>{t.starts}</td>
                <td>{t.wins}</td>
                <td>{t.places}</td>
                <td className="font-semibold !text-ink-100">{pct(t.winPct)}</td>
                <td className={t.pl >= 0 ? "!text-win" : "!text-loss"}>{signed(t.pl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export async function Profile({ kind, slug }: { kind: PersonKind; slug: string }) {
  const key = decodeURIComponent(slug).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const [runs, upcoming, viewer] = await Promise.all([runsFor(kind, key).catch(() => []), upcomingFor(kind, [key]).catch(() => []), getViewer()]);
  const name = runs[runs.length - 1]?.[kind] ?? upcoming[0]?.[kind] ?? decodeURIComponent(slug).replace(/-/g, " ");
  const mine = viewer ? await follows(viewer.user?.id ?? 0).catch(() => []) : [];
  const following = mine.some((f) => f.kind === kind && f.key === key);
  const done = runs.filter((r) => r.final);
  const all: Tally = tally(done);
  const cutoff = (days: number) => new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const t30 = tally(done.filter((r) => r.date >= cutoff(30)));
  const back = `/racing/${kind}/${slug}`;

  return (
    <div className="space-y-5">
      <PageTitle
        sub={`${KIND_LABEL[kind]} · ${all.starts} recorded start${all.starts === 1 ? "" : "s"}${done[0] ? ` since ${fmtDate(done[0].date + "T00:00:00Z", { day: "numeric", month: "short", year: "numeric" })}` : ""}`}
        right={
          <form action={toggleFollowAction}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="key" value={key} />
            <input type="hidden" name="name" value={name} />
            <input type="hidden" name="on" value={following ? "0" : "1"} />
            <input type="hidden" name="back" value={back} />
            <button className={`display rounded-lg px-4 py-2 text-sm font-bold ${following ? "border border-court text-court" : "bg-court text-ink-950 hover:bg-court-soft"}`}>{following ? "✓ Tracking" : "+ Track"}</button>
          </form>
        }
      >
        {name}
      </PageTitle>

      {!runs.length && !upcoming.length ? (
        <Empty>We haven&apos;t recorded a start for {name} yet. Results are added as each race finishes, so check back after their next run.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Starts" value={all.starts} sub={kind === "horse" ? `form ${formString(runs, 8) || "–"}` : `${t30.starts} in last 30 days`} />
            <Stat label="Wins" value={all.wins} sub={`${all.seconds} seconds · ${all.thirds} thirds`} tone="accent" />
            <Stat label="Win %" value={pct(all.winPct)} sub={kind !== "horse" ? `30 days: ${pct(t30.winPct)}` : undefined} />
            <Stat label="Place %" value={pct(all.placePct)} sub="top three" />
            <Stat label="$1 level stakes" value={signed(all.pl)} sub={`ROI ${Math.round(all.roi * 100)}% at fixed odds`} tone={all.pl >= 0 ? "win" : "loss"} />
            <Stat label="Avg winning price" value={all.avgWinOdds ? `$${all.avgWinOdds.toFixed(2)}` : "–"} />
          </div>

          {upcoming.length > 0 && (
            <Card pad={false} title="Next up">
              <ul className="divide-y divide-ink-800">
                {upcoming.map((u) => (
                  <li key={`${u.race_id}-${u.number}`}>
                    <Link href={`/racing/race/${u.race_id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-ink-800/40">
                      <span className="num w-28 shrink-0 whitespace-nowrap text-ink-300">
                        {u.start ? `${fmtDate(u.start, { weekday: "short" })} ${fmtTime(u.start)}` : u.date}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{kind === "horse" ? `${u.meeting} R${u.race_no}` : `${u.number}. ${u.horse}`}</span>
                        <span className="block truncate text-xs text-ink-500">
                          {kind === "horse" ? `${u.jockey} / ${u.trainer}` : `${u.meeting} R${u.race_no} · ${kind === "jockey" ? u.trainer : u.jockey}`}
                          {u.distance ? ` · ${u.distance}m` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-400">{u.win_odds ? `$${u.win_odds.toFixed(2)}` : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            {kind === "horse" && (
              <>
                <Splits title="By track condition" runs={runs} by={(r) => going(r.track_condition)} />
                <Splits title="By distance" runs={runs} by={(r) => distBand(r.distance)} />
                <Splits title="By jockey / driver" runs={runs} by={(r) => r.jockey || "Unknown"} />
              </>
            )}
            {kind === "jockey" && (
              <>
                <Splits title="By price" runs={runs} by={(r) => priceBand(r.win_odds)} />
                <Splits title="Top trainers" runs={runs} by={(r) => r.trainer || "Unknown"} min={2} />
                <Splits title="By track" runs={runs} by={(r) => r.meeting} min={2} />
              </>
            )}
            {kind === "trainer" && (
              <>
                <Splits title="By price" runs={runs} by={(r) => priceBand(r.win_odds)} />
                <Splits title="Top jockeys / drivers" runs={runs} by={(r) => r.jockey || "Unknown"} min={2} />
                <Splits title="By track" runs={runs} by={(r) => r.meeting} min={2} />
              </>
            )}
          </div>

          <Card pad={false} title="Recorded starts" right="most recent first">
            <div className="overflow-x-auto">
              <table className="stat-table compact">
                <thead>
                  <tr>
                    <th className="!text-left">Date</th>
                    <th className="!text-left">Race</th>
                    {kind !== "horse" && <th className="!text-left">Horse</th>}
                    {kind !== "jockey" && <th className="!text-left">Jockey</th>}
                    {kind !== "trainer" && <th className="!text-left">Trainer</th>}
                    <th>Dist</th>
                    <th className="!text-left">Track</th>
                    <th>Bar</th>
                    <th>Price</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {[...done].reverse().slice(0, 60).map((r) => (
                    <tr key={`${r.race_id}-${r.number}`}>
                      <td className="!text-left whitespace-nowrap font-sans text-ink-400">{fmtDate(r.date + "T00:00:00Z", { day: "numeric", month: "short" })}</td>
                      <td className="!text-left whitespace-nowrap font-sans">
                        <Link href={`/racing/race/${r.race_id}`} className="hover:text-court">
                          {r.meeting} R{r.race_no}
                        </Link>
                        <span className="ml-1 text-[10px] text-ink-500">{CATEGORY_LABEL[r.category]?.[0]}</span>
                      </td>
                      {kind !== "horse" && (
                        <td className="!text-left whitespace-nowrap font-sans">
                          <Link href={`/racing/horse/${slugOf(r.horse)}`} className="hover:text-court">
                            {r.horse}
                          </Link>
                        </td>
                      )}
                      {kind !== "jockey" && (
                        <td className="!text-left whitespace-nowrap font-sans">
                          <Link href={`/racing/jockey/${slugOf(r.jockey)}`} className="hover:text-court">
                            {r.jockey}
                          </Link>
                        </td>
                      )}
                      {kind !== "trainer" && (
                        <td className="!text-left whitespace-nowrap font-sans">
                          <Link href={`/racing/trainer/${slugOf(r.trainer)}`} className="hover:text-court">
                            {r.trainer}
                          </Link>
                        </td>
                      )}
                      <td>{r.distance ?? "–"}</td>
                      <td className="!text-left font-sans text-xs">{r.track_condition}</td>
                      <td>{r.barrier ?? "–"}</td>
                      <td>{r.win_odds ? `$${r.win_odds.toFixed(2)}` : "–"}</td>
                      <td className={`font-semibold ${r.position === 1 ? "!text-court" : r.position && r.position <= 3 ? "!text-ink-100" : "!text-ink-500"}`}>
                        {r.position ? `${ord(r.position)}/${r.field_size}` : `–/${r.field_size}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-2 text-[11px] text-ink-500">The feed publishes the placegetters, so finishes outside the top three or four show as –. Prices are the last fixed win odds we recorded.</p>
          </Card>
        </>
      )}
    </div>
  );
}
