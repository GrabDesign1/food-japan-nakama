import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nakama.food-japan-summit.jp";

// 会員専用・APIはクロール不可。公開ページはすべて許可。
const DISALLOW = [
  "/dashboard",
  "/profile",
  "/ledger",
  "/deals",
  "/projects",
  "/messages",
  "/billing",
  "/admin",
  "/search",
  "/api/",
  "/auth/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      // AIO: AI検索・AIアシスタントのクローラを明示的に許可（公開ページのみ）
      { userAgent: "GPTBot", allow: "/", disallow: DISALLOW },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: DISALLOW },
      { userAgent: "ChatGPT-User", allow: "/", disallow: DISALLOW },
      { userAgent: "ClaudeBot", allow: "/", disallow: DISALLOW },
      { userAgent: "Claude-User", allow: "/", disallow: DISALLOW },
      { userAgent: "PerplexityBot", allow: "/", disallow: DISALLOW },
      { userAgent: "Perplexity-User", allow: "/", disallow: DISALLOW },
      { userAgent: "Google-Extended", allow: "/", disallow: DISALLOW },
      { userAgent: "Applebot-Extended", allow: "/", disallow: DISALLOW },
      { userAgent: "meta-externalagent", allow: "/", disallow: DISALLOW },
      { userAgent: "CCBot", allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
