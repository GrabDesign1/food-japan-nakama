import type { Metadata } from "next";
import { Noto_Sans_JP, Roboto } from "next/font/google";
import "./globals.css";

// 和文フォント：Noto Sans JP
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// 欧文フォント：Roboto
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nakama.food-japan-summit.jp";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "FOOD JAPAN NAKAMA｜食の課題を、全国のNAKAMAと事業に変える共創プラットフォーム",
  description:
    "生産者、食品メーカー、小売、流通、飲食店、自治体、大学、専門家をつなぐ共創プラットフォーム。登録・掲載・応募は無料。事務局による共創テーマ設計、パートナー探索、商談、実証・事業化支援は個別契約で提供します。",
  // 各ページのURLをそのままcanonicalにする（相対指定はページごとに解決される）
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: "FOOD JAPAN NAKAMA",
    locale: "ja_JP",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "FOOD JAPAN NAKAMA｜食の課題を、全国のNAKAMAと事業に変える共創プラットフォーム" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.jpg"],
  },
  // サイト所有権の確認タグ（Bing Webmaster Tools。確認完了後も削除しない）
  verification: {
    other: { "msvalidate.01": "53A9B78DC52D0C4C5E9C7A7B9B4A982F" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${roboto.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
