import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Aira｜余白便り — 今日のあなたに、小さな手紙を";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
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
          backgroundColor: "#0a0a0a",
          padding: "60px",
        }}
      >
        {/* アクセントライン */}
        <div
          style={{
            width: 60,
            height: 3,
            backgroundColor: "#d97706",
            marginBottom: 32,
            borderRadius: 2,
          }}
        />

        {/* タイトル */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#fef3c7",
            letterSpacing: "0.05em",
          }}
        >
          Aira
        </div>

        {/* サブタイトル */}
        <div
          style={{
            fontSize: 28,
            color: "#d97706",
            marginTop: 12,
          }}
        >
          余白便り
        </div>

        {/* 説明文 */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(254, 243, 199, 0.5)",
            marginTop: 32,
          }}
        >
          星座を選ぶだけ。毎日届く、やさしい占い。
        </div>
      </div>
    ),
    { ...size },
  );
}
