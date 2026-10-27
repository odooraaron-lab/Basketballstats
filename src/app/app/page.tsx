import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AREAS, visibleSections } from "@/lib/areas";
import { requireMember } from "@/lib/session";

export const dynamic = "force-dynamic";

/** After login: the member's chosen home area, else the last one they used, else the first visible. */
export default async function AppHome() {
  const v = await requireMember("/app");
  const hidden = v.prefs.hidden ?? [];
  const pick = (id?: string) => AREAS.find((a) => a.id === id && a.kind === "section" && !hidden.includes(a.id));
  const last = (await cookies()).get("league")?.value;
  const target = pick(v.prefs.home) ?? pick(last) ?? visibleSections(hidden)[0] ?? AREAS[0];
  redirect(target.href);
}
