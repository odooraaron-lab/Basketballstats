// Is each competition live, in season or out of season right now? Used by the landing page
// ("which sports are on") and by the off-season notices inside each section.
import "server-only";
import { getUpcoming } from "./espn";
import { getCompetitionSeason, getDayMatches } from "./cricket";
import { fmtDate, shiftDay, todayKey } from "./format";
import { getLeague } from "@/leagues/registry";
import { COMPS, getComp } from "@/sports/comps";
import { defaultSeason, getFixtures } from "@/sports/data";
import type { Fixture } from "@/sports/model";
import { getMeetings } from "./racing/tab";

export type SeasonState = "live" | "in-season" | "off-season";

export interface SportStatus {
  id: string;
  name: string;
  short: string;
  href: string;
  sport: string;
  region: string;
  accent: string;
  state: SeasonState;
  /** One line: "6 games this week", "Off-season — back 27 Dec" */
  headline: string;
  /** Longer explanation for the off-season notice */
  detail: string;
  next?: string; // ISO date of next game
}

const DAY = 86400_000;
const day = (iso: string) => fmtDate(iso, { weekday: "short", day: "numeric", month: "short" });
const longDay = (iso: string) => fmtDate(iso, { day: "numeric", month: "long", year: "numeric" });

async function basketball(id: "nba" | "nbl"): Promise<SportStatus> {
  const l = getLeague(id);
  const base = { id, name: l.name, short: l.shortName, href: `/${id}`, sport: "Basketball", region: l.region, accent: l.accent };
  const days = await getUpcoming(l, 14).catch(() => []);
  const games = days.flatMap((d) => d.games);
  const live = games.some((g) => g.state === "in");
  if (games.length) {
    const week = games.filter((g) => Date.parse(g.date) < Date.now() + 7 * DAY).length;
    return { ...base, state: live ? "live" : "in-season", headline: live ? "Games live now" : `${week} games in the next 7 days`, detail: "", next: games.find((g) => g.state === "pre")?.date };
  }
  const when = id === "nba" ? "late October" : "September";
  return {
    ...base,
    state: "off-season",
    headline: `Off-season — back in ${when}`,
    detail: `The ${l.shortName} is between seasons, so there are no games in the next two weeks. Every stat, player page and game log from last season is still here, and the new season usually tips off in ${when}.`,
  };
}

function fieldStatus(compId: string, fx: Fixture[], nextSeason: Fixture[]): SportStatus {
  const c = getComp(compId);
  const base = { id: c.id === "a-league-w" ? "a-league" : c.id, name: c.name, short: c.short, href: `/sport/${c.id}`, sport: { "rugby-league": "Rugby league", rugby: "Rugby union", soccer: "Football", netball: "Netball" }[c.sport], region: c.region, accent: c.accent };
  const now = Date.now();
  const live = fx.some((f) => f.state === "in");
  const soon = fx.filter((f) => f.state === "pre" && Date.parse(f.date) < now + 10 * DAY);
  const recent = fx.filter((f) => f.state === "post" && Date.parse(f.date) > now - 10 * DAY);
  const upcoming = [...fx, ...nextSeason].filter((f) => f.state === "pre").sort((a, b) => (a.date < b.date ? -1 : 1));
  if (live || soon.length || (recent.length && upcoming.length)) {
    const round = (soon[0] ?? upcoming[0])?.roundLabel;
    return { ...base, state: live ? "live" : "in-season", headline: live ? "Games live now" : soon.length ? `${round || "Next round"} — ${soon.length} game${soon.length > 1 ? "s" : ""} in the next 10 days` : "In season", detail: "", next: upcoming[0]?.date };
  }
  if (c.team) {
    const last = [...fx].reverse().find((f) => f.state === "post");
    const nxt = upcoming[0];
    const res = last ? (() => {
      const us = last.home.id === c.team!.id ? last.home : last.away;
      const them = last.home.id === c.team!.id ? last.away : last.home;
      return `The last test was ${(us.score ?? 0) > (them.score ?? 0) ? "a win" : (us.score ?? 0) < (them.score ?? 0) ? "a loss" : "a draw"} against ${them.name}, ${us.score}–${them.score}, on ${longDay(last.date)}.`;
    })() : "";
    return {
      ...base,
      state: "off-season",
      headline: nxt ? `Between tests — next ${day(nxt.date)}` : "Off-season — tests resume in July",
      detail: `The ${c.team.nickname} play tests in the July and November windows plus the Rugby Championship / Bledisloe in between; the rest of the year the players are with their Super Rugby clubs. ${res} ${nxt ? `The next test is ${longDay(nxt.date)} against ${nxt.home.id === c.team.id ? nxt.away.name : nxt.home.name}.` : "Next year's test schedule appears here as soon as it's published."} Every result, player stat and try scorer from the year is still here.`.replace(/\s+/g, " ").trim(),
      next: nxt?.date,
    };
  }
  // Off-season: who won, and when it's back
  const finals = fx.filter((f) => f.final && f.state === "post").sort((a, b) => (a.date < b.date ? -1 : 1));
  const decider = finals[finals.length - 1];
  const champ = decider?.winnerId ? (decider.winnerId === decider.home.id ? decider.home : decider.away) : null;
  const finished = champ && decider ? `${champ.name} won the ${decider.roundLabel.replace(/s$/, "")} on ${longDay(decider.date)}.` : fx.length ? "The season has finished." : "";
  const next = upcoming[0];
  return {
    ...base,
    state: "off-season",
    headline: next ? `Off-season — back ${day(next.date)}` : "Off-season",
    detail: `${base.short} is between seasons. ${finished} ${next ? `The next season starts ${longDay(next.date)}, and the draw is already in the Fixtures tab.` : "The next season's draw hasn't been published yet."} Every stat from the season just finished is still here to explore.`.replace(/\s+/g, " ").trim(),
    next: next?.date,
  };
}

