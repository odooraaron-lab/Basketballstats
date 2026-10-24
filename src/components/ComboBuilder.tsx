"use client";

import { useEffect, useMemo, useState } from "react";
import { hex } from "@/lib/format";
import type { GameModel, ScanPlayer, ScanReport } from "@/lib/scan";
import { SCAN_CATS } from "@/lib/scanCore";
import { AddToSlip, type NewLeg } from "./BetSlip";
import { bestCombos, bitsWhere, popcount, quantile, share, simulate, type Bits, type Combo, type Leg, type SimResult } from "@/lib/sim";
import { Headshot, TeamLogo } from "./Img";
import { MassiveMulti } from "./MassiveMulti";

type StatKey = "pts" | "reb" | "ast" | "tpm" | "stl" | "blk" | "pra";
const STAT_LABEL: Record<StatKey, string> = { pts: "PTS", reb: "REB", ast: "AST", tpm: "3PM", stl: "STL", blk: "BLK", pra: "PRA" };
const LADDER = Object.fromEntries(SCAN_CATS.map((c) => [c.key, c.ladder])) as Record<StatKey, number[]>;
const N = 10000;
/** Legs above this are near-certain and only pad a combination. */
const MAX_LEG = 0.92;

const pct = (p: number) => `${(p * 100).toFixed(p >= 0.995 ? 1 : 0)}%`;
const odds = (p: number) => (p > 0 ? `$${(1 / p).toFixed(2)}` : "–");

type UICombo = Omit<Combo, "legs"> & { legs: UILeg[] };

interface UILeg extends Leg {
  label: string;
  playerId?: string;
  stat?: StatKey;
  line?: number;
  proj?: number; // player's simulated median for this stat
  kind: "player" | "game";
}

