"use client";

import Link from "next/link";
import { useState } from "react";
import { ComboBuilder } from "./ComboBuilder";
import { fmt, fmtDayTime } from "@/lib/format";
import type { ScanPlayer, ScanReport as Report, ScanSignal } from "@/lib/scan";
import { SCAN_CATS, type ScanCatKey } from "@/lib/scanCore";
import { Headshot } from "./Img";

const CAT = Object.fromEntries(SCAN_CATS.map((c) => [c.key, c])) as Record<ScanCatKey, (typeof SCAN_CATS)[number]>;
const one = (x: number | null | undefined) => (x == null ? "–" : x.toFixed(1));

function scoreTone(s: number) {
  if (s >= 75) return "bg-court text-ink-950";
  if (s >= 62) return "bg-court/25 text-court-soft";
  return "bg-ink-800 text-ink-300";
}

function toText(r: Report): string {
  const lines: string[] = [];
  lines.push(`STAT SCAN — ${r.title}`);
  lines.push(`Generated ${fmtDayTime(r.generatedAt)} · ${r.rotation} rotation players scanned (${r.scanned} on rosters)`);
  lines.push("");
  lines.push("TOP SIGNALS");
  r.top.forEach((t, i) => {
    const c = CAT[t.signal.cat];
    lines.push(`${i + 1}. ${t.player.name} (${t.player.teamAbbr} vs ${t.player.oppAbbr}) — ${c.short} ${one(t.signal.base)} avg, ${one(t.signal.l5)} last 5 · score ${t.signal.score}`);
    for (const reason of t.signal.reasons) lines.push(`   - ${reason}`);
    for (const note of t.player.notes) lines.push(`   - ${note}`);
  });
  lines.push("");
  for (const b of r.byCat) {
    if (!b.rows.length) continue;
    lines.push(`${CAT[b.cat].label.toUpperCase()}`);
    b.rows.forEach((x) =>
      lines.push(
        `  ${x.player.name} (${x.player.teamAbbr}) ${one(x.signal.base)} avg · L5 ${one(x.signal.l5)}${x.signal.hit ? ` · ${x.signal.hit.line}+ in ${x.signal.hit.hits}/${x.signal.hit.n}` : ""}${x.signal.oppRank ? ` · opp rank ${x.signal.oppRank}` : ""}`,
      ),
    );
  }
  if (r.hot.length) {
    lines.push("", "HEATING UP");
    r.hot.forEach((x) => lines.push(`  ${x.player.name} (${x.player.teamAbbr}) ${CAT[x.signal.cat].short} ${one(x.signal.l5)} last 5 vs ${one(x.signal.base)} (+${Math.round((x.signal.form ?? 0) * 100)}%)`));
  }
  if (r.cold.length) {
    lines.push("", "COOLING OFF");
    r.cold.forEach((x) => lines.push(`  ${x.player.name} (${x.player.teamAbbr}) ${CAT[x.signal.cat].short} ${one(x.signal.l5)} last 5 vs ${one(x.signal.base)} (${Math.round((x.signal.form ?? 0) * 100)}%)`));
  }
  const soft = r.matchups.filter((m) => m.soft.length);
  if (soft.length) {
    lines.push("", "MATCHUP EDGES");
    soft.forEach((m) => lines.push(`  ${m.teamAbbr} vs ${m.oppAbbr}: opponent allows ${m.soft.map((s) => `${CAT[s.cat].short} (#${s.rank})`).join(", ")}`));
  }
  if (r.out.length) {
    lines.push("", "OUT / DOUBTFUL");
    r.out.forEach((o) => lines.push(`  ${o.name} (${o.teamAbbr}) — ${o.status}${o.pts != null ? ` · ${one(o.pts)} ppg, ${one(o.min)} min` : ""}`));
  }
  lines.push("", `Basis: ${r.basis.players}. ${r.basis.league}. Opponent data: ${r.basis.opponent}.`);
  return lines.join("\n");
}

function Reason({ text }: { text: string }) {
  const tone = /^Hot|allow the|Minutes up|Teammate/.test(text)
    ? "border-win/40 text-win"
    : /^Cold|Tough|Minutes down|Status/.test(text)
      ? "border-loss/40 text-loss"
      : /League top|Top quarter/.test(text)
        ? "border-court/40 text-court-soft"
        : "border-ink-700 text-ink-300";
  return <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[11px] leading-tight ${tone}`}>{text}</span>;
}

function TopCard({ p, s, rank, league }: { p: ScanPlayer; s: ScanSignal; rank: number; league: string }) {
  const c = CAT[s.cat];
  return (
    <div className="card flex flex-col gap-3 p-3">
      <div className="flex items-center gap-3">
        <span className="num w-5 text-sm text-ink-500">{rank}</span>
        <Headshot src={p.headshot} name={p.name} size={46} />
        <div className="min-w-0 flex-1">
          <Link href={`/${league}/players/${p.id}`} className="block truncate font-semibold hover:text-court">
            {p.name}
          </Link>
          <div className="text-[11px] text-ink-500">
            {p.teamAbbr} vs {p.oppAbbr} · {p.pos} · {one(p.min)} min
          </div>
        </div>
        <span className={`num rounded-md px-2 py-1 text-sm font-bold ${scoreTone(s.score)}`} title="Signal score (0–100)">
          {s.score}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-ink-950/60 py-1.5">
          <div className="display text-[10px] text-ink-500">{c.short} avg</div>
          <div className="num text-lg font-semibold">{one(s.base)}</div>
        </div>
        <div className="rounded-md bg-ink-950/60 py-1.5">
          <div className="display text-[10px] text-ink-500">Last 5</div>
          <div className={`num text-lg font-semibold ${s.form != null && s.form >= 0.1 ? "text-win" : s.form != null && s.form <= -0.1 ? "text-loss" : ""}`}>{one(s.l5)}</div>
        </div>
        <div className="rounded-md bg-ink-950/60 py-1.5">
          <div className="display text-[10px] text-ink-500">Line hit</div>
          <div className="num text-lg font-semibold">{s.hit ? `${s.hit.line}+` : "–"}</div>
          {s.hit && <div className="num text-[10px] text-ink-500">{s.hit.hits}/{s.hit.n} games</div>}
        </div>
      </div>
      {p.recent.length > 0 && (
        <div className="flex items-end gap-1" title={`${c.short} in recent games, newest on the right`}>
          {[...p.recent].reverse().map((g, i) => {
            const v = c.key === "pra" ? g.pts + g.reb + g.ast : g[c.key];
            const max = Math.max(1, ...p.recent.map((x) => (c.key === "pra" ? x.pts + x.reb + x.ast : x[c.key])));
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                <span className="num text-[10px] text-ink-400">{v}</span>
                <span className={`w-full rounded-sm ${s.hit && v >= s.hit.line ? "bar-hit bg-win/70" : "bar bg-ink-600"}`} style={{ height: `${6 + (v / max) * 28}px` }} />
                <span className="text-[9px] text-ink-600">{g.opp.replace(/^(vs|@)\s*/, "")}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {s.reasons.map((r) => (
          <Reason key={r} text={r} />
        ))}
        {p.notes.map((r) => (
          <Reason key={r} text={r} />
        ))}
      </div>
    </div>
  );
}

export function ScanReportView({ report: r, league, closeHref, scopeLinks }: { report: Report; league: string; closeHref?: string; scopeLinks?: { label: string; href: string; active: boolean }[] }) {
  const [copied, setCopied] = useState(false);
  const [combos, setCombos] = useState(false);
  const openCombos = () => {
    setCombos(true);
    setTimeout(() => document.getElementById("combo-builder")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toText(r));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <section id="scan-report" className="card scroll-mt-20 overflow-hidden border-court/40">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-800 bg-court/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="display text-xl font-extrabold">
            Stat scan <span className="text-court">· {r.title}</span>
          </div>
          <div className="text-xs text-ink-400">
            {r.rotation} rotation players scanned across {r.games.length} game{r.games.length === 1 ? "" : "s"} · generated {fmtDayTime(r.generatedAt)}
          </div>
        </div>
        <div className="no-print flex flex-wrap items-center gap-1.5">
          {scopeLinks?.map((s) => (
            <Link key={s.label} href={s.href} scroll={false} className={`chip ${s.active ? "!border-court !text-court" : "hover:text-ink-100"}`}>
              {s.label}
            </Link>
          ))}
          <button onClick={openCombos} className="display rounded-md bg-court px-3 py-1 text-xs font-bold text-ink-950 hover:bg-court-soft">
            Build combinations
          </button>
          <button onClick={copy} className="chip hover:text-ink-100">
            {copied ? "Copied ✓" : "Copy as text"}
          </button>
          <button onClick={() => window.print()} className="chip hover:text-ink-100">
            Print / PDF
          </button>
          {closeHref && (
            <Link href={closeHref} scroll={false} className="chip hover:text-ink-100">
              Close
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-6 p-4">
        <div>
          <h3 className="display mb-2 text-base font-bold text-ink-200">Top signals</h3>
          {r.top.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {r.top.map((t, i) => (
                <TopCard key={t.player.id} p={t.player} s={t.signal} rank={i + 1} league={league} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-500">No rotation players with enough data yet.</p>
          )}
          {!combos && r.top.length > 0 && (
            <div className="no-print mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-court/30 bg-court/5 px-3 py-2.5">
              <div className="min-w-0 flex-1 text-sm">
                <span className="display font-bold">Build combinations</span>
                <span className="text-ink-400"> — simulates the game 10,000 times with these players to find the most likely points + assists + blocks combinations and game outcome.</span>
              </div>
              <button onClick={openCombos} className="display rounded-lg bg-court px-4 py-2 text-sm font-bold text-ink-950 hover:bg-court-soft">
                Build combinations
              </button>
            </div>
          )}
        </div>

        {combos && (
          <div className="no-print">
            <ComboBuilder report={r} />
          </div>
        )}

        <div>
          <h3 className="display mb-2 text-base font-bold text-ink-200">Category leaders</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {r.byCat
              .filter((b) => b.rows.length)
              .map((b) => (
                <div key={b.cat} className="overflow-hidden rounded-lg border border-ink-800">
                  <div className="display border-b border-ink-800 bg-ink-850 px-3 py-1.5 text-sm font-semibold">{CAT[b.cat].label}</div>
                  <table className="stat-table compact">
                    <thead>
                      <tr>
                        <th className="!text-left">Player</th>
                        <th>AVG</th>
                        <th>L5</th>
                        <th>LINE</th>
                        <th title="League rank among rotation players">LG</th>
                        <th title="Opponent rank in allowing this stat (1 = allows most)">OPP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((x) => (
                        <tr key={x.player.id}>
                          <td className="!py-1">
                            <Link href={`/${league}/players/${x.player.id}`} className="flex items-center gap-2 font-sans hover:text-court">
                              <Headshot src={x.player.headshot} name={x.player.name} size={22} />
                              <span className="truncate text-[12px]">{x.player.name}</span>
                              <span className="text-[10px] text-ink-500">{x.player.teamAbbr}</span>
                            </Link>
                          </td>
                          <td className="font-semibold !text-ink-100">{one(x.signal.base)}</td>
                          <td className={x.signal.form != null && x.signal.form >= 0.15 ? "!text-win" : x.signal.form != null && x.signal.form <= -0.15 ? "!text-loss" : ""}>{one(x.signal.l5)}</td>
                          <td>{x.signal.hit ? `${x.signal.hit.line}+ ${x.signal.hit.hits}/${x.signal.hit.n}` : "–"}</td>
                          <td>{x.signal.leagueRank ? `#${x.signal.leagueRank}` : "–"}</td>
                          <td className={x.signal.oppRank && x.signal.oppRank <= 5 ? "!text-win" : x.signal.oppRank && x.signal.oppRank >= 26 ? "!text-loss" : ""}>
                            {x.signal.oppRank ?? "–"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <h3 className="display mb-2 text-base font-bold text-win">Heating up</h3>
            <FormList items={r.hot} league={league} />
          </div>
          <div>
            <h3 className="display mb-2 text-base font-bold text-loss">Cooling off</h3>
            <FormList items={r.cold} league={league} />
          </div>
          <div>
            <h3 className="display mb-2 text-base font-bold text-ink-200">Out / doubtful</h3>
            {r.out.length ? (
              <ul className="space-y-1 text-sm">
                {r.out.map((o) => (
                  <li key={o.name + o.teamAbbr} className="flex justify-between gap-2 rounded-md bg-ink-950/50 px-2 py-1.5">
                    <span>
                      {o.name} <span className="text-[11px] text-ink-500">{o.teamAbbr}</span>
                      <span className="block text-[11px] text-loss">{o.status}</span>
                    </span>
                    {o.pts != null && <span className="num text-xs text-ink-400">{one(o.pts)} ppg · {one(o.min)} min</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">No rotation players listed out.</p>
            )}
          </div>
        </div>

        {r.matchups.some((m) => m.soft.length || m.tough.length) && (
          <div>
            <h3 className="display mb-2 text-base font-bold text-ink-200">Matchup edges</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {r.matchups
                .filter((m) => m.soft.length || m.tough.length)
                .map((m) => (
                  <div key={m.teamAbbr + m.oppAbbr} className="rounded-lg border border-ink-800 px-3 py-2 text-sm">
                    <span className="display font-bold">{m.teamAbbr}</span> <span className="text-ink-500">vs</span> <span className="display font-bold">{m.oppAbbr}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.soft.map((s) => (
                        <Reason key={s.cat} text={`${m.oppAbbr} allow the ${s.rank === 1 ? "most" : `#${s.rank} most`} ${CAT[s.cat].short} (${one(s.allowed)})`} />
                      ))}
                      {m.tough.map((s) => (
                        <Reason key={s.cat} text={`Tough: ${m.oppAbbr} #${31 - s.rank} stingiest on ${CAT[s.cat].short}`} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="rounded-lg bg-ink-950/60 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
          <b className="text-ink-400">How the scan works.</b> Rotation players (15+ min) are scored 0–100 per stat: 45% how they rank league-wide, 25% last-5
          form vs their average, 15% how consistently they reach a round-number line in their last 10, 15% how much the opponent allows. Line hit = the
          highest line reached in at least 6 of the last 10 games. {r.basis.players}. {r.basis.league}. Opponent data: {r.basis.opponent}.
          {r.games.length > 1 && ` Games: ${r.games.map((g) => g.label).join(", ")}.`}
        </div>
      </div>
    </section>
  );
}

function FormList({ items, league }: { items: { player: ScanPlayer; signal: ScanSignal }[]; league: string }) {
  if (!items.length) return <p className="text-sm text-ink-500">Nobody more than 15% off their average.</p>;
  return (
    <ul className="space-y-1">
      {items.map((x) => (
        <li key={x.player.id} className="flex items-center gap-2 rounded-md bg-ink-950/50 px-2 py-1.5 text-sm">
          <Headshot src={x.player.headshot} name={x.player.name} size={26} />
          <Link href={`/${league}/players/${x.player.id}`} className="min-w-0 flex-1 truncate hover:text-court">
            {x.player.name} <span className="text-[11px] text-ink-500">{x.player.teamAbbr}</span>
          </Link>
          <span className="num text-xs text-ink-400">
            {CAT[x.signal.cat].short} {one(x.signal.l5)} <span className="text-ink-600">vs</span> {one(x.signal.base)}
          </span>
          <span className={`num w-12 text-right text-xs font-semibold ${(x.signal.form ?? 0) >= 0 ? "text-win" : "text-loss"}`}>{fmt((x.signal.form ?? 0) * 100, "signed")}%</span>
        </li>
      ))}
    </ul>
  );
}
