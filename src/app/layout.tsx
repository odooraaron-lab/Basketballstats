import type { Metadata, Viewport } from "next";
import { Tracker } from "@/components/Tracker";
import { site } from "@/site.config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s | ${site.name}` },
  description:
    "Live sports stats, betting odds tools and a multi builder for NZ & Australia: NBA, NBL, NRL, Super Rugby, A-League, ANZ Premiership netball and cricket.",
  applicationName: site.name,
  openGraph: { siteName: site.name, type: "website", locale: "en_NZ" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0b0d10", width: "device-width", initialScale: 1 };

// Sets the saved theme before first paint (no flash). The cookie is written from Settings.
const themeScript = `try{var m=document.cookie.match(/(?:^|; )cs_theme=(dark|light|system)/);document.documentElement.dataset.theme=m?m[1]:"dark"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        {children}
        <Tracker />
      </body>
    </html>
  );
}
