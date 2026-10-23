import { NextResponse } from "next/server";
import { LEAGUES } from "@/leagues/registry";
import { resolveSeason } from "@/lib/league";
import { evaluateSlip } from "@/lib/slip";
import type { Market, SlipRow } from "@/lib/slipCore";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as { league?: string; market?: Market; rows?: SlipRow[] };
  const league = LEAGUES[body.league ?? "nba"];
  if (!league || !Array.isArray(body.rows)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const rows = body.rows.slice(0, 40).filter((r) => r && r.name && Number(r.line) > 0);
  const season = await resolveSeason(league, undefined);
  const results = await evaluateSlip(league, rows, body.market ?? "pts", season.current);
  return NextResponse.json({ results });
}
