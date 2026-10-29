import Link from "next/link";
import { after } from "next/server";
import { Card, Empty, PageTitle } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import { CATEGORY_LABEL, type Category, type Meeting } from "@/lib/racing/core";
import { ingestRecent, nzShift, nzToday } from "@/lib/racing/store";
import { getMeetings, lastFetch } from "@/lib/racing/tab";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const statusTone = (s: string) => (/final|paying|interim/i.test(s) ? "text-ink-500" : /abandon/i.test(s) ? "text-loss line-through" : /closed|live/i.test(s) ? "text-loss" : "text-ink-300");

export default async function RacingHome({ searchParams }: { searchParams: Promise<{ d?: string; c?: string }> }) {
  const sp = await searchParams;
  const today = nzToday();
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : today;
  const cat: Category | "" = sp.c === "T" || sp.c === "H" ? sp.c : "";
  const meetings = await getMeetings(day, day);
  const shown = meetings.filter((m) => !cat || m.category === cat);
  // Keep the form database topped up (yesterday → tomorrow) after the page is sent
  after(() => ingestRecent().catch(() => null));

  const now = Date.now();
  const nextToGo = meetings
    .flatMap((m) => m.races.map((r) => ({ m, r })))
    .filter(({ r }) => Date.parse(r.start) > now - 60_000 && !/final|abandon|interim/i.test(r.status))
    .sort((a, b) => (a.r.start < b.r.start ? -1 : 1))
    .slice(0, 6);
  const days = [-1, 0, 1, 2].map((n) => nzShift(today, n));
  const href = (d: string, c: string) => `/racing?d=${d}${c ? `&c=${c}` : ""}`;

  return (
    <div className="space-y-6">
      <PageTitle
        sub={`New Zealand thoroughbred and harness meetings · ${fmtDate(`${day}T00:00:00Z`, { weekday: "long", day: "numeric", month: "long" })} · times in NZ`}
        right={
          <div className="flex flex-wrap gap-1.5">
            {days.map((d) => (
              <Link key={d} href={href(d, cat)} className={`chip ${d === day ? "!border-court !text-court" : ""}`}>
                {d === today ? "Today" : d === nzShift(today, -1) ? "Yesterday" : d === nzShift(today, 1) ? "Tomorrow" : fmtDate(`${d}T00:00:00Z`, { weekday: "short", day: "numeric" })}
              </Link>
            ))}
          </div>
        }
      >
        Racing
      </PageTitle>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {([["", "All"], ["T", "Thoroughbred"], ["H", "Harness"]] as const).map(([c, label]) => (
          <Link key={c} href={href(day, c)} className={`chip ${cat === c ? "!border-court !text-court" : ""}`}>
            {label}
          </Link>
        ))}
      </div>

      {nextToGo.length > 0 && (
        <section>
          <h2 className="display mb-2 text-lg font-bold text-ink-200">Next to go</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {nextToGo.map(({ m, r }) => (
              <Link key={r.id} href={`/racing/race/${r.id}`} className="card flex items-center gap-3 p-3 hover:border-ink-600">
                <span className="display grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-court/15 text-sm font-extrabold text-court">R{r.number}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{m.name}</div>
                  <div className="truncate text-xs text-ink-400">{r.name}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="num text-sm font-semibold">{fmtTime(r.start)}</div>
                  <div className="text-[11px] text-ink-500">{countdown(r.start, now)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!shown.length ? (
        <Empty>
          {lastFetch.ok || meetings.length ? "No New Zealand meetings listed for this day." : "The racing feed isn't responding right now. Try again in a few minutes."}
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((m) => (
            <MeetingCard key={m.id} m={m} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function countdown(iso: string, now: number) {
  const mins = Math.round((Date.parse(iso) - now) / 60_000);
  if (mins <= 0) return "jumping";
  if (mins < 60) return `in ${mins}m`;
  return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function MeetingCard({ m, now }: { m: Meeting; now: number }) {
  const first = m.races[0];
  return (
    <Card
      pad={false}
      title={
        <Link href={`/racing/meeting/${m.id}`} className="flex items-center gap-2 hover:text-court">
          {m.name}
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${m.category === "H" ? "bg-sky-500/15 text-sky-400" : "bg-court/15 text-court"}`}>{CATEGORY_LABEL[m.category]}</span>
        </Link>
      }
      right={[first?.trackCondition, first?.weather].filter(Boolean).join(" · ")}
    >
      <ul className="divide-y divide-ink-800">
        {m.races.map((r) => (
          <li key={r.id}>
            <Link href={`/racing/race/${r.id}`} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-ink-800/40">
              <span className="display w-8 shrink-0 font-bold text-ink-400">R{r.number}</span>
              <span className="num w-[4.5rem] shrink-0 whitespace-nowrap text-ink-300">{fmtTime(r.start)}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <span className="hidden shrink-0 text-xs text-ink-500 sm:inline">{r.distance ? `${r.distance}m` : ""}</span>
              <span className={`w-16 shrink-0 text-right text-xs ${statusTone(r.status)}`}>{/open/i.test(r.status) || !r.status ? countdown(r.start, now) : r.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
