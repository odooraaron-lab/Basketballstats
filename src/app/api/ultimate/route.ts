import { NextResponse } from "next/server";
import { logEvent } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { getUltimate } from "@/lib/ultimate";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  const v = await getViewer();
  if (!v?.hasAccess) return NextResponse.json({ error: "Membership required" }, { status: 402 });
  const result = await getUltimate();
  logEvent("ultimate_bet", v.user?.id ?? null).catch(() => {});
  return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=300" } });
}
