import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aira｜余白便り — 寝る前に、心がほどける一通",
  description:
    "寝る前に、心がほどける一通。星座を選ぶだけで届く、やさしい手紙。答えじゃなく、余白がほしい夜に。",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://uranai-ten.vercel.app"),
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Aira｜余白便り — 寝る前に、心がほどける一通",
    description:
      "星座を選ぶだけで届く、やさしい手紙。答えじゃなく、余白がほしい夜に。ログイン不要で、今日のあなたに小さな手紙が届きます。",
    siteName: "Aira｜余白便り",
    locale: "ja_JP",
    type: "website",
    url: "/",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Aira｜余白便り",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aira｜余白便り — 寝る前に、心がほどける一通",
    description:
      "星座を選ぶだけで届く、やさしい手紙。答えじゃなく、余白がほしい夜に。",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Aira｜余白便り",
      },
    ],
  },
  verification: {
    google: "xccOfwL_XFWfigZqCYHxDcXj594lfO70WftcTX-8or8",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="ambient-glow" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
