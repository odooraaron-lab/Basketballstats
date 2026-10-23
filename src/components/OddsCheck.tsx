"use client";

import { useState } from "react";
import type { SlipResult } from "@/lib/slip";
import { MARKET_LABEL, parseOcrText, type Market, type SlipRow } from "@/lib/slipCore";
import { Headshot, TeamLogo } from "./Img";

const pct = (p: number | null | undefined) => (p == null ? "–" : `${Math.round(p * 100)}%`);
type Phase = "idle" | "reading" | "review" | "checking" | "done";

export function OddsCheck({ league }: { league: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<SlipRow[]>([]);
  const [market, setMarket] = useState<Market>("pts");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<SlipResult[]>([]);
  const [method, setMethod] = useState<"claude" | "ocr" | null>(null);

  async function onFile(file: File) {
    setError("");
    setResults([]);
    setPreview(URL.createObjectURL(file));
    setPhase("reading");
    setStatus("Reading the screenshot…");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/slip/read", { method: "POST", body: fd });
      if (res.ok) {
        const j = (await res.json()) as { rows: SlipRow[]; market: Market | null };
        setMethod("claude");
        if (j.market) setMarket(j.market);
        setRows(j.rows);
        setPhase("review");
        return;
      }
      if (res.status !== 501) throw new Error((await res.json().catch(() => ({}))).error ?? `Read failed (${res.status})`);
      // No vision key configured: read it on this device instead
      setMethod("ocr");
      setStatus("Reading text on your device (first time downloads ~10 MB)…");
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: { status: string; progress: number }) => m.status === "recognizing text" && setStatus(`Reading text… ${Math.round(m.progress * 100)}%`),
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const parsed = parseOcrText(data.text);
      setRows(parsed);
      setPhase("review");
      if (!parsed.length) setError("Couldn't find player lines in that image. Try a tighter screenshot of the list, or add rows by hand below.");
    } catch (e) {
      setError((e as Error).message);
      setPhase("review");
    }
  }

  async function check() {
    setPhase("checking");
    setError("");
    try {
      const res = await fetch("/api/slip/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ league, market, rows }) });
      if (!res.ok) throw new Error(`Check failed (${res.status})`);
      const j = (await res.json()) as { results: SlipResult[] };
      setResults(j.results);
      setPhase("done");
      setTimeout(() => document.getElementById("odds-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setError((e as Error).message);
      setPhase("review");
    }
  }

  const update = (i: number, patch: Partial<SlipRow>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const num = (v: string) => (v === "" ? null : Number(v));

  const strong = results.filter((r) => r.verdict.strength === "strong");
  const leans = results.filter((r) => r.verdict.strength === "lean");
  const picks = [...strong, ...leans];
  const comboOdds = picks.reduce((a, r) => a * ((r.verdict.pick === "over" ? r.row.over : r.row.under) ?? 1), 1);
  const comboP = picks.reduce((a, r) => a * (r.verdict.pick === "over" ? r.verdict.pOver : 1 - r.verdict.pOver), 1);

  return (
    <div className="space-y-5">
      <label className="card flex cursor-pointer flex-col items-center gap-3 border-dashed border-ink-600 px-4 py-8 text-center hover:border-court">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Uploaded screenshot" className="max-h-56 rounded-lg border border-ink-700 object-contain" />
        ) : (
          <span className="text-4xl">📷</span>
        )}
        <span className="display text-lg font-bold">{preview ? "Upload a different screenshot" : "Upload a betting screenshot"}</span>
        <span className="max-w-md text-xs text-ink-400">Player props with names, lines (O/U 21.5) and odds — like a points list from your betting app.</span>
      </label>

      {phase === "reading" && (
        <div className="flex items-center gap-3 text-sm text-ink-300">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-court border-t-transparent" />
          {status}
        </div>
      )}
      {error && <p className="rounded-md border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">{error}</p>}

      {(phase === "review" || phase === "checking" || phase === "done") && (
        <section className="card overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-ink-800 px-4 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="display text-lg font-bold">What we read</div>
              <div className="text-xs text-ink-400">
                {rows.length} lines {method === "ocr" ? "· read on your device — check names and numbers" : method === "claude" ? "· read with Claude vision" : ""}. Fix anything that&apos;s off before checking.
              </div>
            </div>
            <select value={market} onChange={(e) => setMarket(e.target.value as Market)} className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-sm">
              {(Object.keys(MARKET_LABEL) as Market[]).map((m) => (
                <option key={m} value={m}>
                  {MARKET_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="stat-table compact">
              <thead>
                <tr>
                  <th className="!text-left">Player</th>
                  <th>LINE</th>
                  <th>OVER</th>
                  <th>UNDER</th>
                  <th className="!text-left">RECENT (screen)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="!py-1">
                      <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} className="w-44 rounded border border-ink-700 bg-ink-950 px-1.5 py-1 font-sans text-sm" />
                    </td>
                    {(["line", "over", "under"] as const).map((k) => (
                      <td key={k} className="!py-1">
                        <input
                          inputMode="decimal"
                          value={r[k] ?? ""}
                          onChange={(e) => update(i, { [k]: k === "line" ? Number(e.target.value) || 0 : num(e.target.value) } as Partial<SlipRow>)}
                          className="w-16 rounded border border-ink-700 bg-ink-950 px-1.5 py-1 text-right"
                        />
                      </td>
                    ))}
                    <td className="!py-1 !text-left text-ink-400">{r.recent.join(" · ") || "–"}</td>
                    <td className="!py-1">
                      <button onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="text-ink-500 hover:text-loss" aria-label="Remove row">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-ink-800 px-4 py-3">
            <button onClick={() => setRows((r) => [...r, { name: "", line: 0, over: null, under: null, recent: [] }])} className="chip hover:text-ink-100">
              + Add row
            </button>
            <button
              onClick={check}
              disabled={!rows.length || phase === "checking"}
              className="display ml-auto rounded-lg bg-court px-5 py-2 text-sm font-bold text-ink-950 hover:bg-court-soft disabled:opacity-50"
            >
              {phase === "checking" ? "Checking history…" : "Check these odds"}
            </button>
          </div>
        </section>
      )}

      {phase === "done" && (
        <section id="odds-results" className="scroll-mt-20 space-y-4">
          <div className="card border-court/40 p-4">
            <div className="display text-xl font-extrabold">
              Feedback <span className="text-court">· {strong.length} strong, {leans.length} lean</span>
            </div>
            <p className="mt-1 text-sm text-ink-300">
              {strong.length
                ? `Obvious selections: ${strong.map((r) => `${r.player?.name ?? r.row.name} ${r.verdict.pick} ${r.row.line}`).join(", ")}.`
                : "No standout selections — the prices look about right on these."}
            </p>
            {picks.length >= 2 && (
              <p className="mt-1 text-xs text-ink-400">
                Together ({picks.length} legs): pays about <span className="num text-court">${comboOdds.toFixed(2)}</span>, our estimate of all landing{" "}
                <span className="num">{pct(comboP)}</span> (treats legs as unrelated).
              </p>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[...results]
              .sort((a, b) => rank(b) - rank(a))
              .map((r, i) => (
                <ResultCard key={i} r={r} league={league} />
              ))}
          </div>
          <p className="text-[11px] leading-relaxed text-ink-500">
            Our chance blends a projection (season, last 10, last 5) with how often he actually cleared the line in his last 10 games. The book&apos;s
            chance is the odds with the bookmaker&apos;s margin removed. Strong = our chance beats the book by 8+ points and his history agrees; Lean = 4+
            points. Estimates only — check injuries and minutes before acting on any of them.
          </p>
        </section>
      )}
    </div>
  );
}

const rank = (r: SlipResult) => (r.verdict.strength === "strong" ? 2 : r.verdict.strength === "lean" ? 1 : 0) + (r.verdict.edge ?? 0);

function ResultCard({ r, league }: { r: SlipResult; league: string }) {
  const v = r.verdict;
  const tone = v.strength === "strong" ? "border-win/60 bg-win/5" : v.strength === "lean" ? "border-court/50" : "border-ink-800";
  const badge =
    v.strength === "pass" || !v.pick
      ? { text: "Pass", cls: "bg-ink-800 text-ink-300" }
      : { text: `${v.strength === "strong" ? "Strong" : "Lean"} ${v.pick.toUpperCase()} ${r.row.line}`, cls: v.strength === "strong" ? "bg-win text-ink-950" : "bg-court text-ink-950" };
  const odds = v.pick === "over" ? r.row.over : v.pick === "under" ? r.row.under : null;
  const maxV = Math.max(r.row.line * 1.4, ...r.history.map((h) => h.value), 1);
  return (
    <div className={`card p-3 ${tone}`}>
      <div className="flex items-center gap-3">
        {r.player ? <Headshot src={r.player.headshot} name={r.player.name} size={42} /> : <Headshot src="" name={r.row.name} size={42} />}
        <div className="min-w-0 flex-1">
          {r.player ? (
            <a href={`/${league}/players/${r.player.id}`} className="block truncate font-semibold hover:text-court">
              {r.player.name}
            </a>
          ) : (
            <span className="block truncate font-semibold">{r.row.name}</span>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
            {r.player && <TeamLogo src={r.player.teamLogo} alt={r.player.team} size={14} />}
            {r.player?.team ?? "Not matched — using screenshot numbers"} · {MARKET_LABEL[r.market]} {r.row.line}
          </div>
        </div>
        <span className={`display rounded-md px-2 py-1 text-xs font-bold ${badge.cls}`}>{badge.text}</span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Box label="Our over" value={pct(v.pOver)} />
        <Box label="Book over" value={pct(v.bookOver)} />
        <Box label="Edge" value={v.edge != null ? `${v.edge >= 0 ? "+" : ""}${Math.round(v.edge * 100)}` : "–"} tone={v.edge != null && v.edge >= 0.04 ? "text-win" : undefined} />
        <Box label="Return / $1" value={v.ev != null && odds ? `${v.ev >= 0 ? "+" : ""}${v.ev.toFixed(2)}` : "–"} tone={v.ev != null && v.ev > 0 ? "text-win" : v.ev != null ? "text-loss" : undefined} />
      </div>

      {r.history.length > 0 && (
        <div className="mt-3">
          <div className="relative flex h-16 items-end gap-1">
            <div className="absolute inset-x-0 border-t border-dashed border-court/70" style={{ bottom: `${(r.row.line / maxV) * 100}%` }} />
            {[...r.history].reverse().map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end" title={`${h.opp} ${h.value}`}>
                <span className="num text-[9px] text-ink-400">{h.value}</span>
                <span className={`w-full rounded-sm ${h.value > r.row.line ? "bg-win/70" : "bg-loss/50"}`} style={{ height: `${Math.max(3, (h.value / maxV) * 52)}px` }} />
              </div>
            ))}
          </div>
          <div className="mt-0.5 text-[10px] text-ink-500">Last {r.history.length} games, oldest → newest · dashed line = {r.row.line}</div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {v.reasons.map((x) => (
          <span key={x} className="rounded border border-ink-700 px-1.5 py-0.5 text-[11px] text-ink-300">
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}

function Box({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md bg-ink-950/60 py-1.5">
      <div className="display text-[10px] text-ink-500">{label}</div>
      <div className={`num text-base font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
