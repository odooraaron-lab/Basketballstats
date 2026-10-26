// Match preview: projection, betting-style markets with our chances, likely scorers,
// form and head-to-head. Built from the season book.
import "server-only";
import { statOf } from "./comps";
import { getFixtures, type SeasonBook } from "./data";
import { anytimeScorer, pMarginAtLeast, project, pTotalOver, soccerMarkets, teamForm, type Fixture, type Projection } from "./model";

export interface Market {
  id: string;
  label: string;
  p: number;
  group: string;
}

export interface ScorerPick {
  id: string;
  name: string;
  teamId: string;
  games: number;
  scored: number;
  last5: number[];
  p: number;
}

export interface Preview {
  proj: Projection | null;
  markets: Market[];
  scorers: ScorerPick[];
  form: { teamId: string; rows: ReturnType<typeof teamForm> }[];
  h2h: Fixture[];
  ladderPos: Map<string, number>;
}

const half = (x: number) => Math.round(x) + 0.5;

export async function buildPreview(book: SeasonBook, f: Fixture): Promise<Preview> {
  const { comp } = book;
  const proj = project(book.ratings, comp, f.home.id, f.away.id);
  const markets: Market[] = [];
  const H = f.home.abbr || f.home.name;
  const A = f.away.abbr || f.away.name;
  if (proj) {
    markets.push({ id: "h2h:home", label: `${H} win`, p: proj.pHome, group: "Result" });
    if (comp.sport === "soccer") markets.push({ id: "h2h:draw", label: "Draw", p: proj.pDraw, group: "Result" });
    markets.push({ id: "h2h:away", label: `${A} win`, p: proj.pAway, group: "Result" });
    if (comp.sport === "soccer") {
      const sm = soccerMarkets(proj);
      markets.push({ id: "tot:o25", label: "Over 2.5 goals", p: sm.over25, group: "Goals" });
      markets.push({ id: "tot:u25", label: "Under 2.5 goals", p: 1 - sm.over25, group: "Goals" });
      markets.push({ id: "btts:y", label: "Both teams to score", p: sm.btts, group: "Goals" });
      markets.push({ id: "btts:n", label: "Not both to score", p: 1 - sm.btts, group: "Goals" });
      for (const cs of sm.likely.slice(0, 3)) markets.push({ id: `cs:${cs.h}-${cs.a}`, label: `Correct score ${H} ${cs.h}–${cs.a} ${A}`, p: cs.p, group: "Correct score" });
    } else {
      const sd = comp.marginSd;
      const fav = proj.margin >= 0 ? "home" : "away";
      const favName = fav === "home" ? H : A;
      const absMargin = Math.abs(proj.margin);
      const pFavBy = (x: number) => (fav === "home" ? pMarginAtLeast(proj, sd, x) : pMarginAtLeast({ ...proj, margin: -proj.margin }, sd, x));
      const line = half(absMargin); // e.g. -6.5
      markets.push({ id: `line:${fav}:${line}`, label: `${favName} −${line}`, p: pFavBy(Math.ceil(line)), group: "Line" });
      markets.push({ id: `line:dog:${line}`, label: `${fav === "home" ? A : H} +${line}`, p: 1 - pFavBy(Math.ceil(line)), group: "Line" });
      const bands = comp.sport === "netball" ? [1, 6, 11] : [1, 13];
      bands.forEach((lo, i) => {
        const hi = bands[i + 1];
        for (const [side, name] of [["home", H], ["away", A]] as const) {
          const pp = side === "home" ? proj : { ...proj, margin: -proj.margin };
          const p = pMarginAtLeast(pp, sd, lo) - (hi ? pMarginAtLeast(pp, sd, hi) : 0);
          markets.push({ id: `band:${side}:${lo}`, label: `${name} by ${lo}${hi ? `–${hi - 1}` : "+"}`, p, group: "Winning margin" });
        }
      });
      const tl = half(proj.total);
      markets.push({ id: `tot:o:${tl}`, label: `Over ${tl} total ${comp.scoreWord}`, p: pTotalOver(proj, sd, tl), group: "Total" });
      markets.push({ id: `tot:u:${tl}`, label: `Under ${tl} total ${comp.scoreWord}`, p: 1 - pTotalOver(proj, sd, tl), group: "Total" });
    }
  }

  // Anytime scorers: players who played their team's most recent game
  const scorers: ScorerPick[] = [];
  if (comp.scorer && book.players.length) {
    const def = { label: "", short: "", keys: comp.scorer.keys };
    const lastGame = new Map<string, string>();
    for (const file of book.files) for (const id of [file.fixture.home.id, file.fixture.away.id]) lastGame.set(id, file.fixture.id); // files are date-sorted by fixtures
    const all = book.players.filter((p) => p.games >= 2);
    const lgRate = all.reduce((s, p) => s + (statOf(p.totals, def) ?? 0), 0) / Math.max(1, all.reduce((s, p) => s + p.games, 0));
    for (const side of [f.home, f.away]) {
      const teamGames = book.fixtures.filter((x) => x.state === "post" && (x.home.id === side.id || x.away.id === side.id));
      const avgFor = teamGames.length ? teamGames.reduce((s, x) => s + ((x.home.id === side.id ? x.home.score : x.away.score) ?? 0), 0) / teamGames.length : 0;
      const exp = proj ? (side.id === f.home.id ? proj.home : proj.away) : avgFor;
      const scale = avgFor > 0 ? Math.min(1.6, Math.max(0.5, exp / avgFor)) : 1;
      const recentId = lastGame.get(side.id);
      for (const p of all.filter((x) => x.teamId === side.id)) {
        if (recentId && !p.logs.some((l) => l.fixtureId === recentId)) continue;
        const scored = statOf(p.totals, def) ?? 0;
        const prob = anytimeScorer(scored, p.games, lgRate * 0.6, scale);
        scorers.push({ id: p.id, name: p.name, teamId: side.id, games: p.games, scored, last5: p.logs.slice(-5).map((l) => statOf(l.stats, def) ?? 0), p: prob });
      }
    }
    scorers.sort((a, b) => b.p - a.p);
    // Keep it balanced: best six from each side
    const keep = new Set([f.home.id, f.away.id].flatMap((id) => scorers.filter((x) => x.teamId === id).slice(0, 6).map((x) => x.id)));
    scorers.splice(0, scorers.length, ...scorers.filter((x) => keep.has(x.id)));
  }

  // Head to head across this season and the last two
  const prev = await Promise.all([book.season - 1, book.season - 2].map((s) => getFixtures(comp, s).catch(() => [] as Fixture[])));
  const pool = [...book.fixtures, ...prev.flat()];
  const h2h = pool
    .filter((x) => x.state === "post" && x.id !== f.id && ((x.home.id === f.home.id && x.away.id === f.away.id) || (x.home.id === f.away.id && x.away.id === f.home.id)))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);
  const formPool = [...book.fixtures.filter((x) => x.date < (f.date || "9")), ...prev[0]];
  return {
    proj,
    markets,
    scorers: scorers.slice(0, 16),
    form: [f.home, f.away].map((s) => ({ teamId: s.id, rows: teamForm(formPool, s.id, 5) })),
    h2h,
    ladderPos: new Map(book.ladder.map((r) => [r.teamId, r.pos])),
  };
}
