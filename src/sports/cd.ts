// Champion Data "Match Centre" feeds (mc.championdata.com) — the same static JSON that
// powers the nrl.com and netball match centres. No auth. ID chain:
//   competitions.json → competition id (per season) → {id}/fixture.json → {id}/{matchId}.json
import "server-only";
import type { CompDef, SourceDef } from "./comps";
import { humanise } from "./comps";
import { colorFor, getJson, num, type J } from "./http";
import type { Fixture, MatchEvent, MatchFile, PlayerLine, Side, TeamStatRow } from "./model";
import { teamStatsFromPlayers } from "./model";

const CD = "https://mc.championdata.com";
type CdSource = Extract<SourceDef, { kind: "cd" }>;

export interface CdComp {
  id: number;
  name: string;
  season: number;
  rounds: number | null;
}

// Team identity: Champion Data gives names only, so short codes and colours live here.
const TEAMS: [RegExp, string, string][] = [
  // NRL
  [/broncos/i, "BRI", "#8a1538"],
  [/raiders/i, "CAN", "#6cbe45"],
  [/bulldogs/i, "CBY", "#1f6fd1"],
  [/sharks/i, "CRO", "#00a9d8"],
  [/dolphins/i, "DOL", "#e4202e"],
  [/titans/i, "GLD", "#00a5e3"],
  [/sea eagles/i, "MAN", "#8c1d4f"],
  [/storm/i, "MEL", "#7a3fb3"],
  [/knights/i, "NEW", "#1a6fd0"],
  [/cowboys/i, "NQL", "#f5c518"],
  [/eels/i, "PAR", "#ffd200"],
  [/panthers/i, "PEN", "#e0218a"],
  [/rabbitohs/i, "SOU", "#00a651"],
  [/dragons/i, "SGI", "#e2231a"],
  [/roosters/i, "SYD", "#d71920"],
  [/warriors/i, "NZW", "#20a3dc"],
  [/tigers/i, "WST", "#f68b1f"],
  [/bears/i, "PER", "#f2a900"],
  // ANZ Premiership
  [/pulse/i, "PUL", "#f9d71c"],
  [/tactix/i, "TAC", "#e31837"],
  [/mystics/i, "MYS", "#1f8fe0"],
  [/stars/i, "STA", "#00a3ad"],
  [/steel/i, "STE", "#8e44ad"],
  [/magic/i, "MAG", "#e8b92b"],
];

