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
