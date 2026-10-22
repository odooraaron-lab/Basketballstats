import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  authConfigured,
  checkCredentials,
  createSession,
} from "@/lib/auth";

function safeNext(n: FormDataEntryValue | null): string {
  const s = typeof n === "string" ? n : "";
  // Only allow same-site relative paths.
  return s.startsWith("/") && !s.startsWith("//") ? s : "/nba";
}

export async function POST(req: Request) {
  const form = await req.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const next = safeNext(form.get("next"));
  const base = new URL(req.url);

  if (!authConfigured()) {
    return NextResponse.redirect(new URL("/login?error=config", base), 303);
  }
  if (!checkCredentials(username, password)) {
    // Small delay slows down brute force attempts.
    await new Promise((r) => setTimeout(r, 600));
    const url = new URL("/login", base);
    url.searchParams.set("error", "1");
    if (next !== "/nba") url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }

  const res = NextResponse.redirect(new URL(next, base), 303);
  res.cookies.set(SESSION_COOKIE, await createSession(username || "owner"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return res;
}
