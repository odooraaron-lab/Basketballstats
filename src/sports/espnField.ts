// ESPN feeds for field sports (Super Rugby, A-League men & women): scoreboard, standings,
// team schedules and match summaries, normalised to the shared model.
import "server-only";
import type { CompDef, SourceDef } from "./comps";
import { humanise } from "./comps";
import { colorFor, getJson, mapLimit, num, type J } from "./http";
import type { Fixture, LadderRow, MatchEvent, MatchFile, PlayerLine, Side, TeamStatRow } from "./model";
import { assignRounds, teamStatsFromPlayers } from "./model";

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

// Rugby nations ESPN sometimes sends without an abbreviation
const NATION_ABBR: Record<string, string> = { "South Africa": "RSA", "New Zealand": "NZL", Australia: "AUS", Argentina: "ARG", England: "ENG", Ireland: "IRE", Scotland: "SCO", Wales: "WAL", France: "FRA", Italy: "ITA", Fiji: "FIJ", Japan: "JPN", Samoa: "SAM", Tonga: "TGA", Georgia: "GEO", Uruguay: "URU", Namibia: "NAM", Chile: "CHI", Portugal: "POR", Romania: "ROU", Spain: "ESP", "United States": "USA", Canada: "CAN" };

function toSide(c: J): Side {
  const t = c?.team ?? {};
  const name = String(t.displayName ?? t.name ?? t.shortDisplayName ?? "");
  if (!t.abbreviation && NATION_ABBR[name]) t.abbreviation = NATION_ABBR[name];
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

// ------------------------------------------------------------------ team environments
const LEAGUE_LABEL: Record<string, string> = { "17567": "Nations Championship", "244293": "Rugby Championship", "289234": "Test match", "164205": "Rugby World Cup" };

/** Every game in the team's leagues for a calendar year (all nations, for ratings), tagged with its league. */
async function teamLeagueEvents(s: EspnSource, year: number): Promise<{ league: string; e: J }[]> {
  const live = year >= new Date().getUTCFullYear();
  const lists = await mapLimit(s.leagues ?? [s.league], 4, async (league) => {
    const j = await getJson(`https://site.api.espn.com/apis/site/v2/sports/${s.sport}/${league}/scoreboard?dates=${year}&limit=1000`, live ? 300 : 12 * 3600);
    return ((j?.events ?? []) as J[]).map((e) => ({ league, e }));
  });
  const seen = new Set<string>();
  return lists.flat().filter(({ e }) => e?.id && !seen.has(String(e.id)) && seen.add(String(e.id)));
}

function teamFixture(comp: CompDef, league: string, e: J, year: number): Fixture | null {
  const f = eventToFixture(comp, e, year);
  if (!f) return null;
  f.ref = `${league}/${f.id}`;
  f.final = false;
  let label = LEAGUE_LABEL[league] ?? "Test match";
  const names = [f.home.name, f.away.name].join(" ");
  if (league !== "164205" && /New Zealand/.test(names) && /Australia/.test(names)) label = `Bledisloe Cup · ${label}`;
  if (league !== "164205" && /New Zealand/.test(names) && /South Africa/.test(names) && league === "289234") label = "Test match · Springbok tour";
  f.stage = label;
  return f;
}

/** Only the team's tests, in date order, numbered Test 1..N. */
async function teamFixtures(comp: CompDef, year: number): Promise<Fixture[]> {
  const s = comp.source as EspnSource;
  const all = await teamLeagueEvents(s, year);
  const mine = all
    .filter(({ e }) => (e.competitions?.[0]?.competitors ?? []).some((c: J) => String(c.team?.id ?? c.id) === s.team))
    .map(({ league, e }) => teamFixture(comp, league, e, year))
    .filter((f): f is Fixture => Boolean(f && f.date))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  mine.forEach((f, i) => ((f.round = i + 1), (f.roundLabel = `Test ${i + 1} · ${f.stage}`)));
  return mine;
}

/** All international results in the team's leagues — gives opponents a rating beyond their games with us. */
export async function espnContextFixtures(comp: CompDef, year: number): Promise<Fixture[]> {
  const s = comp.source as EspnSource;
  if (!s.team) return [];
  return (await teamLeagueEvents(s, year)).map(({ league, e }) => teamFixture(comp, league, e, year)).filter((f): f is Fixture => Boolean(f));
}

export async function espnFixtures(comp: CompDef, year: number): Promise<Fixture[]> {
  const s = comp.source as EspnSource;
  if (s.team) return teamFixtures(comp, year);
  const { start, end } = seasonWindow(s, year);
  const live = Date.now() < end.getTime() + 7 * 86400_000;
  const rv = live ? 120 : 6 * 3600;
  const events = new Map<string, J>();
  const take = (j: J) => (j?.events ?? []).forEach((e: J) => e?.id && events.set(String(e.id), e));

  // ESPN's date-range queries return nothing, but whole months (dates=YYYYMM) work.
  const months: string[] = [];
  for (let d = new Date(start); d <= end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)))
    months.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  const nowKey = ymd(new Date()).slice(0, 6);
  // Whole calendar years too: month queries occasionally drop a game near a month boundary.
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  const queries = [...years.map((y) => [`dates=${y}&limit=1000`, `${y}` < nowKey.slice(0, 4) ? 6 * 3600 : rv] as const), ...months.map((m) => [`dates=${m}&limit=500`, m < nowKey ? 6 * 3600 : rv] as const)];
  (await mapLimit(queries, 4, ([q, r]) => getJson(`${site(s)}/scoreboard?${q}`, r))).forEach(take);
  if (events.size < 4) {
    // Fallback: every team's schedule
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
  return markFinals(assignRounds(out.sort((a, b) => (a.date < b.date ? -1 : 1))));
}

