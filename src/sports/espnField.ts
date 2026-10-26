// ESPN feeds for field sports (Super Rugby, A-League men & women): scoreboard, standings,
// team schedules and match summaries, normalised to the shared model.
import "server-only";
import type { CompDef, SourceDef } from "./comps";
import { humanise } from "./comps";
import { colorFor, getJson, mapLimit, num, type J } from "./http";
import type { Fixture, LadderRow, MatchEvent, MatchFile, PlayerLine, Side, TeamStatRow } from "./model";
import { assignRounds } from "./model";

type EspnSource = Extract<SourceDef, { kind: "espn" }>;
const site = (s: EspnSource) => `https://site.api.espn.com/apis/site/v2/sports/${s.sport}/${s.league}`;
const ymd = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;

export function seasonWindow(s: EspnSource, year: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, s.startMonth - 1, 1));
  const end = new Date(Date.UTC(s.crossYear ? year + 1 : year, s.endMonth, 0)); // last day of end month
  return { start, end };
}

/** Season the competition is in (or most recently finished) on a given date. */
export function espnCurrentSeason(s: EspnSource, now = new Date()): number {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  if (s.crossYear) return m >= s.startMonth - 1 ? y : m <= s.endMonth + 1 ? y - 1 : y; // off-season → upcoming
  return m >= s.startMonth - 1 ? y : y - 1;
}

const logoOf = (t: J) => String(t?.logo ?? t?.logos?.[0]?.href ?? "");

function toSide(c: J): Side {
  const t = c?.team ?? {};
  const name = String(t.displayName ?? t.name ?? t.shortDisplayName ?? "");
  return {
    id: String(t.id ?? c?.id ?? name),
    name,
    abbr: String(t.abbreviation ?? t.shortDisplayName ?? name.slice(0, 3)).toUpperCase(),
    logo: logoOf(t),
    color: t.color ? `#${String(t.color).replace("#", "")}` : colorFor(name),
    score: num(typeof c?.score === "object" ? c.score?.value ?? c.score?.displayValue : c?.score),
  };
}

const FINAL_RE = /final|semi|qualif|elimination|play-?off|knockout/i;

export function eventToFixture(comp: CompDef, e: J, season: number): Fixture | null {
  const c = e?.competitions?.[0] ?? e;
  const cs: J[] = c?.competitors ?? [];
  if (cs.length < 2) return null;
  const hc = cs.find((x) => x.homeAway === "home") ?? cs[0];
  const ac = cs.find((x) => x.homeAway === "away") ?? cs[1];
  const home = toSide(hc);
  const away = toSide(ac);
  const st = c?.status?.type ?? e?.status?.type ?? {};
  const state: Fixture["state"] = st.state === "in" ? "in" : st.state === "post" || st.completed ? "post" : "pre";
  if (state === "pre") (home.score = null), (away.score = null);
  // Postponed / abandoned games: treat as not played
  if (state === "post" && (home.score == null || away.score == null)) return { ...base(), state: "pre" };
  function base(): Fixture {
    const notes = [...(c?.notes ?? []), ...(e?.notes ?? [])].map((n: J) => String(n?.headline ?? n?.text ?? "")).join(" ");
    const final = Number(e?.season?.type ?? c?.season?.type ?? 0) === 3 || FINAL_RE.test(notes) || FINAL_RE.test(String(c?.type?.text ?? ""));
    const round = num(e?.week?.number ?? c?.week?.number ?? null);
    return {
      id: String(e?.id ?? c?.id),
      comp: comp.id,
      season,
      round,
      roundLabel: final ? notes.match(FINAL_RE) ? notes.trim() || "Finals" : "Finals" : round != null ? `Round ${round}` : "",
      date: String(c?.date ?? e?.date ?? ""),
      state,
      status: String(st.shortDetail ?? st.detail ?? st.description ?? ""),
      venue: String(c?.venue?.fullName ?? e?.venue?.fullName ?? ""),
      home,
      away,
      winnerId: hc?.winner ? home.id : ac?.winner ? away.id : null,
      final,
      ref: String(e?.id ?? c?.id),
    };
  }
  return base();
}