function side(id: unknown, name: string, score: unknown): Side {
  const meta = TEAMS.find(([re]) => re.test(name));
  return {
    id: String(id ?? name),
    name,
    abbr: meta?.[1] ?? name.replace(/[^A-Za-z ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase(),
    logo: "",
    color: meta?.[2] ?? colorFor(name),
    score: num(score),
  };
}

export async function cdCompetitions(src: CdSource): Promise<CdComp[]> {
  const j = await getJson(`${CD}/data/competitions.json`, 6 * 3600);
  const list: J[] = j?.competitionDetails?.competition ?? j?.competitions ?? [];
  const inc = new RegExp(src.nameMatch, "i");
  const exc = src.nameExclude ? new RegExp(src.nameExclude, "i") : null;
  return list
    .map((c) => ({ id: Number(c.id), name: String(c.name ?? ""), season: Number(c.season ?? 0), rounds: num(c.rounds) }))
    .filter((c) => c.id && inc.test(c.name) && !(exc && exc.test(c.name)))
    .sort((a, b) => b.season - a.season || a.id - b.id);
}

const stateOf = (status: string, date: string, hasScore: boolean): Fixture["state"] => {
  if (/complete|full\s*time|final|post|result/i.test(status)) return "post";
  if (/progress|playing|live|half|quarter|break|extra/i.test(status)) return "in";
  if (hasScore && date && Date.now() - Date.parse(date) > 4 * 3600_000) return "post";
  return "pre";
};

export async function cdFixtures(comp: CompDef, cds: CdComp[]): Promise<Fixture[]> {
  const out: Fixture[] = [];
  const files = await Promise.all(cds.map((c) => getJson(`${CD}/data/${c.id}/fixture.json`, 120)));
  files.forEach((j, i) => {
    const c = cds[i];
    const finalsComp = /final/i.test(c.name);
    const matches: J[] = j?.fixture?.match ?? [];
    for (const m of matches) {
      const date = String(m.utcStartTime ?? m.localStartTime ?? "");
      const home = side(m.homeSquadId, String(m.homeSquadName ?? m.homeSquadNickname ?? "Home"), m.homeSquadScore);
      const away = side(m.awaySquadId, String(m.awaySquadName ?? m.awaySquadNickname ?? "Away"), m.awaySquadScore);
      const status = String(m.matchStatus ?? "");
      const state = stateOf(status, date, home.score != null && away.score != null && home.score + away.score > 0);
      if (state === "pre") (home.score = null), (away.score = null);
      const round = num(m.roundNumber);
      const final = finalsComp || (c.rounds != null && round != null && round > c.rounds) || /final/i.test(String(m.matchType ?? m.roundName ?? ""));
      out.push({
        id: `${c.id}-${m.matchId}`,
        comp: comp.id,
        season: c.season,
        round,
        roundLabel: final ? String(m.roundName ?? (round != null ? `Finals week ${round - (c.rounds ?? round) || 1}` : "Finals")) : round != null ? `Round ${round}` : "",
        date,
        state,
        status: state === "post" ? "Full time" : state === "in" ? status || "Live" : "",
        venue: String(m.venueName ?? ""),
        home,
        away,
        winnerId: state === "post" && home.score != null && away.score != null && home.score !== away.score ? (home.score > away.score ? home.id : away.id) : null,
        final,
        ref: `${c.id}-${m.matchId}`,
      });
    }
  });
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

// Keys in match files that aren't stats.
const NOT_STAT = /(^|_)(id|ids)$|Id$|^period$|^jumper|Number$|Code$|^squad|^player|Time$|^created|^updated|^order/i;

function numericStats(o: J): Record<string, number> {
  const s: Record<string, number> = {};
  for (const [k, v] of Object.entries(o ?? {})) if (typeof v === "number" && Number.isFinite(v) && !NOT_STAT.test(k)) s[k] = v;
  return s;
}

let defsCache: { at: number; map: Map<string, string> } | null = null;
async function statLabels(src: CdSource): Promise<Map<string, string>> {
  if (!src.statDefsPath) return new Map();
  if (defsCache && Date.now() - defsCache.at < 6 * 3600_000) return defsCache.map;
  const j = await getJson(`${CD}${src.statDefsPath}`, 24 * 3600);
  const list: J[] = j?.definitions ?? j?.statisticDefinitions ?? j?.statistics ?? (Array.isArray(j) ? j : []);
  const map = new Map<string, string>();
  for (const d of list) if (d?.dataName) map.set(String(d.dataName), String(d.longName ?? d.shortName ?? d.dataName));
  defsCache = { at: Date.now(), map };
  return map;
}

export async function cdMatch(comp: CompDef, fixture: Fixture, revalidate: number): Promise<MatchFile | null> {
  const [cdId, matchId] = fixture.ref.split("-");
  const src = comp.source as CdSource;
  const [j, labelsMap] = await Promise.all([getJson(`${CD}/data/${cdId}/${matchId}.json`, revalidate), statLabels(src)]);
  const ms = j?.matchStats;
  if (!ms) return null;
  const featuredLabel = new Map(comp.featured.flatMap((d) => d.keys.map((k) => [k, d.label] as const)));
  const label = (k: string) => labelsMap.get(k) ?? featuredLabel.get(k) ?? humanise(k);

  const info = new Map<string, J>();
  for (const p of ms.playerInfo?.player ?? []) info.set(String(p.playerId), p);
  const teamName = new Map<string, string>();
  for (const t of ms.teamInfo?.team ?? []) teamName.set(String(t.squadId), String(t.squadName ?? t.squadNickname ?? ""));

  // Starting positions (netball: GS…GK / I; league: jersey-based)
  const startPos = new Map<string, string>();
  for (const p of ms.startingLineUp?.player ?? ms.positionalLineUp?.player ?? []) startPos.set(String(p.playerId), String(p.startingPositionCode ?? p.position ?? ""));

  const players: PlayerLine[] = [];
  for (const p of ms.playerStats?.player ?? []) {
    const id = String(p.playerId ?? "");
    const pi = info.get(id) ?? {};
    const teamId = String(p.squadId ?? pi.squadId ?? "");
    const pos = String(p.startingPositionCode ?? startPos.get(id) ?? pi.position ?? p.currentPositionCode ?? "");
    const name = String(pi.displayName ?? (pi.firstname ? `${pi.firstname} ${pi.surname ?? ""}` : pi.shortDisplayName ?? `#${id}`)).trim();
    players.push({
      id,
      name,
      teamId,
      number: p.jumperNumber != null ? String(p.jumperNumber) : pi.jumperNumber != null ? String(pi.jumperNumber) : undefined,
      position: pos && pos !== "-" ? pos : undefined,
      starter: pos ? !/^(I|IC|BENCH|RES|-)$/i.test(pos) : undefined,
      stats: numericStats(p),
    });
  }

  const h = fixture.home.id;
  const a = fixture.away.id;
  let teamStats: TeamStatRow[] = [];
  const tsl: J[] = ms.teamStats?.team ?? [];
  if (tsl.length >= 2) {
    const hs = numericStats(tsl.find((t) => String(t.squadId) === h) ?? tsl[0]);
    const as = numericStats(tsl.find((t) => String(t.squadId) === a) ?? tsl[1]);
    teamStats = [...new Set([...Object.keys(hs), ...Object.keys(as)])].map((k) => ({ key: k, label: label(k), home: hs[k] ?? null, away: as[k] ?? null }));
  } else teamStats = teamStatsFromPlayers(players, h, a, label);
  const lower = new Set(comp.featured.filter((d) => d.lowerBetter).flatMap((d) => d.keys));
  teamStats.forEach((r) => (r.lowerBetter = lower.has(r.key)));

  // Score by period (team period stats when present)
  const periods: { home: number | null; away: number | null }[] = [];
  for (const t of ms.teamPeriodStats?.team ?? []) {
    const p = Number(t.period ?? 0);
    if (!p) continue;
    const v = num(t.points ?? t.goals ?? t.score);
    while (periods.length < p) periods.push({ home: null, away: null });
    if (String(t.squadId) === h) periods[p - 1].home = v;
    else if (String(t.squadId) === a) periods[p - 1].away = v;
  }

  const clock = (period: unknown, secs: unknown) => {
    const s = num(secs) ?? 0;
    const p = num(period) ?? 1;
    // Show running minutes for the footy codes, period + mm:ss for netball quarters
    if (comp.sport === "netball") return `Q${p} ${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const per = 80 / comp.periods;
    return `${Math.floor((p - 1) * per + s / 60) + 1}'`;
  };
  const nameOf = (pid: unknown) => {
    const pi = info.get(String(pid));
    return pi ? String(pi.shortDisplayName ?? pi.displayName ?? `${pi.firstname ?? ""} ${pi.surname ?? ""}`).trim() : "";
  };

  const events: MatchEvent[] = [];
  let hs = 0, as = 0;
  const flow: J[] = ms.scoreFlow?.score ?? [];
  for (const e of flow) {
    const team = String(e.squadId ?? "");
    const pts = num(e.scorepoints ?? e.points) ?? 1;
    if (team === h) hs += pts;
    else if (team === a) as += pts;
    const kind = String(e.scoreName ?? "score").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    // Netball score flow is every goal; keep the timeline to tries/goals for league only.
    events.push({ clock: clock(e.period, e.periodSeconds), period: num(e.period) ?? undefined, teamId: team, kind, text: [nameOf(e.playerId), kind].filter(Boolean).join(" — "), scoring: true, homeScore: hs, awayScore: as });
  }
  for (const b of ms.sinBins?.binned ?? []) events.push({ clock: clock(b.period, b.periodSeconds), period: num(b.period) ?? undefined, teamId: String(b.squadId ?? ""), kind: "sin bin", text: `${nameOf(b.playerId)} — sin bin`, scoring: false });
  for (const r of ms.reports?.onReport ?? []) events.push({ clock: clock(r.period, r.periodSeconds), period: num(r.period) ?? undefined, teamId: String(r.squadId ?? ""), kind: "on report", text: `${nameOf(r.playerId)} — on report${r.offence ? ` (${r.offence})` : ""}`, scoring: false });
  events.sort((x, y) => (x.period ?? 0) - (y.period ?? 0) || parseFloat(x.clock.replace(/^Q\d /, "")) - parseFloat(y.clock.replace(/^Q\d /, "")));

  // Prefer the match file's names for the two sides
  const fx = { ...fixture };
  if (teamName.get(h)) fx.home = { ...fx.home, name: teamName.get(h)! };
  if (teamName.get(a)) fx.away = { ...fx.away, name: teamName.get(a)! };
  return { fixture: fx, teamStats, players, events, periods, officials: [], notes: [] };
}
