import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { dbConfigured, q } from "@/lib/db";

const BOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|curl|wget|python|monitor/i;

export async function POST(req: Request) {
  if (!dbConfigured()) return new NextResponse(null, { status: 204 });
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  if (BOT.test(ua)) return new NextResponse(null, { status: 204 });
  let b: { path?: string; ref?: string; utm?: string; campaign?: string; w?: number } = {};
  try {
    b = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const path = String(b.path ?? "").slice(0, 300);
  if (!path.startsWith("/")) return new NextResponse(null, { status: 204 });

  const jar = await cookies();
  let visitor = jar.get("cs_v")?.value;
  const res = new NextResponse(null, { status: 204 });
  if (!visitor) {
    visitor = crypto.randomUUID();
    res.cookies.set("cs_v", visitor, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86400, secure: process.env.NODE_ENV === "production" });
  }
  // First-touch source, attached to the account at signup
  if (!jar.get("cs_src")) {
    const src = { ref: String(b.ref ?? "").slice(0, 200), utm: String(b.utm ?? "").slice(0, 80), campaign: String(b.campaign ?? "").slice(0, 80), landing: path };
    res.cookies.set("cs_src", encodeURIComponent(JSON.stringify(src)), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
  }
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  const userId = session && session.uid !== "owner" ? Number(session.uid) : null;
  let refHost = "";
  try {
    refHost = b.ref ? new URL(b.ref).hostname.replace(/^www\./, "") : "";
  } catch {
    /* ignore */
  }
  const device = /mobi|iphone|android/i.test(ua) || (b.w ?? 1200) < 700 ? "mobile" : "desktop";
  try {
    await q(`INSERT INTO page_views (path, referrer, visitor, user_id, utm_source, country, device) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
      path,
      refHost,
      visitor,
      userId,
      String(b.utm ?? "").slice(0, 80),
      h.get("x-vercel-ip-country") ?? "",
      device,
    ]);
  } catch {
    /* analytics must never fail the page */
  }
  return res;
}
