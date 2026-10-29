// Server-side session helpers (Node runtime): who is signed in, and are they allowed in.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SIGNED_IN_HINT, SESSION_DAYS, createSession, verifySession, type SessionClaims } from "./auth";
import { dbConfigured } from "./db";
import { HIDDEN_COOKIE, THEME_COOKIE, parseHidden, type Prefs } from "./areas";
import { getUser, hasAccess, type User } from "./users";

export interface Viewer {
  claims: SessionClaims;
  /** null for the owner account (environment login) */
  user: User | null;
  isAdmin: boolean;
  hasAccess: boolean;
  prefs: Prefs;
  email: string;
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  if (claims.uid === "owner") {
    // The owner login has no member row, so its settings live in cookies only
    const theme = jar.get(THEME_COOKIE)?.value;
    const prefs: Prefs = { hidden: parseHidden(jar.get(HIDDEN_COOKIE)?.value), ...(theme === "light" || theme === "dark" || theme === "system" ? { theme } : {}) };
    return { claims, user: null, isAdmin: true, hasAccess: true, prefs, email: process.env.APP_USERNAME ?? "owner" };
  }
  if (!dbConfigured()) return null;
  const user = await getUser(Number(claims.uid)).catch(() => null);
  if (!user || user.session_version !== claims.ver) return null; // signed out everywhere / deleted
  return { claims, user, isAdmin: user.role === "admin", hasAccess: hasAccess(user), prefs: user.prefs ?? {}, email: user.email };
});

/** Signed in at all (paid or not). */
export async function requireViewer(next = "/app"): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/login?next=${encodeURIComponent(next)}`);
  return v;
}

/** Signed in AND paid (or comped/admin) — the paywall for every stats page. */
export async function requireMember(next = "/app"): Promise<Viewer> {
  const v = await requireViewer(next);
  if (!v.hasAccess) redirect("/account/billing?need=1");
  return v;
}

export async function requireAdmin(): Promise<Viewer> {
  const v = await requireViewer("/admin");
  if (!v.isAdmin) redirect("/app");
  return v;
}

const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export async function startSession(claims: SessionClaims, prefs: Prefs = {}) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSession(claims), { ...cookieBase, maxAge: SESSION_DAYS * 86400 });
  jar.set(SIGNED_IN_HINT, "1", { ...cookieBase, httpOnly: false, maxAge: SESSION_DAYS * 86400 });
  writePrefCookies(jar, prefs);
}

export function writePrefCookies(jar: Awaited<ReturnType<typeof cookies>>, prefs: Prefs) {
  const year = 365 * 86400;
  jar.set(THEME_COOKIE, prefs.theme ?? "dark", { ...cookieBase, httpOnly: false, maxAge: year });
  jar.set(HIDDEN_COOKIE, (prefs.hidden ?? []).join(","), { ...cookieBase, httpOnly: false, maxAge: year });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(SIGNED_IN_HINT);
}
