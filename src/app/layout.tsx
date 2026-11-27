import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "./ServiceWorker";
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
  // ⚠️ 2026-11-26 ユーザー指定の文言。出会いで止めず「継続的な事業へ」まで書く
  //    （サイトの意図＝出会いを続ける場所。トップ本文と対にしてある）
  title: "FOOD JAPAN NAKAMA｜食の出会いを、共創と継続的な事業へ",
  description:
    "全国の食品メーカー、飲食店、小売、加工会社などが募集する食材・原料・商品を確認し、直接提案できます。商品の掲載・案件の閲覧・問い合わせの送信は無料。事務局による相手探し、商談、実証・事業化支援は個別契約です。",
  // 各ページのURLをそのままcanonicalにする（相対指定はページごとに解決される）
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: "FOOD JAPAN NAKAMA",
    locale: "ja_JP",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "FOOD JAPAN NAKAMA｜食の出会いを、共創と継続的な事業へ" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.jpg"],
  },
  // サイト所有権の確認タグ（Bing Webmaster Tools。確認完了後も削除しない）
  verification: {
    other: { "msvalidate.01": "53A9B78DC52D0C4C5E9C7A7B9B4A982F" },
  },
  // PWA（2026-11-28）。⚠️ 中身は src/app/manifest.ts
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    // ⚠️⚠️ iPhone の「ホーム画面に追加」はこれを使う。白地の画像を渡すこと
    //    （透過のままだと黒い四角になる）
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "NAKAMA",
    // ⚠️ 上部バーは地の色になじませる（black-translucent にすると時計が本文に重なる）
    statusBarStyle: "default",
  },
};

/**
 * ⚠️ Android の上部バーの色。`metadata` ではなくこちらに置く決まり（Next.js 14 以降）。
 * ⚠️ viewportFit は iPhone のノッチ対策。
 */
export const viewport: Viewport = {
  themeColor: "#b8272d",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${roboto.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* ⚠️ Service Worker の登録。これが無いと「ホーム画面に追加」もプッシュも出ない */}
        <ServiceWorker />
      </body>
    </html>
  );
}
