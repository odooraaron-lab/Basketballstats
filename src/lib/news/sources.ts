// Where the sports news finder looks. Every story is tagged with our sports by keyword; stories
// that match none of them are dropped. Sport-specific feeds pass `sports` so their stories are
// tagged even when the headline doesn't name the competition.
import type { SourceHint, SportTag } from "./core";

export type Source =
  | (SourceHint & { id: string; type: "rss"; url: string; fallbacks?: string[]; enabled?: boolean })
  | { id: string; type: "gnews"; name: string; queries: string[]; sports?: SportTag[]; region?: "NZ" | "AU" | "US" | "GB" | "IN"; enabled?: boolean };

export const SOURCES: Source[] = [
  // New Zealand newsrooms
  { id: "rnz-sport", type: "rss", name: "RNZ", url: "https://www.rnz.co.nz/rss/sport.xml" },
  { id: "nzherald-sport", type: "rss", name: "NZ Herald", url: "https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/sport/?outputType=xml&_website=nzh" },
  { id: "nz-search", type: "gnews", name: "NZ news search", region: "NZ", queries: ["site:1news.co.nz sport", "site:stuff.co.nz sport", "site:newstalkzb.co.nz sport", "site:thespinoff.co.nz sport"] },

  // Rugby
  { id: "guardian-rugby", type: "rss", name: "The Guardian", url: "https://www.theguardian.com/sport/rugby-union/rss" },
  { id: "allblacks-search", type: "gnews", name: "News search", region: "NZ", sports: ["all-blacks"], queries: ["All Blacks", "All Blacks Nations Championship"] },
  { id: "super-rugby-search", type: "gnews", name: "News search", region: "NZ", sports: ["super-rugby"], queries: ["Super Rugby Pacific"] },
  { id: "planet-rugby", type: "rss", name: "Planet Rugby", url: "https://www.planetrugby.com/feed" },

  // Rugby league
  { id: "guardian-league", type: "rss", name: "The Guardian", url: "https://www.theguardian.com/sport/rugbyleague/rss", sports: ["nrl"] },
  { id: "nrl-search", type: "gnews", name: "News search", region: "NZ", sports: ["nrl"], queries: ["NRL Warriors", "NRL"] },

  // Netball, football
  { id: "netball-search", type: "gnews", name: "News search", region: "NZ", sports: ["netball"], queries: ["Silver Ferns netball", "ANZ Premiership netball"] },
  { id: "guardian-netball", type: "rss", name: "The Guardian", url: "https://www.theguardian.com/sport/netball/rss", sports: ["netball"] },
  { id: "guardian-aleague", type: "rss", name: "The Guardian", url: "https://www.theguardian.com/football/a-league/rss", sports: ["a-league"] },
  { id: "aleague-search", type: "gnews", name: "News search", region: "NZ", sports: ["a-league"], queries: ["Wellington Phoenix", "Auckland FC A-League"] },

  // Cricket
  { id: "cricinfo", type: "rss", name: "ESPNcricinfo", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", sports: ["cricket"] },
  { id: "guardian-cricket", type: "rss", name: "The Guardian", url: "https://www.theguardian.com/sport/cricket/rss", sports: ["cricket"] },
  { id: "cricket-search", type: "gnews", name: "News search", region: "NZ", sports: ["cricket"], queries: ["Black Caps cricket", "Super Smash cricket", "White Ferns"] },

  // Basketball
  { id: "espn-nba", type: "rss", name: "ESPN", url: "https://www.espn.com/espn/rss/nba/news", sports: ["nba"] },
  { id: "guardian-nba", type: "rss", name: "The Guardian", url: "https://www.theguardian.com/sport/nba/rss", sports: ["nba"] },
  { id: "nbl-search", type: "gnews", name: "News search", region: "AU", sports: ["nbl"], queries: ["NBL basketball", "NZ Breakers"] },

  // Racing
  { id: "guardian-racing", type: "rss", name: "The Guardian", url: "https://www.theguardian.com/sport/horse-racing/rss", sports: ["racing"] },
  { id: "racing-search", type: "gnews", name: "News search", region: "NZ", sports: ["racing"], queries: ["New Zealand horse racing", "harness racing New Zealand", "site:loveracing.nz", "Melbourne Cup"] },

  // Blogs and opinion from around the world
  { id: "the-roar", type: "rss", name: "The Roar", url: "https://www.theroar.com.au/feed/", kind: "blog" },
  { id: "blog-search", type: "gnews", name: "Blog search", region: "NZ", queries: ["All Blacks blog analysis", "NRL Warriors analysis column", "Black Caps column"] },
];

export const sourceById = (id: string) => SOURCES.find((s) => s.id === id);
