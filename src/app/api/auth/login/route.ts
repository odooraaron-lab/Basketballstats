import { authConfigured, checkOwnerCredentials } from "@/lib/auth";
import { dbConfigured, logEvent, q } from "@/lib/db";
import { back, safeNext, slow } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { startSession } from "@/lib/session";
import { findUserByEmail } from "@/lib/users";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = safeNext(form.get("next"));
  if (!authConfigured()) return back(req, "/login", { error: "config" });

  // Site owner (environment login) — always admin, works even before the database is set up.
  if (checkOwnerCredentials(email, password)) {
    await startSession({ uid: "owner", role: "admin", ver: 1 });
    return back(req, next);
  }
  if (!dbConfigured()) {
    await slow();
    return back(req, "/login", { error: "1", next });
  }
  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await slow();
    return back(req, "/login", { error: "1", next, email });
  }
  await q(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);
  await logEvent("login", user.id);
  await startSession({ uid: String(user.id), role: user.role, ver: user.session_version }, user.prefs ?? {});
  return back(req, next);
}
