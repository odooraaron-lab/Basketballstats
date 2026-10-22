import type { BoxLine } from "./stats";

export interface TeamRef {
  id: string;
  abbr: string;
  name: string; // "Los Angeles Lakers"
  shortName: string; // "Lakers"
  location: string;
  color: string; // hex without '#'
  altColor: string;
  logo: string;
}

export interface PlayerRef {
  id: string;
  name: string;
  shortName: string;
  jersey: string;
  pos: string;
  headshot: string;
  teamId?: string;
}

export interface RosterPlayer extends PlayerRef {
  age: number | null;
  height: string;
  weight: string;
  experience: number | null;
  college: string;
  status: string;
  injury: string | null;
}

export type GameState = "pre" | "in" | "post";

export interface GameSide {
  team: TeamRef;
  score: number | null;
  record: string;
  winner: boolean;
  linescores: number[];
}

export interface GameCard {
  id: string;
  date: string; // ISO
  state: GameState;
  detail: string;
  shortDetail: string;
  period: number;
  clock: string;
  home: GameSide;
  away: GameSide;
  venue: string;
  broadcast: string;
  odds: { details: string; overUnder: number | null; spread: number | null } | null;
  seasonType: number;
}

export interface Standing {
  team: TeamRef;
  conference: string; // "East" | "West"
  wins: number;
  losses: number;
  pct: number;
  gb: number;
  seed: number;
  streak: string;
  home: string;
  road: string;
  last10: string;
  confRecord: string;
  ppg: number;
  oppg: number;
  diff: number;
}

export interface BoxPlayer {
  player: PlayerRef;
  starter: boolean;
  dnp: boolean;
  reason: string;
  box: BoxLine;
}

export interface BoxTeam {
  team: TeamRef;
  homeAway: "home" | "away";
  players: BoxPlayer[];
  totals: BoxLine;
  teamStats: { name: string; label: string; value: string }[];
}

export interface Play {
  id: string;
  seq: number;
  period: number;
  clock: number; // seconds remaining in period
  clockDisplay: string;
  type: string;
  typeId: string;
  text: string;
  teamId: string | null;
  athletes: string[];
  scoring: boolean;
  scoreValue: number;
  shooting: boolean;
  pointsAttempted: number | null;
  homeScore: number;
  awayScore: number;
  x: number | null;
  y: number | null;
}

export interface GameSummary {
  card: GameCard;
  box: BoxTeam[]; // [away, home] order not guaranteed; use homeAway
  plays: Play[];
  officials: string[];
  attendance: number | null;
  winProb: { playId: string; home: number }[];
  injuries: { teamId: string; items: { name: string; status: string; detail: string }[] }[];
  seasonSeries: string[];
  lastFive: { teamId: string; games: { result: string; score: string; opp: string; date: string }[] }[];
}

export interface PlayerSeasonRow {
  season: string; // "2025-26"
  year: number;
  teamId: string;
  teamAbbr: string;
  gp: number;
  gs: number;
  avg: BoxLine; // per game; min = minutes per game
}

export interface GameLogRow {
  eventId: string;
  date: string;
  opp: string;
  oppLogo: string;
  atVs: string;
  result: string;
  score: string;
  box: BoxLine;
}

export interface TeamSeason {
  gp: number;
  perGame: BoxLine;
  totals: BoxLine;
  raw: Record<string, number>;
}

export interface LeaderRow {
  player: PlayerRef;
  teamAbbr: string;
  teamLogo: string;
  values: Record<string, number>;
}
