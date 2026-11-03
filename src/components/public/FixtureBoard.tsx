// The homepage's signature piece: a stadium-style fixture board built from the real season status
// of every competition. It stays dark in both themes, the way a scoreboard does.
import type { SportStatus } from "@/lib/seasonStatus";

const LAMP: Record<SportStatus["state"], { label: string; dot: string; text: string }> = {
  live: { label: "Live", dot: "bg-[#f4c430]", text: "text-[#f4c430]" },
  "in-season": { label: "On", dot: "bg-[#3fbf7f]", text: "text-[#9fe0bd]" },
  "off-season": { label: "Off", dot: "bg-[#3a4d42]", text: "text-[#7f948a]" },
};

export function FixtureBoard({ status, on }: { status: SportStatus[]; on: number }) {
  const today = new Date().toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="min-w-0 self-start overflow-hidden rounded-lg border border-[#22382c] bg-[#07110c] text-[#f4f7f3]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[#22382c] px-4 py-3 sm:px-5">
        <h2 className="display text-lg font-extrabold">Fixture board</h2>
        <p className="text-sm text-[#93a99c]">
          {today}, <span className="num font-semibold text-[#f4f7f3]">{on}</span> of <span className="num">{status.length}</span> in season
        </p>
      </div>
      <ul>
        {status.map((s) => {
          const lamp = LAMP[s.state];
          return (
            <li key={s.id} className="border-b border-[#16261d] last:border-0">
              <div className="grid grid-cols-[3px_minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 py-2.5 pr-4 sm:grid-cols-[3px_8rem_minmax(0,1fr)_auto] sm:items-center sm:pr-5">
                <span className="row-span-2 self-stretch sm:row-span-1 sm:h-7" style={{ background: s.accent }} aria-hidden />
                <span className="display truncate pl-1 text-[15px] font-bold sm:pl-2" title={s.name}>
                  {s.short}
                </span>
                <span className="col-span-2 col-start-2 row-start-2 truncate pl-1 text-sm text-[#b4c6ba] sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:pl-0">{s.headline || s.region}</span>
                <span className={`col-start-3 row-start-1 inline-flex items-center gap-1.5 text-xs font-semibold sm:col-start-4 ${lamp.text}`}>
                  <span className={`h-2 w-2 rounded-full ${lamp.dot}`} aria-hidden />
                  {lamp.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-[#22382c] px-4 py-2.5 text-xs text-[#7f948a] sm:px-5">Off-season sections keep the full archive: every result, ladder and game log.</p>
    </div>
  );
}