/**
 * ESPN doesn't flag finals for these leagues. Finals are the trailing rounds that are much
 * smaller than a normal round (≤ 30% of the teams' games), or games with undecided (TBC) teams.
 */
export function markFinals(fx: Fixture[]): Fixture[] {
  const teams = new Set(fx.flatMap((f) => [f.home.id, f.away.id]));
  const tbc = (f: Fixture) => /^(tba|tbc|tbd)$/i.test(f.home.name) || /^(tba|tbc|tbd)$/i.test(f.away.name);
  const byRound = new Map<number, Fixture[]>();
  for (const f of fx) if (f.round != null && !f.final) byRound.set(f.round, [...(byRound.get(f.round) ?? []), f]);
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const small = Math.max(1, Math.ceil(teams.size * 0.3));
  const finalsRounds: number[] = [];
  for (let i = rounds.length - 1; i >= 0; i--) {
    const fs = byRound.get(rounds[i])!;
    if (fs.length <= small || fs.every(tbc)) finalsRounds.unshift(rounds[i]);
    else break;
  }
  // Need a real regular season before it (don't flag a short early-season draw)
  if (finalsRounds.length && finalsRounds.length < rounds.length / 3) {
    const n = finalsRounds.length;
    finalsRounds.forEach((r, i) => {
      const fs = byRound.get(r)!;
      const left = n - i; // 1 = last
      const label = left === 1 && fs.length === 1 ? "Grand Final" : left === 2 && fs.length <= 2 ? "Semi Finals" : `Finals week ${i + 1}`;
      fs.forEach((f) => ((f.final = true), (f.roundLabel = label)));
    });
  }
  for (const f of fx) if (!f.final && tbc(f)) (f.final = true), (f.roundLabel = "Finals");
  return fx;
}

export async function espnTeams(comp: CompDef): Promise<Side[]> {
  const j = await getJson(`${site(comp.source as EspnSource)}/teams`, 24 * 3600);
  const list: J[] = j?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return list.map((t) => toSide({ team: t.team ?? t }));
}

