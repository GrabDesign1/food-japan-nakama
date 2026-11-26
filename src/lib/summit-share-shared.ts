// 特設ページの共有で、**画面（クライアント）からも使う値だけ**を置く。2026-11-26
//
// ⚠️⚠️ **このファイルから prisma を読まないこと。** summit-share.ts は DB を触るので、
//    "use client" の部品がそちらを読むと、ブラウザ側のビルドで dns / fs が解決できず落ちる
//    （2026-11-26 に実際に踏んだ。member-links-shared.ts と同じ理由で分けている）。
export const SUMMIT_EVENT_SLUG = "2026-miyazaki";
export const SUMMIT_EVENT_NAME = "FOOD JAPAN SUMMIT 2026 in MIYAZAKI";

export const SHARE_BODY_MAX = 500;
export const SHARE_IMAGE_MAX = 4;
export const SHARE_PAGE_SIZE = 30;

export type ShareKind = "photo" | "video" | "article";
