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
  title: "FOOD JAPAN NAKAMA｜あなたの食材・素材・サービスを探している人と出会う",
  description:
    "全国の食品メーカー、飲食店、小売、加工会社などが募集する食材・原料・商品を確認し、直接提案できます。商品の掲載・案件の閲覧・届いた問い合わせへの返信は無料。事務局による相手探し、商談、実証・事業化支援は個別契約です。",
  // 各ページのURLをそのままcanonicalにする（相対指定はページごとに解決される）
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: "FOOD JAPAN NAKAMA",
    locale: "ja_JP",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "FOOD JAPAN NAKAMA｜あなたの食材・素材・サービスを探している人と出会う" }],
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
