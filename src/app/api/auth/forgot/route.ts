import { dbConfigured, logEvent, q } from "@/lib/db";
import { emailShell, sendEmail } from "@/lib/email";
import { back, slow } from "@/lib/http";
import { randomToken, sha256 } from "@/lib/password";
import { findUserByEmail } from "@/lib/users";
import { site } from "@/site.config";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim();
  if (dbConfigured()) {
    const user = await findUserByEmail(email);
    if (user) {
      const token = randomToken();
      await q(`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')`, [sha256(token), user.id]);
      const link = `${site.url}/reset?token=${token}`;
      await sendEmail(
        user.email,
        `Reset your ${site.name} password`,
        emailShell("Reset your password", `<p>Someone (hopefully you) asked to reset your password. This link works for one hour:</p><p><a href="${link}">${link}</a></p><p>If it wasn't you, ignore this email.</p>`),
      );
      await logEvent("password_reset_requested", user.id);
    } else await slow();
  }
  // Same answer either way, so the form can't be used to find out who has an account.
  return back(req, "/forgot", { sent: "1" });
}
