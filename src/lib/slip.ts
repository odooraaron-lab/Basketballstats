import "server-only";
import type { League } from "@/leagues/types";
import { getPlayerGameLog, getRoster, getTeams } from "./espn";
import type { GameLogRow, RosterPlayer, TeamRef } from "./model";
import { normName } from "./nbacom";
import { mean, modelSd, projectStat } from "./scanCore";
import { judge, type Market, type SlipRow, type Verdict } from "./slipCore";

export interface SlipResult {
  row: SlipRow;
  market: Market;
  player: { id: string; name: string; headshot: string; team: string; teamLogo: string } | null;
  history: { date: string; opp: string; value: number }[];
  verdict: Verdict;
  source: "history" | "screenshot";
}

const valueOf = (g: GameLogRow, m: Market) =>
  m === "pra" ? g.box.pts + g.box.reb + g.box.ast : m === "pts" ? g.box.pts : m === "reb" ? g.box.reb : m === "ast" ? g.box.ast : g.box.tpm;

async function playerIndex(l: League) {
  const teams = await getTeams(l);
  const rosters = await Promise.all(teams.map((t) => getRoster(l, t.id)));
  const idx = new Map<string, { p: RosterPlayer; team: TeamRef }>();
  teams.forEach((t, i) => rosters[i].forEach((p) => idx.set(normName(p.name), { p, team: t })));
  return idx;
}

function lookup(idx: Awaited<ReturnType<typeof playerIndex>>, name: string) {
  const n = normName(name);
  const exact = idx.get(n);
  if (exact) return exact;
  // Screens sometimes abbreviate ("J. Jaquez") or OCR drops a letter: match on last name + first initial
  const parts = n.split(" ");
  const last = parts[parts.length - 1];
  const cands = [...idx.entries()].filter(([k]) => k.endsWith(` ${last}`) && k[0] === n[0]);
  return cands.length === 1 ? cands[0][1] : null;
}

export async function evaluateSlip(l: League, rows: SlipRow[], market: Market, currentYear: number): Promise<SlipResult[]> {
  const idx = await playerIndex(l);
  return Promise.all(
    rows.map(async (row) => {
      const m = row.market ?? market;
      const hit = lookup(idx, row.name);
      if (hit) {
        const regular = (rs: GameLogRow[]) => rs.filter((g) => g.seasonType !== 1 && g.box.min > 0);
        const cur = regular(await getPlayerGameLog(l, hit.p.id, currentYear));
        const games = cur.length >= 10 ? cur : cur.concat(regular(await getPlayerGameLog(l, hit.p.id, currentYear - 1)));
        games.sort((a, b) => (a.date < b.date ? 1 : -1));
        const seasonGames = cur.length >= 5 ? cur : games;
        const seasonAvg = mean(seasonGames.map((g) => valueOf(g, m)));
        const last10 = games.slice(0, 10);
        const recent = last10.map((g) => valueOf(g, m));
        const key = m === "pra" ? "pts" : m;
        const pr = projectStat(key, seasonAvg ?? mean(recent) ?? row.line, recent, null, null);
        return {
          row,
          market: m,
          player: { id: hit.p.id, name: hit.p.name, headshot: hit.p.headshot, team: hit.team.abbr, teamLogo: hit.team.logo },
          history: last10.map((g) => ({ date: g.date, opp: `${g.atVs} ${g.opp}`, value: valueOf(g, m) })),
          verdict: judge(row, pr.mean, pr.sd, recent, seasonAvg),
          source: "history" as const,
        };
      }
      // Unknown player: fall back to the numbers printed on the screenshot
      const recent = [...row.recent].reverse();
      const avg = mean(recent) ?? row.line;
      return {
        row,
        market: m,
        player: null,
        history: recent.map((v) => ({ date: "", opp: "", value: v })),
        verdict: judge(row, avg, modelSd(m === "pra" ? "pts" : m, avg), recent, null),
        source: "screenshot" as const,
      };
    }),
  );
}

// ---------------------------------------------------------------------------- screenshot reading (Claude vision)

const PROMPT = `This is a screenshot of a sportsbook player-props screen (basketball).
Extract every player row. For each: the player's full name, the line (e.g. 21.5), the decimal odds for Over and Under, and any recent game results shown under the name (left to right).
Also say which market it is if the screen shows it (points, rebounds, assists, threes, or pts+reb+ast); otherwise "unknown".
Reply with JSON only, no prose:
{"market":"points|rebounds|assists|threes|pra|unknown","rows":[{"name":"","line":0,"over":0,"under":0,"recent":[0]}]}
Use null for any odds you can't read. Ignore percentage bars.`;

const MARKET_MAP: Record<string, Market> = { points: "pts", rebounds: "reb", assists: "ast", threes: "tpm", pra: "pra" };

export async function readScreenshot(image: Uint8Array, mediaType: string): Promise<{ rows: SlipRow[]; market: Market | null }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error("No ANTHROPIC_API_KEY"), { code: "NO_KEY" });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: Buffer.from(image).toString("base64") } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`Vision request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const text: string = j.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const rows: SlipRow[] = (json.rows ?? [])
    .filter((r: SlipRow) => r?.name && Number(r.line) > 0)
    .map((r: SlipRow) => ({
      name: String(r.name),
      line: Number(r.line),
      over: r.over ? Number(r.over) : null,
      under: r.under ? Number(r.under) : null,
      recent: Array.isArray(r.recent) ? r.recent.map(Number).filter((x) => Number.isFinite(x)) : [],
    }));
  return { rows, market: MARKET_MAP[String(json.market)] ?? null };
}
