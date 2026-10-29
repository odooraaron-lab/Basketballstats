import { featureBySlug } from "@/content/features";
import { OG_SIZE, ogCard } from "@/lib/ogCard";
import { priceLabel } from "@/site.config";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Quick Read feature";

export default async function Image({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const { slug } = await Promise.resolve(params);
  const f = featureBySlug(slug);
  return ogCard({ kicker: f?.kicker ?? "Quick Read", title: f?.h1 ?? "Live sports stats & betting tools", foot: `Every sport, every tool · ${priceLabel}/month · NZ & AU` });
}
