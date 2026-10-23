"use client";

import { useEffect, useMemo, useState } from "react";
import { hex } from "@/lib/format";
import type { GameModel, ScanPlayer, ScanReport } from "@/lib/scan";
import { bitsWhere, popcount, quantile, simulate, type Bits, type SimResult } from "@/lib/sim";
import { Headshot } from "./Img";

// Longshot hunting: lines ABOVE what a player usually does, that are unlikely but realistic
// (10–45% in the simulation) and have actually happened recently (at least once in his last 10).
// Stacking a handful of those is how a big multi pays.

type Stat = "pts" | "reb" | "ast" | "tpm";
const LABEL: Record<Stat, string> = { pts: "PTS", reb: "REB", ast: "AST", tpm: "3PM" };
const STATS: Stat[] = ["pts", "reb", "ast", "tpm"];
const N = 6000;
const P_MIN = 0.1;
const P_MAX = 0.45;
const TARGETS = [50, 100, 250, 500, 1000];

const pct = (p: number) => `${(p * 100).toFixed(p < 0.01 ? 2 : p < 0.1 ? 1 : 0)}%`;
const odds = (p: number) => (p > 0 ? `$${(1 / p >= 100 ? Math.round(1 / p) : (1 / p).toFixed(2)).toLocaleString()}` : "–");

interface LongLeg {
  id: string;
  gameId: string;
  player: ScanPlayer;
  stat: Stat;
  line: number;
  avg: number; // what he normally does (season/blended projection)
  p: number; // simulation chance
  hits: number; // times he reached it in the last n games
  n: number;
  bits: Bits;
  kind: "spike" | "bench";
}

/** Lines above a player's normal output for one stat. */
function spikeLines(stat: Stat, proj: number): number[] {
  if (stat === "pts") {
    const set = new Set<number>();
    for (const f of [1.35, 1.6, 1.9, 2.3]) set.add(Math.max(Math.ceil(proj * f), Math.ceil(proj) + 3));
    return [...set].sort((a, b) => a - b);
  }
  const base = Math.max(1, Math.ceil(proj));
  return [base + 1, base + 2, base + 3].filter((x, i, a) => a.indexOf(x) === i);
}

function buildSimFor(game: GameModel, players: ScanPlayer[]): SimResult {
  return simulate(
    {
      teams: [
        { id: game.teams[0].id, abbr: game.teams[0].abbr, mean: game.teams[0].mean },
        { id: game.teams[1].id, abbr: game.teams[1].abbr, mean: game.teams[1].mean },
      ],
      players: players.map((p) => ({ id: p.id, teamId: p.teamId, stats: p.model })),
    },
    N,
    (Number(game.id.slice(-6)) || 7) + 101,
  );
}

function legsFor(game: GameModel, players: ScanPlayer[], sim: SimResult): LongLeg[] {
  const out: LongLeg[] = [];
  for (const p of players) {
    for (const s of STATS) {
      const vals = sim.stats.get(`${p.id}:${s}`);
      const hist = p.history?.[s] ?? [];
      if (!vals) continue;
      const proj = quantile(vals, 0.5);
      const avg = p.model[s].mean;
      if (s === "tpm" && avg < 0.6) continue; // non-shooters
      for (const line of spikeLines(s, avg)) {
        if (line <= proj) continue;
        const bits = bitsWhere(sim.n, (i) => vals[i] >= line);
        const pr = popcount(bits) / sim.n;
        if (pr < P_MIN || pr > P_MAX) continue;
        const hits = hist.filter((v) => v >= line).length;
        // Must have actually happened recently — that's the "realistic" part.
        if (hist.length >= 5 ? hits < 1 : pr < 0.2) continue;
        out.push({
          id: `${game.id}:${p.id}:${s}:${line}`,
          gameId: game.id,
          player: p,
          stat: s,
          line,
          avg,
          p: pr,
          hits,
          n: hist.length,
          bits,
          kind: s === "pts" && avg < 10 ? "bench" : "spike",
        });
      }
    }
  }
  return out;
}

