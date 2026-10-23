import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_LEAGUE, LEAGUES } from "@/leagues/registry";

export default async function Home() {
  // Open whichever league was picked last in the switcher.
  const last = (await cookies()).get("league")?.value;
  if (last === "cricket") redirect("/cricket");
  redirect(`/${last && LEAGUES[last] ? last : DEFAULT_LEAGUE}`);
}
