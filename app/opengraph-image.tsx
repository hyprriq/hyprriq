import { ImageResponse } from "next/og";

// ── THE DEFAULT OG CARD — brand navy, the wordmark, the one-line promise. Every page inherits it
// through the root metadata; a page that wants its own card adds its own opengraph-image. Colors
// are the ruled brand tokens (globals.css: --color-brand #173e63 / --color-brand-ink #0e2b47).
export const runtime = "edge";
export const alt = "HyprrIQ — Source intelligence for Amazon wholesale";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          background: "linear-gradient(135deg, #0e2b47 0%, #173e63 100%)",
          color: "#ffffff",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#ffffff",
              color: "#173e63",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            H
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.5px" }}>HyprrIQ</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-1px", maxWidth: 980 }}>
            Know your supplier before you wire the money.
          </div>
          <div style={{ fontSize: 30, color: "#c7d5e2", maxWidth: 900, lineHeight: 1.35 }}>
            A structured verdict, the evidence behind it, and the exact questions to ask — within 24 hours.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#9fb3c6" }}>
          <div>hyprriq.com</div>
          <div>Vendor due diligence for Amazon wholesale</div>
        </div>
      </div>
    ),
    size,
  );
}
