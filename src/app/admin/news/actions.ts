"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { classify, SPORT_LABEL, type SportTag } from "@/lib/news/core";
import { addPost, fetchMeta, runNewsIngest, updatePost } from "@/lib/news/store";

export async function runNowAction() {
  await requireAdmin();
  await runNewsIngest({ force: true, reason: "admin" });
  revalidatePath("/admin/news");
  revalidatePath("/news");
}

export async function postAction(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const op = String(form.get("op"));
  if (!id) return;
  if (op === "hide") await updatePost(id, { status: "hidden" });
  if (op === "show") await updatePost(id, { status: "live" });
  if (op === "pin") await updatePost(id, { pinned: true });
  if (op === "unpin") await updatePost(id, { pinned: false });
  revalidatePath("/admin/news");
  revalidatePath("/news");
}

/** Add a story by URL: reads its title, summary and picture from the page. */
export async function addLinkAction(form: FormData) {
  await requireAdmin();
  const url = String(form.get("url") ?? "").trim();
  const chosen = form.getAll("sport").map(String).filter((s) => s in SPORT_LABEL) as SportTag[];
  let msg = "added";
  try {
    const m = await fetchMeta(url);
    if (!m.title) throw new Error("Couldn't read a headline from that page.");
    const sports = chosen.length ? chosen : classify(`${m.title} ${m.summary}`);
    if (!sports.length) throw new Error("Pick at least one sport for this story.");
    const ok = await addPost({ url, title: m.title, summary: m.summary || null, image: m.image || null, source: m.source, kind: "article", published_at: m.published_at, sports }, "admin");
    if (!ok) msg = "duplicate";
  } catch (e) {
    msg = `error:${(e as Error).message}`.slice(0, 160);
  }
  revalidatePath("/news");
  redirect(`/admin/news?msg=${encodeURIComponent(msg)}`);
}