async function comp(compId: string): Promise<SportStatus> {
  const c = getComp(compId);
  const season = await defaultSeason(c);
  const [fx, nxt] = await Promise.all([getFixtures(c, season).catch(() => []), getFixtures(c, season + 1).catch(() => [])]);
  return fieldStatus(compId, fx, nxt);
}

async function superSmash(): Promise<SportStatus> {
  const base = { id: "super-smash", name: "Super Smash", short: "Super Smash", href: "/cricket/super-smash", sport: "Cricket", region: "NZ T20", accent: "#f2c400" };
  const y = Number(todayKey().slice(0, 4));
  const seasons = await Promise.all([y - 1, y].map((s) => getCompetitionSeason("8654", s).catch(() => [])));
  const all = seasons.flat();
  const now = Date.now();
  if (all.some((m) => m.state === "in")) return { ...base, state: "live", headline: "Match live now", detail: "" };
  const soon = all.filter((m) => m.state === "pre" && Date.parse(m.date) < now + 10 * DAY);
  if (soon.length) return { ...base, state: "in-season", headline: `${soon.length} match${soon.length > 1 ? "es" : ""} in the next 10 days`, detail: "", next: soon[0].date };
  const next = all.filter((m) => m.state === "pre").sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const final = all.filter((m) => m.state === "post" && /^final/i.test(m.description)).pop();
  const winner = final?.teams.find((t) => t.winner);
  return {
    ...base,
    state: "off-season",
    headline: next ? `Off-season — back ${day(next.date)}` : "Off-season",
    detail: `The Super Smash runs over the New Zealand summer. ${winner ? `${winner.name} won the last final.` : ""} ${next ? `The next season starts ${longDay(next.date)} — the full draw is already loaded.` : ""} Last season's points table, results and leaders are all still here.`.replace(/\s+/g, " ").trim(),
    next: next?.date,
  };
}

async function worldCricket(): Promise<SportStatus> {
  const today = await getDayMatches(todayKey()).catch(() => []);
  const live = today.filter((m) => m.state === "in").length;
  return {
    id: "cricket",
    name: "World cricket",
    short: "Cricket",
    href: "/cricket",
    sport: "Cricket",
    region: "Worldwide",
    accent: "#2fb36d",
    state: live ? "live" : "in-season",
    headline: live ? `${live} matches live now` : `${today.length} matches today`,
    detail: "",
  };
}

async function racing(): Promise<SportStatus> {
  const key = todayKey();
  const iso = (k: string) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
  const [today, tomorrow] = await Promise.all([getMeetings(iso(key), iso(key)), getMeetings(iso(shiftDay(key, 1)), iso(shiftDay(key, 1)))]);
  const base = { id: "racing", name: "Horse racing", short: "Racing", href: "/racing", sport: "Racing", region: "NZ gallops & harness", accent: "#c8a24a" };
  const now = Date.now();
  const live = today.some((m) => m.races.some((r) => Math.abs(Date.parse(r.start) - now) < 20 * 60_000));
  const n = today.length || tomorrow.length;
  return {
    ...base,
    state: live ? "live" : "in-season",
    headline: today.length ? `${today.length} NZ meeting${today.length > 1 ? "s" : ""} today` : n ? `${tomorrow.length} NZ meeting${tomorrow.length > 1 ? "s" : ""} tomorrow` : "Racing year-round",
    detail: "",
  };
}

const safe = async (f: () => Promise<SportStatus>, fallback: SportStatus) => {
  try {
    return await f();
  } catch {
    return fallback;
  }
};

const fallback = (id: string, name: string, href: string): SportStatus => ({ id, name, short: name, href, sport: "", region: "", accent: "#5b6573", state: "in-season", headline: "", detail: "" });

/** Status of every competition in the app, in display order. */
export async function allSportStatus(): Promise<SportStatus[]> {
  const comps = COMPS.filter((c) => c.id !== "a-league-w").map((c) => c.id);
  return Promise.all([
    safe(() => basketball("nba"), fallback("nba", "NBA", "/nba")),
    safe(() => basketball("nbl"), fallback("nbl", "NBL", "/nbl")),
    ...comps.map((id) => safe(() => comp(id), fallback(id, getComp(id).short, `/sport/${id}`))),
    safe(superSmash, fallback("super-smash", "Super Smash", "/cricket/super-smash")),
    safe(worldCricket, fallback("cricket", "Cricket", "/cricket")),
    safe(racing, { ...fallback("racing", "Horse racing", "/racing"), short: "Racing", sport: "Racing", region: "NZ gallops & harness", accent: "#c8a24a", headline: "Racing year-round" }),
  ]);
}

export async function statusFor(id: string): Promise<SportStatus | null> {
  if (id === "nba" || id === "nbl") return safe(() => basketball(id), fallback(id, id, `/${id}`));
  if (id === "super-smash") return safe(superSmash, fallback(id, id, ""));
  if (getComp(id)) return safe(() => comp(id), fallback(id, id, ""));
  return null;
}