export async function espnStandings(comp: CompDef, year: number): Promise<LadderRow[] | null> {
  const s = comp.source as EspnSource;
  if (s.team) return null;
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
      won: g("wins", "gamesWon"),
      drawn: g("ties", "draws", "gamesDrawn"),
      lost: g("losses", "gamesLost"),
      byes: g("byes", "gamesBye"),
      pf,
      pa,
      diff: st.has("pointDifferential") ? g("pointDifferential") : st.has("pointsDifference") ? g("pointsDifference") : pf - pa,
      bonus: st.has("bonusPoints") ? g("bonusPoints") : g("bonusPointsTry") + g("bonusPointsLosing"),
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
  // Team environments keep the league in the ref ("17567/603975")
  const [league, event] = fixture.ref.includes("/") ? fixture.ref.split("/") : [s.league, fixture.ref];
  const j = await getJson(`https://site.api.espn.com/apis/site/v2/sports/${s.sport}/${league}/summary?event=${event}`, revalidate);
  if (!j) return null;
  const hc = j.header?.competitions?.[0];
  const fx = (hc && eventToFixture(comp, { ...hc, id: fixture.id, season: j.header?.season }, fixture.season)) || fixture;
  fx.round = fixture.round;
  fx.ref = fixture.ref;
  fx.stage = fixture.stage ?? fx.stage;
  fx.final = fixture.final || fx.final;
  fx.roundLabel = fixture.roundLabel || fx.roundLabel;
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

  // Events: keyEvents (soccer) → scoring plays → header details (rugby)
  const events: MatchEvent[] = [];
  const evs: J[] = j.keyEvents?.length ? j.keyEvents : (j.plays ?? []).filter((p: J) => p.scoringPlay).length ? (j.plays ?? []).filter((p: J) => p.scoringPlay) : hc?.details ?? [];
  let rh = 0, ra = 0;
  for (const e of evs) {
    const kind = String(e.type?.text ?? e.type?.type ?? (e.scoringPlay ? "Score" : "")).trim();
    if (!/goal|try|conversion|card|penalty|substitut|var/i.test(kind) && !e.scoringPlay) continue;
    if (/substitut/i.test(kind) && s.sport === "rugby") continue; // dozens per match; counted in player stats instead
    const who = (e.participants ?? e.athletesInvolved ?? []).map((p: J) => p.athlete?.displayName ?? p.displayName).filter(Boolean).join(", ");
    const teamId = String(e.team?.id ?? "");
    const scoring = Boolean(e.scoringPlay ?? /goal|try|conversion/i.test(kind)) && !/miss|saved/i.test(kind);
    if (s.sport === "soccer" && scoring) teamId === h ? rh++ : teamId === a && ra++;
    events.push({
      clock: String(e.clock?.displayValue ?? e.clock ?? ""),
      period: num(e.period?.number) ?? undefined,
      teamId,
      kind: kind.toLowerCase(),
      text: s.sport === "rugby" ? who || kind : String(e.text ?? e.shortText ?? [who, kind].filter(Boolean).join(" — ")),
      scoring,
      homeScore: num(e.homeScore) ?? (s.sport === "soccer" && scoring ? rh : undefined),
      awayScore: num(e.awayScore) ?? (s.sport === "soccer" && scoring ? ra : undefined),
    });
  }

  // Rugby: ESPN has no player box score, so build one from lineups + scoring/card/sub events
  if (s.sport === "rugby") {
    const byId = new Map(players.map((p) => [p.id, p]));
    for (const p of players) {
      const jersey = Number(p.number);
      p.starter = jersey >= 1 && jersey <= 15;
      p.stats = p.starter ? { starts: 1 } : {};
    }
    const add = (id: string, k: string, v = 1) => {
      const p = byId.get(id);
      if (p) p.stats[k] = (p.stats[k] ?? 0) + v;
    };
    const POINTS: Record<string, [string, number]> = { try: ["tries", 5], conversion: ["conversions", 2], "penalty goal": ["penaltyGoals", 3], "drop goal": ["dropGoals", 3] };
    for (const e of hc?.details ?? []) {
      const kind = String(e.type?.text ?? "").toLowerCase();
      const id = String(e.participants?.[0]?.athlete?.id ?? "");
      if (!id) continue;
      if (POINTS[kind]) {
        add(id, POINTS[kind][0]);
        add(id, "points", POINTS[kind][1]);
      } else if (kind === "substitute on") add(id, "subIns");
      else if (/yellow/.test(kind)) add(id, "yellowCards");
      else if (/red/.test(kind)) add(id, "redCards");
    }
  }
  if (!teamStats.length && players.some((p) => Object.keys(p.stats).length)) {
    const label = new Map(comp.teamFeatured.flatMap((d) => d.keys.map((k) => [k, d.label] as const)));
    teamStats.push(...teamStatsFromPlayers(players, h, a, (k) => label.get(k) ?? humanise(k)).filter((r) => !/^(starts|subIns)$/.test(r.key)));
  }

  // Score by half: linescores when they add up, else from the event running score
  const periods: { home: number | null; away: number | null }[] = [];
  const ls = (id: string) => ((hc?.competitors ?? []).find((c: J) => String(c.team?.id ?? c.id) === id)?.linescores ?? []) as J[];
  const lh = ls(h).map((x) => num(x?.value ?? x?.displayValue) ?? 0);
  const la = ls(a).map((x) => num(x?.value ?? x?.displayValue) ?? 0);
  const sum = (xs: number[]) => xs.reduce((t, v) => t + v, 0);
  const plausible = lh.length >= 2 && lh.length <= 4 && sum(lh) === fx.home.score && sum(la) === fx.away.score && lh.filter((v, i) => v || la[i]).length > 1;
  if (plausible) for (let i = 0; i < lh.length; i++) periods.push({ home: lh[i], away: la[i] });
  else if (fx.state === "post" && events.some((e) => e.homeScore != null && e.period === 1)) {
    const ht = [...events].filter((e) => e.period === 1 && e.homeScore != null).pop();
    const h1 = ht?.homeScore ?? 0;
    const a1 = ht?.awayScore ?? 0;
    periods.push({ home: h1, away: a1 }, { home: (fx.home.score ?? 0) - h1, away: (fx.away.score ?? 0) - a1 });
  }

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
