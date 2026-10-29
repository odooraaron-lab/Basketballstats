export type ZoneId = "nba" | "nbl" | "nrl" | "super-rugby" | "a-league" | "netball" | "cricket" | "super-smash" | "racing" | "all-blacks" | "betting-tools";

export interface Post {
  slug: string;
  zone: ZoneId;
  title: string;
  /** <title> tag; defaults to title */
  seoTitle?: string;
  description: string;
  date: string; // YYYY-MM-DD
  keywords: string[];
  /** Body: blank line between paragraphs, "## " / "### " headings, "- " bullets, "1. " numbered,
   *  "> " callout, **bold**, *italic*, [link](/path) */
  body: string;
  featured?: boolean;
}
