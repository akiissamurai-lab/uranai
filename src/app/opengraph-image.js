import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ダツデブ — AI PFC × Budget Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Subset font loader — fetches only needed glyphs as TTF (tiny & fast)
async function loadGoogleFont(family, weight, text) {
  const params = new URLSearchParams({ family: `${family}:wght@${weight}`, text });
  const url = `https://fonts.googleapis.com/css2?${params}`;
  // Use minimal UA to get TTF format (Satori doesn't support woff2)
  const css = await fetch(url, { headers: { "User-Agent": "Bot" } }).then((r) => r.text());
  const fontUrl = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
  if (!fontUrl) return null;
  return fetch(fontUrl).then((r) => r.arrayBuffer());
}

export default async function OgImage() {
  const jpChars = "ダツデブ爆速マクロ記録自動推測食費最適化";
  const enChars = "AIPFC×BUDGETTRACKERabcdefghijklmnopqrstuvwxyz0123456789";

  const [notoBlack, interBold] = await Promise.all([
    loadGoogleFont("Noto Sans JP", 900, jpChars).catch(() => null),
    loadGoogleFont("Inter", 700, enChars).catch(() => null),
  ]);

  const fonts = [];
  if (notoBlack) fonts.push({ name: "NotoSansJP", data: notoBlack, weight: 900, style: "normal" });
  if (interBold) fonts.push({ name: "Inter", data: interBold, weight: 700, style: "normal" });

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
          background: "#080810",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── Ambient orbs ── */}
        <div style={{ position: "absolute", top: -120, right: -60, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,0.07), transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -80, width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,139,250,0.06), transparent 65%)" }} />
        <div style={{ position: "absolute", top: "40%", left: "50%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.03), transparent 60%)", transform: "translate(-50%, -50%)" }} />

        {/* ── Top accent line ── */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent 5%, #a78bfa 30%, #22c55e 70%, transparent 95%)", opacity: 0.6 }} />

        {/* ── Icon ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: 28,
          }}
        >
          <svg width="52" height="52" viewBox="0 0 512 512">
            <defs>
              <linearGradient id="og_g" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="60%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
            </defs>
            <circle cx="256" cy="256" r="148" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="30" />
            <circle cx="256" cy="256" r="148" fill="none" stroke="url(#og_g)" strokeWidth="30" strokeLinecap="round" strokeDasharray="698" strokeDashoffset="175" transform="rotate(-90 256 256)" />
            <path d="M 272 183 L 232 260 L 268 260 L 240 336" fill="none" stroke="url(#og_g)" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* ── Title ── */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            fontFamily: notoBlack ? "NotoSansJP" : "sans-serif",
            color: "white",
            letterSpacing: "-2px",
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          ダツデブ
        </div>

        {/* ── Subtitle ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: interBold ? "Inter" : "monospace",
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: "6px",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "rgba(167,139,250,0.7)" }}>AI PFC</span>
          <span style={{ color: "rgba(255,255,255,0.12)", fontSize: 14, letterSpacing: 0 }}>×</span>
          <span style={{ color: "rgba(74,222,128,0.6)" }}>BUDGET TRACKER</span>
        </div>

        {/* ── Gradient divider ── */}
        <div style={{ width: 200, height: 1, margin: "32px 0 28px", background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.3), rgba(74,222,128,0.3), transparent)" }} />

        {/* ── Feature pills ── */}
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { text: "爆速マクロ記録", color: "rgba(251,191,36,0.5)" },
            { text: "AI自動推測", color: "rgba(167,139,250,0.5)" },
            { text: "食費最適化", color: "rgba(74,222,128,0.5)" },
          ].map((pill) => (
            <div
              key={pill.text}
              style={{
                padding: "6px 18px",
                borderRadius: 100,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: pill.color,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: notoBlack ? "NotoSansJP" : "sans-serif",
                letterSpacing: "1px",
              }}
            >
              {pill.text}
            </div>
          ))}
        </div>

        {/* ── Bottom accent line ── */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent 5%, #22c55e 30%, #a78bfa 70%, transparent 95%)", opacity: 0.4 }} />
      </div>
    ),
    {
      ...size,
      fonts,
    }
  );
}
