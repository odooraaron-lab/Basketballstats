"use client";
// League bar filter: pick which sports show in the top bar (saved to your settings).
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { setHiddenSectionsAction } from "@/app/account/actions";

const GROUPS: { label: string; ids: [string, string][] }[] = [
  { label: "Basketball", ids: [["nba", "NBA"], ["nbl", "NBL"]] },
  { label: "Rugby", ids: [["nrl", "NRL"], ["super-rugby", "Super Rugby"], ["all-blacks", "All Blacks"]] },
  { label: "Football & netball", ids: [["a-league", "A-League"], ["anz-premiership", "ANZ Premiership"]] },
  { label: "Cricket", ids: [["cricket", "World cricket"], ["super-smash", "Super Smash"]] },
  { label: "Racing", ids: [["racing", "Horse racing"]] },
];
const ALL = GROUPS.flatMap((g) => g.ids.map(([id]) => id));
export const ALL_SECTION_IDS = ALL;

export function LeagueFilter({ hidden, onChange }: { hidden: string[]; onChange?: (hiddenSections: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [off, setOff] = useState(() => new Set(hidden.filter((h) => ALL.includes(h))));
  const [pending, start] = useTransition();
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const save = (next: Set<string>) => {
    if (next.size >= ALL.length) return; // keep one
    setOff(next);
    onChange?.([...next]);
    start(async () => {
      await setHiddenSectionsAction([...next]);
      router.refresh();
    });
  };
  const toggle = (id: string) => {
    const n = new Set(off);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    save(n);
  };
  const shown = ALL.length - off.size;
  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${open ? "border-court text-court" : "border-ink-700 text-ink-300 hover:text-ink-100"}`}
        title="Choose which leagues show in this bar"
        aria-expanded={open}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M3 5h18l-7 8v6l-4 2v-8z" /></svg>
        <span className="hidden sm:inline">Leagues</span>
        <span className="num text-[10px] text-ink-500">{shown}/{ALL.length}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-ink-700 bg-ink-900 p-3 shadow-2xl shadow-black/50">
          <div className="mb-2 flex items-center justify-between">
            <span className="display text-xs font-bold text-ink-300">Show in top bar</span>
            {pending && <span className="text-[10px] text-ink-500">Saving…</span>}
          </div>
          {GROUPS.map((g) => (
            <div key={g.label} className="mb-2">
              <div className="flex items-center justify-between">
                <span className="display text-[10px] font-semibold text-ink-500">{g.label}</span>
                <button
                  type="button"
                  className="text-[10px] text-ink-500 hover:text-court"
                  onClick={() => {
                    const n = new Set(off);
                    const allOn = g.ids.every(([id]) => !n.has(id));
                    g.ids.forEach(([id]) => (allOn ? n.add(id) : n.delete(id)));
                    save(n);
                  }}
                >
                  {g.ids.every(([id]) => !off.has(id)) ? "hide all" : "show all"}
                </button>
              </div>
              {g.ids.map(([id, label]) => (
                <label key={id} className="flex cursor-pointer items-center gap-2 py-0.5 text-sm text-ink-200">
                  <input type="checkbox" checked={!off.has(id)} onChange={() => toggle(id)} className="accent-[#f26b1d]" />
                  {label}
                </label>
              ))}
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-ink-800 pt-2 text-xs">
            <button type="button" className="text-court hover:underline" onClick={() => save(new Set())}>
              Show everything
            </button>
            <a href="/account" className="text-ink-500 hover:text-ink-200">More settings</a>
          </div>
        </div>
      )}
    </div>
  );
}
