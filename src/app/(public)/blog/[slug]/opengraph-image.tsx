import { postBySlug, zoneById } from "@/content/blog";
import { OG_SIZE, ogCard } from "@/lib/ogCard";
import { priceLabel } from "@/site.config";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Quick Read betting stats guide";

export default async function Image({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const { slug } = await Promise.resolve(params);
  const p = postBySlug(slug);
  return ogCard({ kicker: `${zoneById(p?.zone ?? "")?.label ?? "Guide"} · betting stats guide`, title: p?.title ?? "Betting stats guides", foot: `Live stats & betting tools for NZ sport · ${priceLabel}/month` });
}