/** Joint chance: legs in the same game are counted together in that game's simulation; games multiply. */
function jointP(legs: LongLeg[]): number {
  const byGame = new Map<string, Bits>();
  for (const l of legs) {
    const cur = byGame.get(l.gameId);
    byGame.set(l.gameId, cur ? (cur.map((v, i) => v & l.bits[i]) as Bits) : l.bits);
  }
  let p = 1;
  for (const b of byGame.values()) p *= popcount(b) / N;
  return p;
}

/** Quality of a longshot: decent chance, and it has a track record (history shrunk toward the sim). */
const legScore = (l: LongLeg) => {
  const histRate = l.n ? (l.hits + 2 * l.p) / (l.n + 2) : l.p;
  return 0.6 * l.p + 0.4 * histRate;
};

function greedyMulti(legs: LongLeg[], target: number, maxLegs = 10, maxPerGame = Infinity): LongLeg[] {
  const sorted = [...legs].sort((a, b) => legScore(b) - legScore(a));
  const chosen: LongLeg[] = [];
  const usedPlayers = new Set<string>();
  const perGame = new Map<string, number>();
  for (const l of sorted) {
    if (usedPlayers.has(l.player.id)) continue;
    if ((perGame.get(l.gameId) ?? 0) >= maxPerGame) continue; // one longshot per player keeps legs independent-ish and spread out
    const next = [...chosen, l];
    const p = jointP(next);
    if (p <= 0) continue;
    chosen.push(l);
    usedPlayers.add(l.player.id);
    perGame.set(l.gameId, (perGame.get(l.gameId) ?? 0) + 1);
    if (1 / p >= target || chosen.length >= maxLegs) break;
  }
  return chosen;
}

