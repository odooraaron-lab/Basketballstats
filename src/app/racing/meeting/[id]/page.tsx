import Link from "next/link";
import { Card, Empty, PageTitle } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import { CATEGORY_LABEL } from "@/lib/racing/core";
import { winnersFor } from "@/lib/racing/store";
import { getMeeting } from "@/lib/racing/tab";

export const dynamic = "force-dynamic";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMeeting(id);
  if (!m) return <Empty>We couldn&apos;t load this meeting from the racing feed.</Empty>;
  const winners = await winnersFor(m.races.map((r) => r.id)).catch(() => new Map());
  const first = m.races[0];
  return (
    <div className="space-y-5">
      <Link href={`/racing?d=${m.date}`} className="text-sm text-ink-400 hover:text-court">
        ← All meetings
      </Link>
      <PageTitle sub={`${CATEGORY_LABEL[m.category]} · ${fmtDate(`${m.date}T00:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}${first?.trackCondition ? ` · Track ${first.trackCondition}` : ""}${first?.weather ? ` · ${first.weather}` : ""}`}>
        {m.name}
      </PageTitle>
      <Card pad={false}>
        <ul className="divide-y divide-ink-800">
          {m.races.map((r) => {
            const w = winners.get(r.id);
            return (
              <li key={r.id}>
                <Link href={`/racing/race/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-800/40">
                  <span className="display grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-800 font-extrabold">R{r.number}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{r.name}</div>
                    <div className="text-xs text-ink-500">
                      {fmtTime(r.start)}
                      {r.distance ? ` · ${r.distance}m` : ""}
                      {r.trackCondition ? ` · ${r.trackCondition}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    {w ? (
                      <>
                        <div className="font-semibold text-court">1st {w.horse}</div>
                        <div className="text-ink-500">
                          {w.jockey}
                          {w.win_odds ? ` · $${w.win_odds.toFixed(2)}` : ""}
                        </div>
                      </>
                    ) : (
                      <span className="text-ink-400">{r.status || "Open"}</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