export async function espnFixtures(comp: CompDef, year: number): Promise<Fixture[]> {
  const s = comp.source as EspnSource;
  const { start, end } = seasonWindow(s, year);
  const live = Date.now() < end.getTime() + 7 * 86400_000;
  const rv = live ? 120 : 6 * 3600;
  const events = new Map<string, J>();
  const take = (j: J) => (j?.events ?? []).forEach((e: J) => e?.id && events.set(String(e.id), e));

  // 1) whole season in one call; 2) month by month; 3) every team's schedule.
  take(await getJson(`${site(s)}/scoreboard?dates=${ymd(start)}-${ymd(end)}&limit=1000`, rv));
  if (events.size < 4) {
    const months: [Date, Date][] = [];
    for (let d = new Date(start); d <= end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)))
      months.push([d, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))]);
    (await mapLimit(months, 4, ([a, b]) => getJson(`${site(s)}/scoreboard?dates=${ymd(a)}-${ymd(b)}&limit=500`, rv))).forEach(take);
  }
  if (events.size < 4) {
    const teams = await espnTeams(comp);
    const scheds = await mapLimit(teams, 6, async (t) => {
      const res = await getJson(`${site(s)}/teams/${t.id}/schedule?season=${year}`, rv);
      const fix = s.sport === "soccer" ? await getJson(`${site(s)}/teams/${t.id}/schedule?season=${year}&fixture=true`, rv) : null;
      return [res, fix];
    });
    scheds.flat().forEach(take);
  }
  const out = [...events.values()]
    .map((e) => eventToFixture(comp, e, year))
    .filter((f): f is Fixture => Boolean(f && f.date && Date.parse(f.date) >= start.getTime() - 86400_000 && Date.parse(f.date) <= end.getTime() + 86400_000));
  return assignRounds(out).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function espnTeams(comp: CompDef): Promise<Side[]> {
  const j = await getJson(`${site(comp.source as EspnSource)}/teams`, 24 * 3600);
  const list: J[] = j?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return list.map((t) => toSide({ team: t.team ?? t }));
}

export async function espnStandings(comp: CompDef, year: number): Promise<LadderRow[] | null> {
  const s = comp.source as EspnSource;
  const j = await getJson(`https://site.api.espn.com/apis/v2/sports/${s.sport}/${s.league}/standings?season=${year}`, 600);
  const groups: J[] = j?.children?.length ? j.children : j?.standings ? [j] : [];
  const entries: J[] = groups.flatMap((g) => g?.standings?.entries ?? []);
  if (!entries.length) return null;
  const rows: LadderRow[] = entries.map((e) => {
    const st = new Map<string, number>();
    for (const x of e.stats ?? []) {
      const v = num(x.value ?? x.displayValue);
      if (v != null) st.set(String(x.name ?? x.type ?? x.abbreviation), v);
    }
    const g = (...k: string[]) => {
      for (const key of k) if (st.has(key)) return st.get(key)!;
      return 0;
    };
    const t = e.team ?? {};
    const pf = g("pointsFor", "goalsFor", "pointsScored");
    const pa = g("pointsAgainst", "goalsAgainst", "pointsConceded");
    return {
      teamId: String(t.id),
      team: { id: String(t.id), name: String(t.displayName ?? t.name), abbr: String(t.abbreviation ?? "").toUpperCase(), logo: logoOf(t), color: t.color ? `#${t.color}` : colorFor(String(t.displayName)), score: null },
      played: g("gamesPlayed", "played"),
      won: g("wins"),
      drawn: g("ties", "draws"),
      lost: g("losses"),
      byes: g("byes"),
      pf,
      pa,
      diff: st.has("pointDifferential") ? g("pointDifferential") : pf - pa,
      bonus: g("bonusPoints", "bonusPointsTry", "bonus") + (st.has("bonusPointsTry") ? g("bonusPointsLosing") : 0),
      points: g("points"),
      form: [],
      homeRec: "",
      awayRec: "",
      pos: g("rank", "position") || 0,
      note: e.note?.description,
    };
  });
  rows.sort((a, b) => (a.pos && b.pos ? a.pos - b.pos : b.points - a.points || b.diff - a.diff));
  rows.forEach((r, i) => (r.pos = i + 1));
  return rows.some((r) => r.played > 0) ? rows : null;
}

/** Flatten ESPN's stat arrays: [{name, displayValue}] or [{name, stats:[...]}]. */
function flatStats(list: J[] | undefined): { key: string; label: string; value: number | null; text: string }[] {
  const out: { key: string; label: string; value: number | null; text: string }[] = [];
  for (const x of list ?? []) {
    if (Array.isArray(x?.stats)) out.push(...flatStats(x.stats));
    else if (x?.name) out.push({ key: String(x.name), label: String(x.label ?? x.displayName ?? humanise(String(x.name))), value: num(x.value ?? x.displayValue), text: String(x.displayValue ?? x.value ?? "") });
  }
  return out;
}

