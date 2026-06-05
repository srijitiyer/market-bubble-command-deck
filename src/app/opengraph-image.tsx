import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Market Bubble Command Deck — one live feed for Twitch, Kick and X";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "radial-gradient(1100px 700px at 12% -10%, #2a1147, #06070b 60%), radial-gradient(900px 600px at 100% 0%, #131a3a, transparent 55%)",
          color: "#eef1f6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 36% 30%, #f0d9ff, #c98bff 32%, #8a3df0 68%, #4a1d8f)",
              boxShadow: "0 0 60px rgba(177,108,255,0.6)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, color: "#99a0ad", letterSpacing: 2 }}>
              MARKET BUBBLE
            </div>
            <div style={{ fontSize: 40, fontWeight: 700 }}>Command Deck</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 74, fontWeight: 800, lineHeight: 1.05 }}>
            One live feed for
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <span
              style={{
                fontSize: 74,
                fontWeight: 800,
                color: "#a970ff",
              }}
            >
              Twitch
            </span>
            <span style={{ fontSize: 74, fontWeight: 800, color: "#5b616e" }}>
              ·
            </span>
            <span style={{ fontSize: 74, fontWeight: 800, color: "#53fc18" }}>
              Kick
            </span>
            <span style={{ fontSize: 74, fontWeight: 800, color: "#5b616e" }}>
              ·
            </span>
            <span style={{ fontSize: 74, fontWeight: 800, color: "#e7e9ea" }}>
              X
            </span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 28, color: "#99a0ad" }}>
            Merge every chat. Watch every stream. Source-labeled, real-time.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "#b16cff",
              border: "1px solid rgba(177,108,255,0.4)",
              borderRadius: 999,
              padding: "10px 22px",
            }}
          >
            Vibe Code Challenge
          </div>
        </div>
      </div>
    ),
    size,
  );
}
