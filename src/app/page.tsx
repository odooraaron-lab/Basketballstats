import { redirect } from "next/navigation";
import { DEFAULT_LEAGUE } from "@/leagues/registry";

export default function Home() {
  redirect(`/${DEFAULT_LEAGUE}`);
}
