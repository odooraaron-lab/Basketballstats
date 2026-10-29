import type { MetadataRoute } from "next";
import { site } from "@/site.config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/blog/", "/features", "/tools/"], disallow: ["/api/", "/admin", "/account", "/app", "/nba", "/nbl", "/sport/", "/cricket", "/login", "/reset", "/forgot"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
