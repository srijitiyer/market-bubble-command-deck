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
            "radial-gradient(1100px 700px at 14% -12%, #1c1a16, #070707 62%)",
          color: "#edeae3",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 36% 30%, #fefdfb, #ece3d0 34%, #bcab86 70%, #6f6450)",
              boxShadow: "0 0 60px rgba(233,225,209,0.45)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: -1 }}>
              Market Bubble
            </div>
            <div
              style={{
                fontSize: 22,
                fontStyle: "italic",
                color: "#cabba0",
              }}
            >
              Presented by Polymarket
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>
            One live feed for
          </div>
          <div
            style={{
              display: "flex",
              gap: 18,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <span style={{ fontSize: 64, fontWeight: 700, color: "#9a7fd0" }}>
              Twitch
            </span>
            <span style={{ fontSize: 64, fontWeight: 700, color: "#5b5852" }}>·</span>
            <span style={{ fontSize: 64, fontWeight: 700, color: "#74bf6a" }}>
              Kick
            </span>
            <span style={{ fontSize: 64, fontWeight: 700, color: "#5b5852" }}>·</span>
            <span style={{ fontSize: 64, fontWeight: 700, color: "#e7e9ea" }}>X</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: 26, color: "#a7a49e" }}>
            Merge every chat. Watch every stream. Source-labeled, real-time.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#cabba0",
              border: "1px solid rgba(233,225,209,0.35)",
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
