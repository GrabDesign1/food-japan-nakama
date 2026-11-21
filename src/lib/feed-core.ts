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