export function ComboBuilder({ report, autoMulti = false }: { report: ScanReport; autoMulti?: boolean }) {
  const games = report.gameModels;
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [stats, setStats] = useState<Set<StatKey>>(new Set(["pts", "ast", "blk"]));
  const [size, setSize] = useState(3);
  const [minLeg, setMinLeg] = useState(0.65);
  const [gameLegs, setGameLegs] = useState(true);
  const [standoutOnly, setStandoutOnly] = useState(true);
  const [mine, setMine] = useState<string[]>([]);
  const [showMulti, setShowMulti] = useState(autoMulti);
  const [simState, setSimState] = useState<{ gameId: string; result: SimResult } | null>(null);

  const game = games.find((g) => g.id === gameId) ?? games[0];
  // Only use a simulation that belongs to the game being shown (avoids a stale render after switching games).
  const sim = simState && simState.gameId === game?.id ? simState.result : null;

  // "The listed players": everyone the scan surfaced (top signals + category leaders) in this game
  const listed = useMemo(() => {
    const m = new Map<string, ScanPlayer>();
    for (const t of report.top) m.set(t.player.id, t.player);
    for (const c of report.byCat) for (const r of c.rows) m.set(r.player.id, r.player);
    return [...m.values()].filter((p) => p.gameId === game?.id && p.model).sort((a, b) => b.model.pts.mean - a.model.pts.mean);
  }, [report, game?.id]);

  // The stats each player was listed for in the scan (points leaders → PTS, blocks leaders → BLK…)
  const standout = useMemo(() => {
    const set = new Set<string>();
    for (const t of report.top) set.add(`${t.player.id}:${t.signal.cat}`);
    for (const c of report.byCat) for (const r of c.rows) set.add(`${r.player.id}:${c.cat}`);
    return set;
  }, [report]);

  // Run the simulation off the main paint so the button feels instant
  useEffect(() => {
    if (!game) return;
    setMine([]);
    const t = setTimeout(() => {
      setSimState({
        gameId: game.id,
        result: simulate(
          {
            teams: [
              { id: game.teams[0].id, abbr: game.teams[0].abbr, mean: game.teams[0].mean },
              { id: game.teams[1].id, abbr: game.teams[1].abbr, mean: game.teams[1].mean },
            ],
            players: listed.map((p) => ({ id: p.id, teamId: p.teamId, stats: p.model })),
          },
          N,
          Number(game.id.slice(-6)) || 7,
        ),
      });
    }, 30);
    return () => clearTimeout(t);
  }, [game, listed]);

  const outcome = useMemo(() => (sim && game ? gameOutcome(sim, game) : null), [sim, game]);

  // Every candidate line for every listed player (used for the projected lines table + custom builder)
  const allLegs = useMemo(() => {
    if (!sim) return [] as UILeg[];
    const out: UILeg[] = [];
    for (const p of listed) {
      for (const s of Object.keys(STAT_LABEL) as StatKey[]) {
        const vals = sim.stats.get(`${p.id}:${s}`);
        if (!vals) continue;
        const proj = quantile(vals, 0.5);
        for (const line of LADDER[s]) {
          const bits = bitsWhere(sim.n, (i) => vals[i] >= line);
          const pr = popcount(bits) / sim.n;
          if (pr < 0.2 || pr > 0.985) continue;
          out.push({ id: `${p.id}:${s}:${line}`, group: `${p.id}:${s}`, bits, p: pr, label: `${p.name} ${line}+ ${STAT_LABEL[s]}`, playerId: p.id, stat: s, line, proj, kind: "player" });
        }
      }
    }
    if (game) out.push(...gameLegList(sim, game));
    return out;
  }, [sim, listed, game]);

  // Combo search uses one "target" line per player+stat: the highest line that clears the minimum chance.
  const comboLegs = useMemo(() => {
    const byGroup = new Map<string, UILeg>();
    for (const l of allLegs) {
      if (l.p < minLeg || l.p > MAX_LEG) continue;
      if (l.kind === "player" && !stats.has(l.stat!)) continue;
      if (l.kind === "player" && standoutOnly && !standout.has(l.group)) continue;
      // A leg has to say something: no "2+ assists" for a player projected for 6.
      if (l.kind === "player" && (l.line ?? 0) < 0.6 * (l.proj ?? 0)) continue;
      if (l.kind === "game" && !gameLegs) continue;
      const cur = byGroup.get(l.group);
      // Player: the highest line he clears. Game: the most demanding result/total that still clears the minimum.
      if (!cur || (l.kind === "player" ? (l.line ?? 0) > (cur.line ?? 0) : l.p < cur.p)) byGroup.set(l.group, l);
    }
    return [...byGroup.values()];
  }, [allLegs, minLeg, stats, gameLegs, standoutOnly, standout]);

  const combos = useMemo(() => (sim && comboLegs.length >= size ? bestCombos(comboLegs, sim.n, size, 10) : []), [sim, comboLegs, size]);

  const legById = useMemo(() => new Map(allLegs.map((l) => [l.id, l])), [allLegs]);
  const mineLegs = mine.map((id) => legById.get(id)).filter((l): l is UILeg => Boolean(l));
  const mineP = useMemo(() => {
    if (!sim || !mineLegs.length) return null;
    let bits: Bits = mineLegs[0].bits;
    for (const l of mineLegs.slice(1)) bits = bits.map((v, i) => v & l.bits[i]) as Bits;
    return { p: popcount(bits) / sim.n, ind: mineLegs.reduce((a, l) => a * l.p, 1) };
  }, [sim, mineLegs]);
  const toggleMine = (leg: UILeg) =>
    setMine((m) => (m.includes(leg.id) ? m.filter((x) => x !== leg.id) : [...m.filter((x) => legById.get(x)?.group !== leg.group), leg.id]));

  const chip = (on: boolean) => `chip cursor-pointer select-none ${on ? "!border-court !text-court" : "hover:text-ink-100"}`;
  const playerById = new Map(listed.map((p) => [p.id, p]));

  if (!game) return null;
  return (
    <section id="combo-builder" className="card scroll-mt-20 overflow-hidden border-court/40">
      <div className="flex flex-col gap-3 border-b border-ink-800 bg-court/10 px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0 sm:flex-1">
          <div className="display text-xl font-extrabold">
            Combinations <span className="text-court">· most likely outcomes</span>
          </div>
          <div className="text-xs text-ink-400">
            {listed.length} listed players · {N.toLocaleString()} simulated games · {game.label}
          </div>
        </div>
        {games.length > 1 && (
          <select value={gameId} onChange={(e) => setGameId(e.target.value)} className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-sm">
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {!sim ? (
        <div className="flex items-center gap-3 px-4 py-8 text-sm text-ink-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-court border-t-transparent" />
          Simulating {N.toLocaleString()} games…
        </div>
      ) : (
        <div className="space-y-6 p-3 sm:p-4">
          {outcome && <Outcome o={outcome} g={game} />}

          {showMulti ? (
            <MassiveMulti report={report} gameId={game.id} currentSim={sim} initialScope={autoMulti ? "slate" : "game"} />
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border border-court/30 bg-court/5 px-3 py-2.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 text-sm">
                <span className="display font-bold">Massive multi</span>
                <span className="text-ink-400"> — the other end: hunts unlikely-but-realistic spikes (a 4 ppg player scoring 8, a guard grabbing extra boards) and stacks them for big odds.</span>
              </div>
              <button onClick={() => setShowMulti(true)} className="display rounded-lg bg-court px-4 py-2 text-sm font-bold text-ink-950 hover:bg-court-soft">
                Find massive multi
              </button>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="display mr-1 text-ink-500">Stats</span>
              {(Object.keys(STAT_LABEL) as StatKey[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStats((cur) => (cur.has(s) ? new Set([...cur].filter((x) => x !== s)) : new Set([...cur, s])))}
                  className={chip(stats.has(s))}
                >
                  {STAT_LABEL[s]}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-ink-700" />
              <button onClick={() => setGameLegs((v) => !v)} className={chip(gameLegs)}>
                Include result & total
              </button>
              <button onClick={() => setStandoutOnly((v) => !v)} className={chip(standoutOnly)} title="Only use the stat each player was listed for in the scan">
                {standoutOnly ? "Standout stats only" : "Any stat"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="display mr-1 text-ink-500">Legs</span>
              {[2, 3, 4, 5].map((k) => (
                <button key={k} onClick={() => setSize(k)} className={chip(size === k)}>
                  {k}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-ink-700" />
              <span className="display text-ink-500">Each leg at least</span>
              <input type="range" min={0.5} max={0.9} step={0.05} value={minLeg} onChange={(e) => setMinLeg(Number(e.target.value))} className="w-32 accent-[#f26b1d]" />
              <span className="num text-court">{pct(minLeg)}</span>
              <span className="text-ink-500">· uses the highest line each player clears that often · skips near-certain legs (over {pct(MAX_LEG)})</span>
            </div>
          </div>

          <div>
            <h3 className="display mb-2 text-base font-bold text-ink-200">Most likely {size}-leg combinations</h3>
            {combos.length ? (
              <div className="overflow-hidden rounded-lg border border-ink-800">
                {combos.map((c, i) => (
                  <ComboRow key={i} c={c as UICombo} rank={i + 1} players={playerById} onAdd={(legs) => setMine(legs.map((l) => l.id))} game={game.label} gameId={game.id} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-ink-700 px-4 py-6 text-center text-sm text-ink-500">
                Not enough legs clear {pct(minLeg)} with these stats. Lower the minimum, add stats, or include result & total.
              </p>
            )}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <div>
              <h3 className="display mb-2 text-base font-bold text-ink-200">Projected lines · click to build your own</h3>
              <div className="overflow-x-auto rounded-lg border border-ink-800">
                <table className="stat-table compact">
                  <thead>
                    <tr>
                      <th className="!text-left">Player</th>
                      {(Object.keys(STAT_LABEL) as StatKey[])
                        .filter((s) => stats.has(s))
                        .map((s) => (
                          <th key={s} className="!text-left">
                            {STAT_LABEL[s]} <span className="font-normal normal-case text-ink-600">proj · lines</span>
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listed.map((p) => (
                      <tr key={p.id}>
                        <td className="!py-1.5">
                          <span className="flex items-center gap-2 font-sans">
                            <span className="h-5 w-1 rounded" style={{ background: hex(game.teams.find((t) => t.id === p.teamId)?.color) }} />
                            <Headshot src={p.headshot} name={p.name} size={24} />
                            <span className="truncate text-[12px]">{p.name}</span>
                          </span>
                        </td>
                        {(Object.keys(STAT_LABEL) as StatKey[])
                          .filter((s) => stats.has(s))
                          .map((s) => {
                            const vals = sim.stats.get(`${p.id}:${s}`);
                            if (!vals) return <td key={s} className="!py-1.5 !text-left text-ink-600">–</td>;
                            const legs = allLegs.filter((l) => l.playerId === p.id && l.stat === s && l.p >= 0.3 && l.p <= 0.95);
                            return (
                              <td key={s} className="!py-1.5 !text-left">
                                <span className="num mr-1.5 text-ink-100">{quantile(vals, 0.5)}</span>
                                {legs.map((l) => (
                                  <button
                                    key={l.id}
                                    onClick={() => toggleMine(l)}
                                    title={`${l.label}: ${pct(l.p)} (fair ${odds(l.p)})`}
                                    className={`mr-1 rounded px-1 py-0.5 text-[10.5px] ${
                                      mine.includes(l.id) ? "bg-court text-ink-950" : l.p >= minLeg ? "bg-win/15 text-win hover:bg-win/25" : "bg-ink-800 text-ink-400 hover:bg-ink-700"
                                    }`}
                                  >
                                    {l.line}+ {pct(l.p)}
                                  </button>
                                ))}
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 text-[11px] text-ink-500">Projection = median of the simulations. Green lines clear your minimum chance.</p>
            </div>

            <div>
              <h3 className="display mb-2 text-base font-bold text-ink-200">Your combination</h3>
              <div className="rounded-lg border border-ink-800 p-3">
                <div className="mb-2 flex flex-wrap gap-1">
                  {allLegs
                    .filter((l) => l.kind === "game")
                    .map((l) => (
                      <button key={l.id} onClick={() => toggleMine(l)} className={`rounded px-1.5 py-0.5 text-[11px] ${mine.includes(l.id) ? "bg-court text-ink-950" : "bg-ink-800 text-ink-300 hover:bg-ink-700"}`}>
                        {l.label} {pct(l.p)}
                      </button>
                    ))}
                </div>
                {mineLegs.length ? (
                  <>
                    <ul className="space-y-1 text-sm">
                      {mineLegs.map((l) => (
                        <li key={l.id} className="flex items-center justify-between gap-2 rounded-md bg-ink-950/60 px-2 py-1">
                          <span className="truncate">{l.label}</span>
                          <span className="num text-xs text-ink-400">{pct(l.p)}</span>
                          <button onClick={() => toggleMine(l)} className="text-xs text-ink-500 hover:text-loss" aria-label="Remove">
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                    {mineP && (
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-md bg-court/15 py-2">
                          <div className="display text-[10px] text-ink-400">All hit</div>
                          <div className="num text-xl font-bold text-court">{pct(mineP.p)}</div>
                        </div>
                        <div className="rounded-md bg-ink-950/60 py-2">
                          <div className="display text-[10px] text-ink-500">Fair odds</div>
                          <div className="num text-xl font-semibold">{odds(mineP.p)}</div>
                        </div>
                        <div className="rounded-md bg-ink-950/60 py-2" title="If every leg were unrelated">
                          <div className="display text-[10px] text-ink-500">If unrelated</div>
                          <div className="num text-xl font-semibold text-ink-300">{pct(mineP.ind)}</div>
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <button onClick={() => setMine([])} className="text-xs text-ink-500 hover:text-ink-200">
                        Clear
                      </button>
                      <AddToSlip legs={toSlip(mineLegs, game.label, game.id, playerById)} label="+ Add all to multi" />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-ink-500">Click line chips in the table (or a result/total above) to build a combination and see how often it all comes in.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-ink-950/60 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
            <b className="text-ink-400">How this works.</b> Each player&apos;s projection blends his season average (45%), last 10 (35%) and last 5 (20%), nudged
            for how much the opponent allows. The game is then simulated {N.toLocaleString()} times with shared swings — pace for the whole game, a hot or
            cold night for each team, and minutes/usage for each player — so related outcomes (a player&apos;s points and assists, a big total and big
            scorers) rise and fall together. Combination chances are counted directly from those simulations rather than multiplied. Team scores: {game.basis}.
            These are statistical estimates, not certainties — injuries, rotations and blowouts can move any of them.
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------- game outcome

interface OutcomeData {
  winP: [number, number];
  median: [number, number];
  total: { median: number; lo: number; hi: number; overP: number | null; line: number };
  spread: { abbr: string; value: number; coverP: number } | null;
  margin: { median: number };
}

function gameOutcome(sim: SimResult, g: GameModel): OutcomeData {
  const [a, h] = sim.teamScores;
  let aw = 0;
  let hw = 0;
  const totals = new Int16Array(sim.n);
  const margins = new Int16Array(sim.n);
  for (let i = 0; i < sim.n; i++) {
    totals[i] = a[i] + h[i];
    margins[i] = h[i] - a[i];
    if (h[i] > a[i]) hw++;
    else if (a[i] > h[i]) aw++;
    else {
      hw += 0.5;
      aw += 0.5;
    }
  }
  const line = g.overUnder ?? Math.round(quantile(totals, 0.5)) + 0.5;
  let spread: OutcomeData["spread"] = null;
  if (g.spread) {
    const favHome = g.spread.abbr === g.teams[1].abbr;
    const need = Math.abs(g.spread.value);
    const coverP = share(margins, (m) => (favHome ? m > need : -m > need));
    spread = { abbr: g.spread.abbr, value: g.spread.value, coverP };
  }
  return {
    winP: [aw / sim.n, hw / sim.n],
    median: [quantile(a, 0.5), quantile(h, 0.5)],
    total: { median: quantile(totals, 0.5), lo: quantile(totals, 0.1), hi: quantile(totals, 0.9), overP: share(totals, (t) => t > line), line },
    spread,
    margin: { median: quantile(margins, 0.5) },
  };
}

function gameLegList(sim: SimResult, g: GameModel): UILeg[] {
  const [a, h] = sim.teamScores;
  const out: UILeg[] = [];
  const win = (ti: 0 | 1) => bitsWhere(sim.n, (i) => (ti === 1 ? h[i] > a[i] : a[i] > h[i]));
  for (const ti of [0, 1] as const) {
    const bits = win(ti);
    out.push({ id: `win:${ti}`, group: "result", bits, p: popcount(bits) / sim.n, label: `${g.teams[ti].abbr} win`, kind: "game" });
  }
  const totals = Array.from(a, (v, i) => v + h[i]);
  const med = quantile(totals, 0.5);
  const lines = new Set<number>();
  if (g.overUnder != null) lines.add(g.overUnder);
  for (let d = -15; d <= 15; d += 5) lines.add(Math.round((med + d) / 5) * 5 + 0.5);
  for (const line of [...lines].sort((x, y) => x - y)) {
    const over = bitsWhere(sim.n, (i) => totals[i] > line);
    const under = bitsWhere(sim.n, (i) => totals[i] < line);
    out.push({ id: `over:${line}`, group: "total", bits: over, p: popcount(over) / sim.n, label: `Total over ${line}`, kind: "game" });
    out.push({ id: `under:${line}`, group: "total", bits: under, p: popcount(under) / sim.n, label: `Total under ${line}`, kind: "game" });
  }
  return out;
}

function Outcome({ o, g }: { o: OutcomeData; g: GameModel }) {
  const fav = o.winP[1] >= o.winP[0] ? 1 : 0;
  return (
    <div>
      <h3 className="display mb-2 text-base font-bold text-ink-200">Most likely game outcome</h3>
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div className="rounded-lg border border-ink-800 p-3">
          <div className="flex items-center justify-between gap-2">
            {g.teams.map((t, i) => (
              <div key={t.id} className={`flex items-center gap-2 ${i === 1 ? "flex-row-reverse text-right" : ""}`}>
                <TeamLogo src={t.logo} alt={t.abbr} size={36} />
                <div>
                  <div className="display text-lg font-bold">{t.abbr}</div>
                  <div className={`num text-2xl font-bold ${i === fav ? "text-court" : "text-ink-300"}`}>{o.median[i]}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
            <span style={{ width: `${o.winP[0] * 100}%`, background: hex(g.teams[0].color) }} />
            <span style={{ width: `${o.winP[1] * 100}%`, background: hex(g.teams[1].color === g.teams[0].color ? "888888" : g.teams[1].color) }} />
          </div>
          <div className="num mt-1 flex justify-between text-xs">
            <span>{pct(o.winP[0])} win</span>
            <span className="text-ink-500">projected score (median)</span>
            <span>{pct(o.winP[1])} win</span>
          </div>
        </div>
        <div className="rounded-lg border border-ink-800 p-3">
          <div className="display text-[11px] text-ink-500">Total points</div>
          <div className="num text-2xl font-bold">{o.total.median}</div>
          <div className="text-xs text-ink-400">
            80% of simulations between <span className="num text-ink-200">{o.total.lo}</span> and <span className="num text-ink-200">{o.total.hi}</span>
          </div>
          {o.total.overP != null && (
            <div className="mt-1.5 text-xs">
              Over {o.total.line}: <span className="num font-semibold text-court">{pct(o.total.overP)}</span> · Under:{" "}
              <span className="num font-semibold">{pct(1 - o.total.overP)}</span>
              {g.overUnder == null && <span className="text-ink-500"> (no posted line — using the median)</span>}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-ink-800 p-3">
          <div className="display text-[11px] text-ink-500">Margin</div>
          <div className="num text-2xl font-bold">
            {g.teams[o.margin.median >= 0 ? 1 : 0].abbr} by {Math.abs(o.margin.median)}
          </div>
          {o.spread ? (
            <div className="mt-1.5 text-xs">
              {o.spread.abbr} {o.spread.value > 0 ? `+${o.spread.value}` : o.spread.value} covers: <span className="num font-semibold text-court">{pct(o.spread.coverP)}</span>
            </div>
          ) : (
            <div className="mt-1.5 text-xs text-ink-500">No posted spread for this game.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function toSlip(legs: UILeg[], game: string, gameId: string, players: Map<string, ScanPlayer>): NewLeg[] {
  return legs.map((l) => {
    const p = l.playerId ? players.get(l.playerId) : null;
    return { id: `${gameId}:${l.id}`, gameId, game, label: p ? `${p.name} ${l.line}+ ${STAT_LABEL[l.stat!]}` : l.label, p: l.p, headshot: p?.headshot };
  });
}

function ComboRow({
  c,
  rank,
  players,
  onAdd,
  game,
  gameId,
}: {
  c: UICombo;
  rank: number;
  players: Map<string, ScanPlayer>;
  onAdd: (legs: UILeg[]) => void;
  game: string;
  gameId: string;
}) {
  const lift = c.pIndependent > 0 ? c.p / c.pIndependent : 1;
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-ink-850 px-3 py-2 first:border-t-0">
      <span className="num w-5 text-sm text-ink-500">{rank}</span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {c.legs.map((l) => {
          const p = l.playerId ? players.get(l.playerId) : null;
          return (
            <span key={l.id} className="inline-flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-950/60 py-0.5 pl-0.5 pr-2 text-[12px]">
              {p ? <Headshot src={p.headshot} name={p.name} size={20} /> : <span className="display px-1 text-[10px] text-court">GAME</span>}
              <span>
                {p ? `${p.name.split(" ").slice(-1)[0]} ${l.line}+ ${STAT_LABEL[l.stat!]}` : l.label}
              </span>
              <span className="num text-[10px] text-ink-500">{pct(l.p)}</span>
            </span>
          );
        })}
      </div>
      <div className="flex w-full items-center justify-end gap-4 text-right sm:w-auto">
        <div>
          <div className="num text-lg font-bold text-court">{pct(c.p)}</div>
          <div className="text-[10px] text-ink-500">all hit</div>
        </div>
        <div>
          <div className="num text-sm font-semibold">{odds(c.p)}</div>
          <div className="text-[10px] text-ink-500">fair odds</div>
        </div>
        <div title="Joint chance vs multiplying the legs as if unrelated">
          <div className={`num text-sm ${lift >= 1.03 ? "text-win" : lift <= 0.97 ? "text-loss" : "text-ink-300"}`}>×{lift.toFixed(2)}</div>
          <div className="text-[10px] text-ink-500">vs unrelated</div>
        </div>
        <button onClick={() => onAdd(c.legs)} className="chip text-[11px] hover:text-ink-100" title="Load into 'Your combination' to tweak">
          Edit
        </button>
        <AddToSlip legs={toSlip(c.legs, game, gameId, players)} />
      </div>
    </div>
  );
}
