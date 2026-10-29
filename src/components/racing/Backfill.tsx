"use client";
// Admin: walk back day by day, saving every NZ race so form and strike rates have history.
import { useState } from "react";

interface Report {
  from: string;
  meetings: number;
  races: number;
  saved: number;
  remaining: number;
  error?: string;
}

const shift = (iso: string, d: number) => new Date(Date.parse(iso + "T00:00:00Z") + d * 86400_000).toISOString().slice(0, 10);

export function Backfill({ today }: { today: string }) {
  const [days, setDays] = useState(30);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const stop = { current: false };

  async function run() {
    setRunning(true);
    setLog([]);
    let d = shift(today, -1);
    for (let i = 0; i < days && !stop.current; i++) {
      let r: Report | null = null;
      for (let pass = 0; pass < 4; pass++) {
        const res = await fetch("/api/racing/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day: d }) }).catch(() => null);
        r = res && res.ok ? await res.json() : null;
        if (!r || r.error || !r.remaining) break; // whole day saved
      }
      setLog((l) => [`${d}: ${r ? (r.error ? r.error : `${r.meetings} meetings, ${r.races} races, ${r.saved} saved${r.remaining ? `, ${r.remaining} left` : ""}`) : "request failed"}`, ...l].slice(0, 60));
      if (r?.error) break;
      d = shift(d, -1);
    }
    setRunning(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-400">Backfill the last</span>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} disabled={running} className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1">
          {[7, 30, 60, 90, 180].map((n) => (
            <option key={n} value={n}>
              {n} days
            </option>
          ))}
        </select>
        <button onClick={run} disabled={running} className="rounded-lg bg-court px-4 py-1.5 font-semibold text-ink-950 disabled:opacity-50">
          {running ? "Working…" : "Start"}
        </button>
      </div>
      <p className="mt-1 text-xs text-ink-500">Keep this tab open. About 30–60 seconds per racing day; days already saved are skipped, so you can run it again any time.</p>
      {log.length > 0 && (
        <ul className="mt-3 max-h-64 space-y-0.5 overflow-y-auto font-mono text-xs text-ink-400">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
