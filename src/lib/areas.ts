// Areas a member can show or hide (Settings → Areas). Pure — used on client and server.

export interface Area {
  id: string;
  label: string;
  href: string;
  kind: "section" | "feature";
}

export const AREAS: Area[] = [
  { id: "nba", label: "NBA", href: "/nba", kind: "section" },
  { id: "nbl", label: "NBL", href: "/nbl", kind: "section" },
  { id: "nrl", label: "NRL", href: "/sport/nrl", kind: "section" },
  { id: "super-rugby", label: "Super Rugby", href: "/sport/super-rugby", kind: "section" },
  { id: "all-blacks", label: "All Blacks", href: "/sport/all-blacks", kind: "section" },
  { id: "a-league", label: "A-League", href: "/sport/a-league", kind: "section" },
  { id: "anz-premiership", label: "ANZ Premiership", href: "/sport/anz-premiership", kind: "section" },
  { id: "cricket", label: "Cricket (world)", href: "/cricket", kind: "section" },
  { id: "super-smash", label: "Super Smash", href: "/cricket/super-smash", kind: "section" },
  { id: "ultimate", label: "The Ultimate Bet button", href: "", kind: "feature" },
  { id: "odds", label: "Odds check (basketball)", href: "", kind: "feature" },
  { id: "tracking", label: "NBA.com tracking", href: "", kind: "feature" },
  { id: "multi", label: "Multi builder bet slip", href: "", kind: "feature" },
];

export type Theme = "dark" | "light" | "system";

export interface Prefs {
  theme?: Theme;
  hidden?: string[];
  home?: string; // area id opened after login
}

export const THEME_COOKIE = "cs_theme";
export const HIDDEN_COOKIE = "cs_hidden";

export const visibleSections = (hidden: string[] = []) => AREAS.filter((a) => a.kind === "section" && !hidden.includes(a.id));

/** Parse the hidden-areas cookie ("nba,nbl"). */
export const parseHidden = (v: string | undefined) => (v ? v.split(",").filter((x) => AREAS.some((a) => a.id === x)) : []);
