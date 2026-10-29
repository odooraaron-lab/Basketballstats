import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Public: landing page, blog, legal pages, auth pages and endpoints, Stripe webhook,
// analytics beacon, SEO files. Everything else needs a signed-in session; the paid check
// (subscription) happens in each section's layout, which can read the database.
const PUBLIC = [
  /^\/$/,
  /^\/blog(\/|$)/,
  /^\/(login|signup|forgot|reset|terms|privacy|responsible-gambling|pricing)(\/|$)/,
  /^\/api\/(auth|track)(\/|$)/,
  /^\/api\/stripe\/webhook$/,
  /^\/api\/cron\//, // Vercel Cron; each route checks CRON_SECRET itself
  /^\/(sitemap\.xml|robots\.txt|manifest\.webmanifest|opengraph-image.*|twitter-image.*)$/,
];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) {
    if (pathname.startsWith("/admin") && session.role !== "admin") return NextResponse.redirect(new URL("/app", req.url));
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|images/).*)"],
};
