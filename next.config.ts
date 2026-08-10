import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 画像アップロード（バナー・プロフィール等）はServer Action経由。
    // 本番(Vercel)の既定1MB上限だと5MB画像で失敗するため引き上げる。
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  // next/image でSupabase Storageの画像を最適化配信するための許可リスト
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zbyxhtswjrrhlcnzouew.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // セキュリティヘッダ（Phase 6・2026-08-11）。
  // クリックジャッキング・MIMEスニッフィング・Referer漏れを止める。
  // CSP は既存の表示を壊さないよう Report-Only で開始し、違反が出ないことを確認してから強制に切り替える。
  async headers() {
    const supabase = "https://zbyxhtswjrrhlcnzouew.supabase.co";
    const cspReportOnly = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${supabase}`,
      `connect-src 'self' ${supabase} https://api.stripe.com`,
      "font-src 'self' data:",
      "frame-src https://js.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          // 埋め込み禁止（管理画面・決済画面のクリックジャッキング対策）
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
        ],
      },
    ];
  },
  // SEO: vercel.appドメインでの重複コンテンツを避け、正規ドメインへ301
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "food-japan-nakama.vercel.app" }],
        destination: "https://nakama.food-japan-summit.jp/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
