"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AREAS, type Prefs, type Theme } from "@/lib/areas";
import { logEvent, q, q1 } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { endSession, requireViewer, startSession, writePrefCookies } from "@/lib/session";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { savePrefs, type User } from "@/lib/users";

export async function savePrefsAction(form: FormData) {
  const v = await requireViewer("/account");
  const theme = (["dark", "light", "system"].includes(String(form.get("theme"))) ? form.get("theme") : "dark") as Theme;
  const shown = new Set(form.getAll("show").map(String));
  const hidden = AREAS.filter((a) => !shown.has(a.id)).map((a) => a.id);
  // Keep at least one section visible
  if (AREAS.filter((a) => a.kind === "section").every((a) => hidden.includes(a.id))) hidden.splice(hidden.indexOf("nba"), 1);
  const home = String(form.get("home") ?? "");
  const prefs: Prefs = { theme, hidden, home: AREAS.some((a) => a.id === home) ? home : undefined };
  if (v.user) await savePrefs(v.user.id, prefs);
  writePrefCookies(await cookies(), prefs);
  redirect("/account?saved=1");
}

export async function changePasswordAction(form: FormData) {
  const v = await requireViewer("/account");
  if (!v.user) redirect("/account?pw=owner");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (!(await verifyPassword(current, v.user.password_hash))) redirect("/account?pw=wrong");
  if (passwordProblem(next)) redirect("/account?pw=short");
  // New password signs out every other device
  const u = await q1<User>(`UPDATE users SET password_hash = $2, session_version = session_version + 1 WHERE id = $1 RETURNING *`, [v.user.id, await hashPassword(next)]);
  if (u) await startSession({ uid: String(u.id), role: u.role, ver: u.session_version }, u.prefs);
  redirect("/account?pw=ok");
}

export async function signOutEverywhereAction() {
  const v = await requireViewer("/account");
  if (v.user) await q(`UPDATE users SET session_version = session_version + 1 WHERE id = $1`, [v.user.id]);
  await endSession();
  redirect("/login");
}

export async function deleteAccountAction(form: FormData) {
  const v = await requireViewer("/account");
  if (!v.user || form.get("confirm") !== "DELETE") redirect("/account?del=confirm");
  if (v.user.subscription_id && stripeConfigured()) {
    try {
      await stripe().subscriptions.cancel(v.user.subscription_id);
    } catch {
      /* already cancelled */
    }
  }
  await logEvent("account_deleted", null, { email_domain: v.user.email.split("@")[1] });
  await q(`DELETE FROM users WHERE id = $1`, [v.user.id]);
  await endSession();
  redirect("/?deleted=1");
}

/** Quick show/hide of sport sections from the league bar filter (no redirect). */
export async function setHiddenSectionsAction(hiddenSections: string[]) {
  const v = await requireViewer("/app");
  const sections = new Set(AREAS.filter((a) => a.kind === "section").map((a) => a.id));
  const want = hiddenSections.filter((id) => sections.has(id));
  if (want.length >= sections.size) want.pop(); // keep at least one visible
  const keepFeatures = (v.prefs.hidden ?? []).filter((id) => !sections.has(id));
  const prefs: Prefs = { ...v.prefs, hidden: [...keepFeatures, ...want] };
  if (v.user) await savePrefs(v.user.id, prefs);
  writePrefCookies(await cookies(), prefs);
}
