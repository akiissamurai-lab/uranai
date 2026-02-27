export const metadata = {
  title: "マクロ飯ビルダー",
  description: "AI Macro × Budget Optimizer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
