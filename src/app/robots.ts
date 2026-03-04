import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://uranai-ten.vercel.app");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/app", "/billing", "/history", "/result/"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
