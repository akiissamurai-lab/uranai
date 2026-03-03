/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js が inline script を使用
              "style-src 'self' 'unsafe-inline'",                   // inline style 使用のため
              "img-src 'self' data: blob:",                         // html2canvas + share card
              "font-src 'self' data:",                              // Geist Mono / Inter / Noto Sans JP
              "connect-src 'self' https://*.supabase.co",           // Supabase API
              "frame-ancestors 'none'",                             // X-Frame-Options 強化
            ].join("; "),
          },
        ],
      },
      {
        // API ルートには追加で CORS 制限
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Access-Control-Allow-Methods", value: "POST" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
