// コミュニティ投稿の定数（2026-11-21）。
// ⚠️ ここはクライアント（Composer）からも読み込む。
//    サーバー専用のもの（prisma, 環境変数, node:*）を**絶対に入れない**。
//    feed.ts は prisma を読むので、クライアントから import してはいけない。

/** 1投稿の本文の上限 */
export const POST_BODY_MAX = 3000;
/** コメントの上限 */
export const COMMENT_BODY_MAX = 1000;
/** 1投稿に付けられる画像の枚数 */
export const POST_IMAGE_MAX = 4;
/** 1回に読み込む件数 */
export const FEED_PAGE_SIZE = 20;

/** 1投稿に出すコメントの上限（これを超えたら「すべて見る」で開く） */
export const COMMENT_VISIBLE = 3;

/**
 * 「3時間前」の表示。
 * ⚠️ サーバーで描いた文字とクライアントで描いた文字が食い違うことがある（境目をまたぐと）。
 *    使う側の要素に suppressHydrationWarning を付けること。
 */
export function relativeTime(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  const min = Math.floor((Date.now() - t.getTime()) / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}日前`;
  return t.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}
