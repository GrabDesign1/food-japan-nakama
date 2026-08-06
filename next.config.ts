import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 画像アップロード（バナー・プロフィール等）はServer Action経由。
    // 本番(Vercel)の既定1MB上限だと5MB画像で失敗するため引き上げる。
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
