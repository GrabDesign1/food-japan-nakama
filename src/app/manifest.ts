/**
 * 【PWA の manifest】2026-11-28 ユーザー指示「① PWA（ホーム画面に追加）を着手」。
 *
 * これがあると、スマホの「ホーム画面に追加」でアイコンが並び、全画面（ブラウザのバーなし）で開く。
 * ⚠️⚠️ **iPhone でプッシュ通知が届くのは、ホーム画面に追加したときだけ**（iOS 16.4〜）。
 *    Safari のタブで開いているあいだは届かない。案内文でもそう書くこと。
 *
 * ⚠️⚠️ `/manifest.webmanifest` と `/sw.js` と `/icons` は **middleware の PUBLIC_PATHS に入れてある**。
 *    端末はログイン前にこれらを取りに来るので、ログインへ飛ばすとインストールできない。
 *
 * ⚠️ start_url は `/dashboard`。未ログインなら middleware が `/login` へ送る（それで正しい）。
 * ⚠️ アイコンは白地で作ってある（`public/icons`）。透過のままだと iOS で黒く出る。
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FOOD JAPAN NAKAMA",
    short_name: "NAKAMA",
    description: "食の出会いを、共創と継続的な事業へ。",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // ⚠️ 起動直後の背景。`.app-tone` の surface に合わせている（白に近い中立色）
    background_color: "#fdfbfa",
    // ⚠️ Android の上部バーの色。ブランドの赤（--md-sys-color-primary）
    theme_color: "#b8272d",
    lang: "ja",
    categories: ["business", "food"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // ⚠️ Android は角を好きな形に切る。切られても欠けないよう、余白を多めに取った別画像を渡す
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
