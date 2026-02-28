import "./globals.css";
import { Inter, Noto_Sans_JP, Space_Mono } from "next/font/google";
import SupabaseErrorBoundary from "@/components/SupabaseErrorBoundary";
import BottomNav from "@/components/BottomNav";

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
  title: "マクロ飯ビルダー",
  description: "AI Macro × Budget Optimizer",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable} ${spaceMono.variable}`}>
      <body style={{ margin: 0 }}>
        <SupabaseErrorBoundary>
          {children}
          <BottomNav />
        </SupabaseErrorBoundary>
      </body>
    </html>
  );
}
