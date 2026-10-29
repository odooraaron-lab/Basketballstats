import { NextResponse } from "next/server";
import { ingestRange, nzShift, nzToday } from "@/lib/racing/store";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Vercel Cron (vercel.json): records yesterday's results and the next two days' fields.
// Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const today = nzToday();
  const report = await ingestRange(nzShift(today, -1), nzShift(today, 2), 50_000);
  return NextResponse.json(report);
}
