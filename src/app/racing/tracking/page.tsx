import Link from "next/link";
import { toggleFollowAction } from "@/app/racing/actions";
import { Card, Empty, PageTitle } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import { slugOf } from "@/lib/racing/core";
import { follows, runsFor, searchNames, upcomingFor, type Follow, type PersonKind } from "@/lib/racing/store";
import { getViewer } from "@/lib/session";

export const dynamic = "force-dynamic";

const LABEL: Record<PersonKind, string> = { horse: "Horse", jockey: "Jockey", trainer: "Trainer" };
const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;

function FollowButton({ f, on, back }: { f: Follow; on: boolean; back: string }) {
  return (
    <form action={toggleFollowAction}>
      <input type="hidden" name="kind" value={f.kind} />
      <input type="hidden" name="key" value={f.key} />
      <input type="hidden" name="name" value={f.name} />
      <input type="hidden" name="on" value={on ? "1" : "0"} />
      <input type="hidden" name="back" value={back} />
      <button className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${on ? "border-ink-700 text-ink-300 hover:border-court hover:text-court" : "border-ink-700 text-ink-500 hover:border-loss hover:text-loss"}`}>{on ? "+ Track" : "Remove"}</button>
    </form>
  );
}

export default async function Tracking({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const v = await getViewer();
  const uid = v?.user?.id ?? 0;
  const list = await follows(uid).catch(() => [] as Follow[]);
  const keys = (k: PersonKind) => list.filter((f) => f.kind === k).map((f) => f.key);
  const [upH, upJ, upT, found] = await Promise.all([upcomingFor("horse", keys("horse")), upcomingFor("jockey", keys("jockey")), upcomingFor("trainer", keys("trainer")), sp.q ? searchNames(sp.q) : Promise.resolve([])]);
  const upcoming = [...upH.map((u) => ({ ...u, kind: "horse" as const })), ...upJ.map((u) => ({ ...u, kind: "jockey" as const })), ...upT.map((u) => ({ ...u, kind: "trainer" as const }))].sort((a, b) => (a.start < b.start ? -1 : 1));
  const recent = (await Promise.all(list.map(async (f) => (await runsFor(f.kind, f.key, 14)).filter((r) => r.final).map((r) => ({ ...r, f }))))).flat().sort((a, b) => (a.start < b.start ? 1 : -1)).slice(0, 30);
  const followed = new Set(list.map((f) => `${f.kind}:${f.key}`));
  const back = `/racing/tracking${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`;

  return (
    <div className="space-y-5">
      <PageTitle sub="Track horses, jockeys and trainers. Their upcoming runs and latest results show here as soon as fields and results are published.">My tracking</PageTitle>

      <form className="flex gap-2" action="/racing/tracking">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search a horse, jockey, driver or trainer…" className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm outline-none focus:border-court" />
        <button className="display rounded-lg bg-court px-4 py-2 text-sm font-bold text-ink-950">Search</button>
      </form>
      {sp.q && (
        <Card pad={false} title={`Results for “${sp.q}”`}>
          {!found.length ? (
            <p className="px-4 py-3 text-sm text-ink-500">No horse, jockey or trainer by that name in the results we&apos;ve recorded yet.</p>
          ) : (
            <ul className="divide-y divide-ink-800">
              {found.map((x) => (
                <li key={`${x.kind}:${x.key}`} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-16 shrink-0 text-xs text-ink-500">{LABEL[x.kind]}</span>
                  <Link href={`/racing/${x.kind}/${slugOf(x.name)}`} className="min-w-0 flex-1 truncate hover:text-court">
                    {x.name}
                  </Link>
                  <span className="text-xs text-ink-500">{x.starts} starts</span>
                  {!followed.has(`${x.kind}:${x.key}`) && <FollowButton f={{ kind: x.kind, key: x.key, name: x.name }} on back={back} />}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {!list.length ? (
        <Empty>You&apos;re not tracking anyone yet. Search above, or tap “+ Track” on any horse, jockey or trainer page.</Empty>
      ) : (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="min-w-0 space-y-5 lg:col-span-3">
            <Card pad={false} title="Coming up" right="from published fields">
              {!upcoming.length ? (
                <p className="px-4 py-3 text-sm text-ink-500">None of your tracked runners are in a published field yet.</p>
              ) : (
                <ul className="divide-y divide-ink-800">
                  {upcoming.map((u) => (
                    <li key={`${u.kind}-${u.race_id}-${u.number}`}>
                      <Link href={`/racing/race/${u.race_id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-ink-800/40">
                        <span className="num w-28 shrink-0 whitespace-nowrap text-ink-300">{u.start ? `${fmtDate(u.start, { weekday: "short" })} ${fmtTime(u.start)}` : u.date}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {u.number}. {u.horse}
                          </span>
                          <span className="block truncate text-xs text-ink-500">
                            {u.meeting} R{u.race_no} · {u.jockey} / {u.trainer}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-court">{LABEL[u.kind]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card pad={false} title="Latest results" right="last 14 days">
              {!recent.length ? (
                <p className="px-4 py-3 text-sm text-ink-500">No recorded results in the last two weeks.</p>
              ) : (
                <ul className="divide-y divide-ink-800">
                  {recent.map((r) => (
                    <li key={`${r.f.kind}-${r.race_id}-${r.number}`}>
                      <Link href={`/racing/race/${r.race_id}`} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-ink-800/40">
                        <span className={`display w-12 shrink-0 font-bold ${r.position === 1 ? "text-court" : r.position && r.position <= 3 ? "text-ink-100" : "text-ink-500"}`}>{r.position ? ord(r.position) : "–"}</span>
                        <span className="min-w-0 flex-1 truncate">
                          {r.horse} <span className="text-xs text-ink-500">· {r.meeting} R{r.race_no} · {r.jockey}</span>
                        </span>
                        <span className="shrink-0 text-xs text-ink-500">{r.win_odds ? `$${r.win_odds.toFixed(2)}` : ""}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <Card className="self-start lg:col-span-2" pad={false} title={`Tracking ${list.length}`}>
            <ul className="divide-y divide-ink-800">
              {list.map((f) => (
                <li key={`${f.kind}:${f.key}`} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-14 shrink-0 text-xs text-ink-500">{LABEL[f.kind]}</span>
                  <Link href={`/racing/${f.kind}/${slugOf(f.name)}`} className="min-w-0 flex-1 truncate hover:text-court">
                    {f.name}
                  </Link>
                  <FollowButton f={f} on={false} back={back} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
