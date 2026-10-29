import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { ingestRange, nzShift, nzToday } from "@/lib/racing/store";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Admin backfill: one day per call (the setup page walks back day by day). */
export async function POST(req: Request) {
  const v = await getViewer();
  if (!v?.isAdmin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const { day } = (await req.json().catch(() => ({}))) as { day?: string };
  const d = /^\d{4}-\d{2}-\d{2}$/.test(day ?? "") ? day! : nzShift(nzToday(), -1);
  const report = await ingestRange(d, d, 50_000);
  return NextResponse.json(report);
}
