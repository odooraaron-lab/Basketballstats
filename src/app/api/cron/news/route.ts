import { NextResponse } from "next/server";
import { runNewsIngest } from "@/lib/news/store";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Vercel Cron (daily) or any outside scheduler with "Authorization: Bearer $CRON_SECRET" or ?key=.
// Page traffic on /news also triggers runs every 30 minutes, so this is the backstop.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const key = new URL(req.url).searchParams.get("key");
  if (!secret || (req.headers.get("authorization") !== `Bearer ${secret}` && key !== secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runNewsIngest({ reason: "cron" }));
}
