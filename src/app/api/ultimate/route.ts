import { NextResponse } from "next/server";
import { logEvent } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { getUltimate } from "@/lib/ultimate";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const v = await getViewer();
  if (!v?.hasAccess) return NextResponse.json({ error: "Membership required" }, { status: 402 });
  const hours = Number(new URL(req.url).searchParams.get("hours")) || 48;
  const result = await getUltimate(hours);
  logEvent("ultimate_bet", v.user?.id ?? null, { hours }).catch(() => {});
  return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=300" } });
}
