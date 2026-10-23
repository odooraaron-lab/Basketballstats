import Link from "next/link";
import { TeamLogo } from "@/components/Img";
import { Empty, PageTitle, Stat } from "@/components/ui";
import { getDayMatches, type Format, type Match } from "@/lib/cricket";
import { dayLabel, fmtTime, shiftDay, todayKey } from "@/lib/format";

export const revalidate = 60;

const FORMATS: { id: string; label: string; test: (m: Match) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "intl", label: "Internationals", test: (m) => m.international },
  { id: "test", label: "Tests & first-class", test: (m) => m.format === "Test" || m.format === "First-class" },
  { id: "odi", label: "One-day", test: (m) => m.format === "ODI" || m.format === "List A" },
  { id: "t20", label: "T20", test: (m) => m.format === "T20I" || m.format === "T20" },
];

const FORMAT_TAG: Record<Format, string> = { Test: "TEST", ODI: "ODI", T20I: "T20I", "First-class": "FC", "List A": "LIST A", T20: "T20", Other: "" };

export default async function CricketHome({ searchParams }: { searchParams: Promise<{ date?: string; f?: string; g?: string }> }) {
  const sp = await searchParams;
  const today = todayKey();
  const date = sp.date && /^\d{8}$/.test(sp.date) ? sp.date : today;
  const f = FORMATS.find((x) => x.id === sp.f) ?? FORMATS[0];
  const gender = sp.g === "w" ? "w" : sp.g === "m" ? "m" : "all";
  const all = await getDayMatches(date);
  const matches = all.filter((m) => f.test(m) && (gender === "all" || (gender === "w" ? m.women : !m.women)));
  const live = all.filter((m) => m.state === "in").length;

  const bySeries = new Map<string, Match[]>();
  for (const m of matches) bySeries.set(m.leagueName || "Other", [...(bySeries.get(m.leagueName || "Other") ?? []), m]);
  const series = [...bySeries.entries()].sort((a, b) => Number(b[1].some((m) => m.international)) - Number(a[1].some((m) => m.international)) || b[1].length - a[1].length);

  const href = (o: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    Object.entries({ date: sp.date, f: sp.f, g: sp.g, ...o }).forEach(([k, v]) => v && v !== "all" && q.set(k, v));
    return `/cricket?${q}`;
  };
  const chip = (on: boolean) => `chip ${on ? "!border-court !text-court" : "hover:text-ink-100"}`;
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(date, i - 3));

  return (
    <div className="space-y-5">
      <PageTitle sub="Every match in the world — Tests, ODIs, T20s, franchise leagues and domestic cricket. Days and start times in NZ time.">Cricket</PageTitle>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {week.map((d) => (
          <Link key={d} href={href({ date: d })} className={`chip shrink-0 flex-col !items-center !px-3 !py-1 ${d === date ? "!border-court !text-court" : ""}`}>
            <span className="display text-[10px]">{d === today ? "Today" : dayLabel(d, { weekday: "short" })}</span>
            <span className="num">
              {Number(d.slice(6, 8))}/{Number(d.slice(4, 6))}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FORMATS.map((x) => (
          <Link key={x.id} href={href({ f: x.id })} className={chip(x.id === f.id)}>
            {x.label}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px self-center bg-ink-700" />
        {[
          ["all", "Men & women"],
          ["m", "Men"],
          ["w", "Women"],
        ].map(([id, label]) => (
          <Link key={id} href={href({ g: id })} className={chip(gender === id)}>
            {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        <Stat label="Matches" value={matches.length} sub={dayLabel(date)} />
        <Stat label="Live now" value={live} tone={live ? "loss" : undefined} />
        <Stat label="Competitions" value={bySeries.size} />
      </div>

      {!series.length && <Empty>No matches on this day{f.id !== "all" ? " for this filter" : ""}.</Empty>}
      {series.map(([name, ms]) => (
        <section key={name}>
          <h2 className="display mb-2 text-base font-bold text-ink-300">{name}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ms.map((m) => (
              <MatchTile key={m.id} m={m} date={date} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MatchTile({ m, date }: { m: Match; date: string }) {
  return (
    <Link href={`/cricket/match/${m.leagueId}/${m.id}?d=${date}`} className="card block p-3 transition hover:border-ink-600">
      <div className="mb-2 flex items-center gap-2 text-[11px]">
        {FORMAT_TAG[m.format] && <span className="rounded bg-ink-800 px-1.5 py-0.5 font-bold text-ink-300">{FORMAT_TAG[m.format]}</span>}
        {m.women && <span className="rounded bg-ink-800 px-1.5 py-0.5 text-ink-400">W</span>}
        {m.state === "in" ? (
          <span className="flex items-center gap-1 font-semibold text-loss">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-loss" /> LIVE
          </span>
        ) : m.state === "pre" ? (
          <span className="text-ink-300">{fmtTime(m.date)}</span>
        ) : (
          <span className="font-semibold text-ink-400">Result</span>
        )}
        <span className="ml-auto truncate text-ink-600">{m.description}</span>
      </div>
      <div className="space-y-1.5">
        {m.teams.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5">
            <TeamLogo src={t.logo} alt={t.abbr} size={24} />
            <span className={`flex-1 truncate text-sm ${t.winner ? "font-semibold text-ink-100" : "text-ink-300"}`}>{t.name}</span>
            <span className={`num text-sm ${t.winner ? "font-bold text-ink-100" : "text-ink-300"}`}>{t.score || ""}</span>
          </div>
        ))}
      </div>
      {(m.summary || m.status) && <div className="mt-2 border-t border-ink-800 pt-2 text-[11px] text-ink-400">{m.summary || m.status}</div>}
    </Link>
  );
}
