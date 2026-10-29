import { Profile } from "@/components/racing/Profile";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <Profile kind="jockey" slug={(await params).slug} />;
}
