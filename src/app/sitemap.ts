import type { MetadataRoute } from "next";
import { POSTS, ZONES } from "@/content/blog";
import { site } from "@/site.config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${site.url}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/signup`, changeFrequency: "monthly", priority: 0.6 },
    ...ZONES.map((z) => ({ url: `${site.url}/blog/sport/${z.id}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...POSTS.map((p) => ({ url: `${site.url}/blog/${p.slug}`, lastModified: new Date(p.date), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...["terms", "privacy", "responsible-gambling"].map((p) => ({ url: `${site.url}/${p}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
