import { dbConfigured, q, q1 } from "@/lib/db";
import { back } from "@/lib/http";
import { hashPassword, passwordProblem, sha256 } from "@/lib/password";
import { startSession } from "@/lib/session";
import type { User } from "@/lib/users";

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!dbConfigured() || !token) return back(req, "/forgot");
  if (passwordProblem(password)) return back(req, "/reset", { token, error: "password" });
  const row = await q1<{ user_id: number }>(
    `UPDATE password_resets SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING user_id`,
    [sha256(token)],
  );
  if (!row) return back(req, "/forgot", { expired: "1" });
  // New password + sign out every other device
  const user = await q1<User>(`UPDATE users SET password_hash = $2, session_version = session_version + 1 WHERE id = $1 RETURNING *`, [row.user_id, await hashPassword(password)]);
  if (!user) return back(req, "/forgot");
  await startSession({ uid: String(user.id), role: user.role, ver: user.session_version }, user.prefs ?? {});
  return back(req, "/app");
}
