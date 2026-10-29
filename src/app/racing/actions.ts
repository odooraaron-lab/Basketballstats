"use server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/session";
import { setFollow, type PersonKind } from "@/lib/racing/store";

/** Follow / unfollow a horse, jockey or trainer. The owner login (no member row) uses id 0. */
export async function toggleFollowAction(form: FormData) {
  const v = await getViewer();
  if (!v?.hasAccess) return;
  const kind = String(form.get("kind")) as PersonKind;
  if (!["horse", "jockey", "trainer"].includes(kind)) return;
  const key = String(form.get("key") ?? "").slice(0, 80);
  const name = String(form.get("name") ?? "").slice(0, 120);
  const on = form.get("on") === "1";
  if (!key) return;
  await setFollow(v.user?.id ?? 0, { kind, key, name }, on);
  revalidatePath(String(form.get("back") ?? "/racing/tracking"));
}