export async function espnMatch(comp: CompDef, fixture: Fixture, revalidate: number): Promise<MatchFile | null> {
  const s = comp.source as EspnSource;
  const j = await getJson(`${site(s)}/summary?event=${fixture.ref}`, revalidate);
  if (!j) return null;
  const hc = j.header?.competitions?.[0];
  const fx = (hc && eventToFixture(comp, { ...hc, id: fixture.id, season: j.header?.season }, fixture.season)) || fixture;
  fx.round = fixture.round;
  fx.roundLabel = fx.final ? fx.roundLabel : fixture.roundLabel;
  fx.venue = fx.venue || String(j.gameInfo?.venue?.fullName ?? fixture.venue);
  const h = fx.home.id;
  const a = fx.away.id;

  // Team stats
  const bt: J[] = j.boxscore?.teams ?? [];
  const tH = flatStats(bt.find((t) => String(t.team?.id) === h)?.statistics);
  const tA = flatStats(bt.find((t) => String(t.team?.id) === a)?.statistics);
  const lower = new Set(comp.teamFeatured.filter((d) => d.lowerBetter).flatMap((d) => d.keys));
  const teamStats: TeamStatRow[] = [...new Set([...tH.map((x) => x.key), ...tA.map((x) => x.key)])].map((k) => {
    const hx = tH.find((x) => x.key === k);
    const ax = tA.find((x) => x.key === k);
    return { key: k, label: hx?.label ?? ax?.label ?? humanise(k), home: hx?.value ?? null, away: ax?.value ?? null, homeText: hx?.text, awayText: ax?.text, lowerBetter: lower.has(k) };
  });

  // Players: rosters (soccer/rugby) or basketball-style boxscore.players
  const players: PlayerLine[] = [];
  for (const r of j.rosters ?? []) {
    const teamId = String(r.team?.id ?? "");
    for (const p of r.roster ?? []) {
      const ath = p.athlete ?? {};
      const stats: Record<string, number> = {};
      for (const x of flatStats(p.stats)) if (x.value != null) stats[x.key] = x.value;
      if (p.subbedIn && !("subIns" in stats)) stats.subIns = 1;
      players.push({
        id: String(ath.id ?? ""),
        name: String(ath.displayName ?? ath.fullName ?? ""),
        teamId,
        number: p.jersey != null ? String(p.jersey) : undefined,
        position: p.position?.abbreviation ?? p.position?.displayName,
        starter: Boolean(p.starter),
        headshot: ath.headshot?.href,
        stats: p.starter || p.subbedIn || Object.values(stats).some((v) => v > 0) ? stats : {},
      });
    }
  }
  if (!players.length) {
    for (const t of j.boxscore?.players ?? []) {
      const teamId = String(t.team?.id ?? "");
      for (const grp of t.statistics ?? []) {
        const keys: string[] = grp.keys ?? grp.names ?? grp.labels ?? [];
        for (const row of grp.athletes ?? []) {
          const id = String(row.athlete?.id ?? "");
          let pl = players.find((p) => p.id === id);
          if (!pl) players.push((pl = { id, name: String(row.athlete?.displayName ?? ""), teamId, starter: row.starter, position: row.athlete?.position?.abbreviation, headshot: row.athlete?.headshot?.href, stats: {} }));
          (row.stats ?? []).forEach((v: unknown, i: number) => {
            const n = num(v);
            if (n != null && keys[i]) pl!.stats[keys[i]] = n;
          });
        }
      }
    }
  }

  // Events: keyEvents (soccer) → scoring plays → header details
  const events: MatchEvent[] = [];
  const evs: J[] = j.keyEvents?.length ? j.keyEvents : (j.plays ?? []).filter((p: J) => p.scoringPlay).length ? (j.plays ?? []).filter((p: J) => p.scoringPlay) : hc?.details ?? [];
  for (const e of evs) {
    const kind = String(e.type?.text ?? e.type?.type ?? (e.scoringPlay ? "Score" : "")).trim();
    if (/kickoff|kick off|start|end|halftime|half-time|full ?time/i.test(kind) && !e.scoringPlay) continue;
    const who = (e.participants ?? e.athletesInvolved ?? []).map((p: J) => p.athlete?.displayName ?? p.displayName).filter(Boolean).join(", ");
    events.push({
      clock: String(e.clock?.displayValue ?? e.clock ?? ""),
      period: num(e.period?.number) ?? undefined,
      teamId: String(e.team?.id ?? ""),
      kind: kind.toLowerCase(),
      text: String(e.text ?? e.shortText ?? [who, kind].filter(Boolean).join(" — ")),
      scoring: Boolean(e.scoringPlay ?? /goal|try|penalty goal|conversion|drop goal/i.test(kind)),
      homeScore: num(e.homeScore) ?? undefined,
      awayScore: num(e.awayScore) ?? undefined,
    });
  }

  const periods: { home: number | null; away: number | null }[] = [];
  const ls = (id: string) => ((hc?.competitors ?? []).find((c: J) => String(c.team?.id ?? c.id) === id)?.linescores ?? []) as J[];
  const lh = ls(h);
  const la = ls(a);
  for (let i = 0; i < Math.max(lh.length, la.length); i++) periods.push({ home: num(lh[i]?.value ?? lh[i]?.displayValue), away: num(la[i]?.value ?? la[i]?.displayValue) });

  return {
    fixture: fx,
    teamStats,
    players,
    events,
    periods,
    officials: (j.gameInfo?.officials ?? []).map((o: J) => String(o.displayName ?? o.fullName ?? "")).filter(Boolean),
    notes: (j.article?.headline ? [String(j.article.headline)] : []) as string[],
  };
}
