// Shared 1200×630 social card for blog posts and feature pages.
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

export function ogCard({ kicker, title, foot }: { kicker: string; title: string; foot: string }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(135deg, #0b0d10 0%, #14181e 60%, #3a1d0b 100%)", padding: 64, color: "#f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 12, background: "#f26b1d", color: "#0b0d10", fontSize: 26, fontWeight: 800 }}>QR</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: 1 }}>
            QUICK&nbsp;<span style={{ color: "#f26b1d" }}>READ</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#f26b1d", textTransform: "uppercase", letterSpacing: 2 }}>{kicker}</div>
          <div style={{ display: "flex", fontSize: title.length > 70 ? 54 : 64, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#9ca3af" }}>{foot}</div>
      </div>
    ),
    OG_SIZE,
  );
}
