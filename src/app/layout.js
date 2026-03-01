import "./globals.css";
import { Inter, Noto_Sans_JP, Space_Mono } from "next/font/google";
import SupabaseErrorBoundary from "@/components/SupabaseErrorBoundary";
import BottomNav from "@/components/BottomNav";
import TermsGate from "@/components/TermsModal";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
  weight: ["400", "500", "700"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "700"],
});

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ダツデブ — AI PFC × Budget Tracker",
  description: "食品名を入力するだけでAIがPFC・価格を自動推測。マクロ管理と食費最適化を同時に実現する、摩擦ゼロの栄養管理アプリ。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ダツデブ",
  },
  icons: {
    icon: "/icon-512.svg",
    apple: "/icon-192.svg",
  },
  openGraph: {
    title: "ダツデブ — AI PFC × Budget Tracker",
    description: "食品名を入力するだけでAIがPFC・価格を自動推測。マクロ管理と食費最適化を同時に実現。",
    siteName: "ダツデブ",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ダツデブ — AI PFC × Budget Tracker",
    description: "食品名を入力するだけでAIがPFC・価格を自動推測。マクロ管理と食費最適化を同時に実現。",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0f",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable} ${spaceMono.variable}`}>
      <body style={{ margin: 0 }}>
        <SupabaseErrorBoundary>
          <TermsGate />
          {children}
          <BottomNav />
        </SupabaseErrorBoundary>
      </body>
    </html>
  );
}
