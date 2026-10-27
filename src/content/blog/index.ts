// Blog posts by sport zone. Each zone file exports its posts; add a post by copying an entry.
import type { Post, ZoneId } from "./types";
import { nba } from "./nba";
import { nbl } from "./nbl";
import { nrl } from "./nrl";
import { superRugby } from "./super-rugby";
import { aLeague } from "./a-league";
import { netball } from "./netball";
import { cricket } from "./cricket";
import { superSmash } from "./super-smash";

export type { Post, ZoneId };

export const ZONES: { id: ZoneId; label: string; blurb: string; appHref: string }[] = [
  { id: "nrl", label: "NRL", blurb: "Run metres, line breaks, try scorers and margin bets — the rugby league numbers that matter.", appHref: "/sport/nrl" },
  { id: "super-rugby", label: "Super Rugby", blurb: "Bonus points, home edge and try-scoring trends across Super Rugby Pacific.", appHref: "/sport/super-rugby" },
  { id: "netball", label: "ANZ Premiership", blurb: "Shooting %, super shots, gains and centre-pass conversion in NZ netball.", appHref: "/sport/anz-premiership" },
  { id: "a-league", label: "A-League", blurb: "Goals, shots on target, draws and both-teams-to-score in the A-League.", appHref: "/sport/a-league" },
  { id: "super-smash", label: "Super Smash", blurb: "NZ domestic T20: chasing, powerplays, top batters — and the coming NZ20.", appHref: "/cricket/super-smash" },
  { id: "cricket", label: "Cricket", blurb: "Tests, ODIs and T20s worldwide: run rates, chase maths and player form.", appHref: "/cricket" },
  { id: "nba", label: "NBA", blurb: "Player props, pace, usage and same-game multis for the NBA.", appHref: "/nba" },
  { id: "nbl", label: "NBL", blurb: "The Breakers, imports and FIBA rules: betting the Australian NBL with stats.", appHref: "/nbl" },
];

export const POSTS: Post[] = [...nrl, ...superRugby, ...netball, ...aLeague, ...superSmash, ...cricket, ...nba, ...nbl].sort((a, b) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
);

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug);
export const postsInZone = (z: ZoneId) => POSTS.filter((p) => p.zone === z);
export const zoneById = (z: string) => ZONES.find((x) => x.id === z);

export function readingMinutes(p: Post) {
  return Math.max(2, Math.round(p.body.split(/\s+/).length / 220));
}
