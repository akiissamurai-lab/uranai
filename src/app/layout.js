import "./globals.css";
import SupabaseErrorBoundary from "@/components/SupabaseErrorBoundary";

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
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0 }}>
        <SupabaseErrorBoundary>{children}</SupabaseErrorBoundary>
      </body>
    </html>
  );
}
