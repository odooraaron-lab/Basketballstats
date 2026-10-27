import { cookies } from "next/headers";
import { authConfigured } from "@/lib/auth";
import { dbConfigured, logEvent } from "@/lib/db";
import { back, slow } from "@/lib/http";
import { hashPassword, passwordProblem } from "@/lib/password";
import { startSession } from "@/lib/session";
import { createUser, findUserByEmail, validEmail } from "@/lib/users";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const adult = form.get("adult") === "on";
  const terms = form.get("terms") === "on";
  const keep = { email, name };

  if (!authConfigured() || !dbConfigured()) return back(req, "/signup", { error: "config", ...keep });
  if (!validEmail(email)) return back(req, "/signup", { error: "email", ...keep });
  const pwErr = passwordProblem(password);
  if (pwErr) return back(req, "/signup", { error: "password", ...keep });
  if (!adult || !terms) return back(req, "/signup", { error: "terms", ...keep });
  if (await findUserByEmail(email)) {
    await slow();
    return back(req, "/signup", { error: "exists", ...keep });
  }

  // First-touch attribution captured by the tracker (utm / referrer / landing page)
  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(decodeURIComponent((await cookies()).get("cs_src")?.value ?? "{}"));
  } catch {
    /* ignore */
  }
  const user = await createUser(email, await hashPassword(password), name, meta);
  if (!user) return back(req, "/signup", { error: "server", ...keep });
  await logEvent("signup", user.id, meta);
  await startSession({ uid: String(user.id), role: user.role, ver: user.session_version });
  return back(req, "/account/billing", { welcome: "1" });
}
