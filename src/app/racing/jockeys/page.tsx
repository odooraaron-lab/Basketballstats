import { Leaderboard } from "@/components/racing/Leaderboard";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ days?: string; c?: string }> }) {
  return <Leaderboard kind="jockey" sp={await searchParams} />;
}
