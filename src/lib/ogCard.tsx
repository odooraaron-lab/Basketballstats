// Shared 1200×630 social card for blog posts and feature pages.
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

export function ogCard({ kicker, title, foot }: { kicker: string; title: string; foot: string }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a140f", padding: 64, color: "#f4f7f3", borderBottom: "14px solid #f4c430" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 56, borderRadius: 4, background: "#f4c430", color: "#0a140f", fontSize: 26, fontWeight: 900 }}>QR</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>Quick Read</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#f4c430" }}>{kicker}</div>
          <div style={{ display: "flex", fontSize: title.length > 70 ? 54 : 64, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#92a89a" }}>{foot}</div>
      </div>
    ),
    OG_SIZE,
  );
}
