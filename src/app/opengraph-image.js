import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ダツデブ — AI PFC × Budget Tracker";
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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a1a 0%, #0d1117 40%, #0f1923 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background orbs */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(74,222,128,0.08), transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,139,250,0.06), transparent 70%)",
          }}
        />

        {/* Icon: circular gauge + bolt */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 28,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 32,
          }}
        >
          <svg width="80" height="80" viewBox="0 0 512 512">
            <circle cx="256" cy="256" r="148" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="28" />
            <circle
              cx="256" cy="256" r="148" fill="none" stroke="url(#og_grad)" strokeWidth="28"
              strokeLinecap="round" strokeDasharray="698" strokeDashoffset="175"
              transform="rotate(-90 256 256)"
            />
            <path d="M 272 183 L 232 260 L 268 260 L 240 336" fill="none" stroke="url(#og_grad)" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="og_grad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="60%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-1px",
            marginBottom: 12,
          }}
        >
          ダツデブ
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "3px",
            display: "flex",
            gap: 8,
          }}
        >
          <span style={{ color: "#a78bfa" }}>AI PFC</span>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>×</span>
          <span style={{ color: "#4ade80" }}>BUDGET TRACKER</span>
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 36,
          }}
        >
          {["⚡ 爆速マクロ記録", "🤖 AI自動推測", "💰 食費最適化"].map(
            (text) => (
              <div
                key={text}
                style={{
                  padding: "8px 20px",
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                {text}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