export function MassiveMulti({
  report,
  gameId,
  currentSim,
  initialScope = "game",
}: {
  report: ScanReport;
  gameId: string;
  currentSim: SimResult | null;
  initialScope?: "game" | "slate";
}) {
  const games = report.gameModels;
  const [scope, setScope] = useState<"game" | "slate">(games.length > 1 ? initialScope : "game");
  const multiGameHref = () => {
    const u = new URL(window.location.href);
    u.searchParams.set("scan", "day");
    u.searchParams.set("mm", "slate");
    if (!u.searchParams.get("tab") && u.pathname.includes("/games/")) u.searchParams.set("tab", "players");
    u.hash = "combo-builder";
    return u.toString();
  };
  const [target, setTarget] = useState(250);
  const [custom, setCustom] = useState<string[]>([]);
  const [sims, setSims] = useState<Map<string, SimResult>>(new Map());
  const [busy, setBusy] = useState(false);

  const scopeGames = useMemo(() => (scope === "slate" ? games : games.filter((g) => g.id === gameId)), [scope, games, gameId]);
  const pool = report.pool ?? [];

  // Simulate every game in scope (own seed, separate from the likely-outcome sim), one at a time so the page stays responsive.
  useEffect(() => {
    let cancelled = false;
    const todo = scopeGames.filter((g) => !sims.has(g.id));
    if (!todo.length) return;
    setBusy(true);
    const step = (i: number) => {
      if (cancelled) return;
      if (i >= todo.length) return setBusy(false);
      setTimeout(() => {
        const g = todo[i];
        const res = buildSimFor(g, pool.filter((p) => p.gameId === g.id && p.model));
        setSims((m) => new Map(m).set(g.id, res));
        step(i + 1);
      }, 20);
    };
    step(0);
    return () => {
      cancelled = true;
    };
  }, [scopeGames, sims, pool]);
  void currentSim;

  const legs = useMemo(() => {
    const out: LongLeg[] = [];
    for (const g of scopeGames) {
      const sim = sims.get(g.id);
      if (sim) out.push(...legsFor(g, pool.filter((p) => p.gameId === g.id && p.model), sim));
    }
    return out;
  }, [scopeGames, sims, pool]);

  const variants = useMemo(() => {
    if (!legs.length) return [];
    const slate = scope === "slate";
    const maxLegs = slate ? 12 : 10;
    const perGame = slate ? 2 : Infinity; // spread a multi-game multi across the slate
    const v = [
      { name: slate ? "Best across the slate" : "Best longshots", note: slate ? "Top realistic spikes, max 2 per game" : "Most realistic spikes from anyone", legs: greedyMulti(legs, target, maxLegs, perGame) },
      { name: "Bench boosts", note: "Low scorers having a big night", legs: greedyMulti(legs.filter((l) => l.kind === "bench" || (l.stat !== "pts" && l.avg < 4)), target, maxLegs, perGame) },
      { name: "Boards & dimes", note: "Rebound and assist spikes only", legs: greedyMulti(legs.filter((l) => l.stat === "reb" || l.stat === "ast"), target, maxLegs, perGame) },
    ];
    return v.filter((x) => x.legs.length >= 2);
  }, [legs, target, scope]);

  const legById = useMemo(() => new Map(legs.map((l) => [l.id, l])), [legs]);
  const customLegs = custom.map((id) => legById.get(id)).filter((l): l is LongLeg => Boolean(l));
  const toggle = (l: LongLeg) =>
    setCustom((c) => (c.includes(l.id) ? c.filter((x) => x !== l.id) : [...c.filter((x) => !x.startsWith(`${l.gameId}:${l.player.id}:${l.stat}:`)), l.id]));

  const colorOf = (p: ScanPlayer) => {
    const g = games.find((x) => x.id === p.gameId);
    return hex(g?.teams.find((t) => t.id === p.teamId)?.color);
  };
  const chip = (on: boolean) => `chip cursor-pointer select-none ${on ? "!border-court !text-court" : "hover:text-ink-100"}`;
  const topLegs = [...legs].sort((a, b) => legScore(b) - legScore(a)).slice(0, 40);

  return (
    <div className="rounded-xl border border-court/40 bg-gradient-to-b from-court/10 to-transparent p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 sm:flex-1">
          <h3 className="display text-lg font-extrabold">
            Massive multi <span className="text-court">· longshots</span>
          </h3>
          <p className="text-xs text-ink-400">
            Lines above what players usually do — unlikely but realistic (10–45% each) and reached at least once in their last 10 games — stacked
            for a big payout.
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="display mr-1 text-ink-500">Aim for</span>
        {TARGETS.map((t) => (
          <button key={t} onClick={() => setTarget(t)} className={chip(target === t)}>
            ${t.toLocaleString()}+
          </button>
        ))}
        {games.length === 1 && (
          <>
            <span className="mx-1 h-4 w-px bg-ink-700" />
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.href = multiGameHref(); }} className="chip !border-court/60 !text-court hover:!bg-court/10">
              Multi-game: build across every game this day →
            </a>
          </>
        )}
        {games.length > 1 && (
          <>
            <span className="mx-1 h-4 w-px bg-ink-700" />
            <button onClick={() => setScope("game")} className={chip(scope === "game")}>
              This game
            </button>
            <button onClick={() => setScope("slate")} className={chip(scope === "slate")}>
              Across all {games.length} games
            </button>
          </>
        )}
      </div>

      {busy && !legs.length ? (
        <div className="flex items-center gap-3 py-6 text-sm text-ink-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-court border-t-transparent" />
          Hunting longshots{scope === "slate" ? ` across ${scopeGames.length} games` : ""}…
        </div>
      ) : !legs.length ? (
        <p className="py-4 text-sm text-ink-500">No realistic longshots found — players need some recent history of beating their usual numbers.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            {variants.map((v) => {
              const p = jointP(v.legs);
              return (
                <div key={v.name} className="flex flex-col rounded-lg border border-ink-800 bg-ink-950/60 p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="display font-bold">{v.name}</div>
                      <div className="text-[11px] text-ink-500">{v.note}</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-xl font-extrabold text-court">{odds(p)}</div>
                      <div className="num text-[10px] text-ink-500">{pct(p)} · {v.legs.length} legs</div>
                    </div>
                  </div>
                  <ul className="flex-1 space-y-1">
                    {v.legs.map((l) => (
                      <LegRow key={l.id} l={l} color={colorOf(l.player)} />
                    ))}
                  </ul>
                  {1 / p < target && <p className="mt-1 text-[10px] text-ink-500">Ran out of realistic legs before ${target}.</p>}
                  <button onClick={() => setCustom(v.legs.map((l) => l.id))} className="chip mt-2 self-start text-[11px] hover:text-ink-100">
                    Edit this multi
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div>
              <h4 className="display mb-1.5 text-sm font-bold text-ink-300">Longshot board · tap to add</h4>
              <div className="max-h-[420px] overflow-auto rounded-lg border border-ink-800">
                <table className="stat-table compact">
                  <thead>
                    <tr>
                      <th className="!text-left">Player</th>
                      <th>LEG</th>
                      <th title="What he normally does">USUAL</th>
                      <th title="Times reached in last 10">LAST 10</th>
                      <th>CHANCE</th>
                      <th>ODDS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topLegs.map((l) => (
                      <tr key={l.id} onClick={() => toggle(l)} className={`cursor-pointer ${custom.includes(l.id) ? "[&>td]:!bg-court/15" : ""}`}>
                        <td className="!py-1">
                          <span className="flex items-center gap-2 font-sans">
                            <span className="h-5 w-1 rounded" style={{ background: colorOf(l.player) }} />
                            <Headshot src={l.player.headshot} name={l.player.name} size={22} />
                            <span className="truncate text-[12px]">{l.player.name}</span>
                          </span>
                        </td>
                        <td className="font-semibold !text-ink-100">
                          {l.line}+ {LABEL[l.stat]}
                        </td>
                        <td>{l.avg.toFixed(1)}</td>
                        <td className={l.hits >= 3 ? "!text-win" : ""}>{l.n ? `${l.hits}/${l.n}` : "–"}</td>
                        <td>{pct(l.p)}</td>
                        <td className="!text-court-soft">{odds(l.p)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4 className="display mb-1.5 text-sm font-bold text-ink-300">Your massive multi</h4>
              <div className="rounded-lg border border-ink-800 p-3">
                {customLegs.length ? (
                  <>
                    <ul className="space-y-1">
                      {customLegs.map((l) => (
                        <LegRow key={l.id} l={l} color={colorOf(l.player)} onRemove={() => toggle(l)} />
                      ))}
                    </ul>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-court/15 py-2">
                        <div className="display text-[10px] text-ink-400">Fair odds</div>
                        <div className="num text-lg font-bold text-court">{odds(jointP(customLegs))}</div>
                      </div>
                      <div className="rounded-md bg-ink-950/60 py-2">
                        <div className="display text-[10px] text-ink-500">Chance</div>
                        <div className="num text-lg font-semibold">{pct(jointP(customLegs))}</div>
                      </div>
                      <div className="rounded-md bg-ink-950/60 py-2">
                        <div className="display text-[10px] text-ink-500">Legs</div>
                        <div className="num text-lg font-semibold">{customLegs.length}</div>
                      </div>
                    </div>
                    <button onClick={() => setCustom([])} className="mt-2 text-xs text-ink-500 hover:text-ink-200">
                      Clear
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-ink-500">Tap rows on the longshot board, or “Edit this multi” on a suggestion, to build your own.</p>
                )}
              </div>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-ink-500">
            Each leg must sit above the player&apos;s usual number, have a 10–45% chance in {N.toLocaleString()} simulated games, and have happened at least
            once in his last 10. Legs from the same game are counted together in that game&apos;s simulation (so a fast, high-scoring game helps several at
            once); legs from different games are multiplied. Longshots miss most of the time — fair odds show what the chance is worth, not a prediction it
            lands.
          </p>
        </div>
      )}
    </div>
  );
}

function LegRow({ l, color, onRemove }: { l: LongLeg; color: string; onRemove?: () => void }) {
  return (
    <li className="flex items-center gap-2 rounded-md bg-ink-900 px-2 py-1 text-[12px]">
      <span className="h-5 w-1 shrink-0 rounded" style={{ background: color }} />
      <Headshot src={l.player.headshot} name={l.player.name} size={22} />
      <span className="min-w-0 flex-1 truncate">
        {l.player.name} <span className="font-semibold text-ink-100">{l.line}+ {LABEL[l.stat]}</span>
        <span className="block text-[10px] text-ink-500">
          {l.player.gameLabel} · usually {l.avg.toFixed(1)} · hit {l.hits}/{l.n} last 10
        </span>
      </span>
      <span className="num text-[11px] text-court-soft">{odds(l.p)}</span>
      {onRemove && (
        <button onClick={onRemove} className="text-ink-500 hover:text-loss" aria-label="Remove">
          ✕
        </button>
      )}
    </li>
  );
}
