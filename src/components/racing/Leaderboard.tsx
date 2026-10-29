import Link from "next/link";
import { SortableTable, type Column, type Row } from "@/components/SortableTable";
import { Empty, PageTitle } from "@/components/ui";
import { slugOf } from "@/lib/racing/core";
import { leaderboard, racingDbStatus } from "@/lib/racing/store";

const PERIODS = [
  ["30", "30 days"],
  ["90", "90 days"],
  ["365", "12 months"],
] as const;

export async function Leaderboard({ kind, sp }: { kind: "jockey" | "trainer"; sp: { days?: string; c?: string } }) {
  const days = PERIODS.some(([d]) => d === sp.days) ? Number(sp.days) : 90;
  const cat = sp.c === "T" || sp.c === "H" ? sp.c : "";
  const [rows, status] = await Promise.all([leaderboard(kind, days, cat, days <= 30 ? 3 : 5).catch(() => []), racingDbStatus().catch(() => null)]);
  const base = `/racing/${kind === "jockey" ? "jockeys" : "trainers"}`;
  const href = (d: number, c: string) => `${base}?days=${d}${c ? `&c=${c}` : ""}`;
  const columns: Column[] = [
    { key: "starts", label: "Starts", fmt: "int" },
    { key: "wins", label: "W", fmt: "int", heat: true },
    { key: "seconds", label: "2nd", fmt: "int" },
    { key: "thirds", label: "3rd", fmt: "int" },
    { key: "winPct", label: "Win %", fmt: "pct", heat: true },
    { key: "placePct", label: "Place %", fmt: "pct", heat: true },
    { key: "pl", label: "$1 P/L", title: "Profit or loss betting $1 to win on every start at the fixed price we recorded", fmt: "signed1", heat: true },
    { key: "roi", label: "ROI", fmt: "pct", heat: true },
    { key: "avg", label: "Avg win $", title: "Average fixed price of their winners", fmt: "2" },
  ];
  const table: Row[] = rows.map((r) => ({
    key: r.key,
    lead: { label: r.name, href: `/racing/${kind}/${slugOf(r.name)}`, sub: `last ride ${r.last}` },
    cells: { starts: r.starts, wins: r.wins, seconds: r.seconds, thirds: r.thirds, winPct: r.winPct, placePct: r.placePct, pl: r.pl, roi: r.roi, avg: r.avgWinOdds },
  }));
  return (
    <div>
      <PageTitle
        sub={`New Zealand ${cat === "T" ? "thoroughbred" : cat === "H" ? "harness" : "thoroughbred and harness"} results we've recorded${status?.first ? ` (since ${status.first})` : ""}. Click any column to sort.`}
        right={
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map(([d, l]) => (
              <Link key={d} href={href(Number(d), cat)} className={`chip ${Number(d) === days ? "!border-court !text-court" : ""}`}>
                {l}
              </Link>
            ))}
          </div>
        }
      >
        {kind === "jockey" ? "Jockeys & drivers" : "Trainers"}
      </PageTitle>
      <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
        {([["", "All"], ["T", "Thoroughbred"], ["H", "Harness"]] as const).map(([c, l]) => (
          <Link key={c} href={href(days, c)} className={`chip ${cat === c ? "!border-court !text-court" : ""}`}>
            {l}
          </Link>
        ))}
      </div>
      {!table.length ? (
        <Empty>No results recorded for this period yet. The form database fills as races finish (and an admin can backfill past weeks from Admin → Setup).</Empty>
      ) : (
        <>
          <SortableTable columns={columns} rows={table} leadLabel={kind === "jockey" ? "Jockey / driver" : "Trainer"} defaultSort={{ key: "wins", dir: "desc" }} searchable maxHeight={760} dense />
          <p className="mt-2 text-[11px] text-ink-500">$1 P/L = profit or loss from a $1 win bet on every start at the last fixed price we recorded. Positive ROI over a decent sample is where the value has been.</p>
        </>
      )}
    </div>
  );
}
