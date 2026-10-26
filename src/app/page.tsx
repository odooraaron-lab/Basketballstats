import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getComp } from "@/sports/comps";
import { DEFAULT_LEAGUE, LEAGUES } from "@/leagues/registry";

export default async function Home() {
  // Open whichever league was picked last in the switcher.
  const last = (await cookies()).get("league")?.value;
  if (last === "cricket") redirect("/cricket");
  if (last === "super-smash") redirect("/cricket/super-smash");
  if (last && getComp(last)) redirect(`/sport/${last}`);
  redirect(`/${last && LEAGUES[last] ? last : DEFAULT_LEAGUE}`);
}
