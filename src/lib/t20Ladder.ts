// T20 league table (Super Smash rules): win 4, tie / no result 2, plus a bonus point for a
// win with a run rate at least 1.25 × the opponent's. Net run rate counts an all-out side
// as having faced its full quota of overs. Pure — unit-tested.

export interface T20Innings {
  runs: number | null;
  wickets: number | null;
  overs: number | null;
}
export interface T20Side {
  id: string;
  name: string;
  abbr: string;
  logo: string;
  winner: boolean;
  innings: T20Innings[];
}
export interface T20Result {
  id: string;
  date: string;
  final: boolean;
  noResult: boolean;
  tie: boolean;
  teams: T20Side[];
}
export interface T20Row {
  id: string;
  name: string;
  abbr: string;
  logo: string;
  played: number;
  won: number;
  lost: number;
  nr: number;
  bonus: number;
  points: number;
  nrr: number | null;
  form: ("W" | "L" | "N")[];
  pos: number;
  // raw for NRR
  rf: number;
  bf: number;
  ra: number;
  bb: number;
}

export const oversToBalls = (o: number | null) => (o == null ? 0 : Math.floor(o) * 6 + Math.round((o % 1) * 10));

export function t20Ladder(results: T20Result[], quota = 20): T20Row[] {
  const rows = new Map<string, T20Row>();
  const row = (t: T20Side) => {
    let r = rows.get(t.id);
    if (!r) rows.set(t.id, (r = { id: t.id, name: t.name, abbr: t.abbr, logo: t.logo, played: 0, won: 0, lost: 0, nr: 0, bonus: 0, points: 0, nrr: null, form: [], pos: 0, rf: 0, bf: 0, ra: 0, bb: 0 }));
    return r;
  };
  for (const m of [...results].filter((x) => !x.final).sort((a, b) => (a.date < b.date ? -1 : 1))) {
    if (m.teams.length !== 2) continue;
    const [a, b] = m.teams;
    const ra = row(a);
    const rb = row(b);
    ra.played++;
    rb.played++;
    if (m.noResult || m.tie || (!a.winner && !b.winner)) {
      ra.nr++, rb.nr++;
      ra.points += 2;
      rb.points += 2;
      ra.form.push("N");
      rb.form.push("N");
      if (m.noResult) continue; // abandoned games don't count toward NRR
    }
    const ia = a.innings[0];
    const ib = b.innings[0];
    const balls = (i: T20Innings | undefined) => (!i ? 0 : (i.wickets ?? 0) >= 10 ? quota * 6 : oversToBalls(i.overs) || quota * 6);
    const rate = (i: T20Innings | undefined) => (i && balls(i) ? (6 * (i.runs ?? 0)) / balls(i) : 0);
    if (ia && ib) {
      ra.rf += ia.runs ?? 0;
      ra.bf += balls(ia);
      ra.ra += ib.runs ?? 0;
      ra.bb += balls(ib);
      rb.rf += ib.runs ?? 0;
      rb.bf += balls(ib);
      rb.ra += ia.runs ?? 0;
      rb.bb += balls(ia);
    }
    if (a.winner || b.winner) {
      const [w, l, wi, li] = a.winner ? [ra, rb, ia, ib] : [rb, ra, ib, ia];
      w.won++;
      l.lost++;
      w.points += 4;
      w.form.push("W");
      l.form.push("L");
      if (wi && li && rate(li) > 0 && rate(wi) >= 1.25 * rate(li)) (w.bonus++, w.points++);
    }
  }
  const out = [...rows.values()].map((r) => ({ ...r, nrr: r.bf && r.bb ? (6 * r.rf) / r.bf - (6 * r.ra) / r.bb : null, form: r.form.slice(-5) }));
  out.sort((x, y) => y.points - x.points || y.won - x.won || (y.nrr ?? 0) - (x.nrr ?? 0));
  out.forEach((r, i) => (r.pos = i + 1));
  return out;
}
