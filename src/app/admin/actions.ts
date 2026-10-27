"use server";
import { revalidatePath } from "next/cache";
import { logEvent, q } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function memberAction(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const act = String(form.get("act"));
  if (!id) return;
  if (act === "comp30") await q(`UPDATE users SET comp_until = GREATEST(COALESCE(comp_until, now()), now()) + interval '30 days' WHERE id = $1`, [id]);
  if (act === "comp365") await q(`UPDATE users SET comp_until = GREATEST(COALESCE(comp_until, now()), now()) + interval '365 days' WHERE id = $1`, [id]);
  if (act === "uncomp") await q(`UPDATE users SET comp_until = NULL WHERE id = $1`, [id]);
  if (act === "admin") await q(`UPDATE users SET role = 'admin', session_version = session_version + 1 WHERE id = $1`, [id]);
  if (act === "member") await q(`UPDATE users SET role = 'member', session_version = session_version + 1 WHERE id = $1`, [id]);
  if (act === "signout") await q(`UPDATE users SET session_version = session_version + 1 WHERE id = $1`, [id]);
  await logEvent(`admin_${act}`, id);
  revalidatePath("/admin/members");
}

export async function setupDbAction() {
  await requireAdmin();
  await q(`SELECT 1`); // ensureSchema runs first
  revalidatePath("/admin/setup");
}
