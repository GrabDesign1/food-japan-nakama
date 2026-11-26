// 特設ページの共有で、**画面（クライアント）からも使う値だけ**を置く。2026-11-26
//
// ⚠️⚠️ **このファイルから prisma を読まないこと。** summit-share.ts は DB を触るので、
//    "use client" の部品がそちらを読むと、ブラウザ側のビルドが dns / fs で落ちる
//    （2026-11-26 に実際に踏んだ。member-links-shared.ts と同じ理由で分けている）。

export type SummitEvent = {
  /** URLに出る名前（公開ページ /summit/<slug>） */
  slug: string;
  /** 正式名称 */
  name: string;
  /** 画面のタブなどに出す短い名前 */
  shortName: string;
  /** 開催日 */
  dates: string;
  /** 会場 */
  place: string;
  /** 公開ページの見出し */
  heading: string;
  /** これからの開催か。⚠️ 終わったら false に直す（文面が「当日の様子」に変わる） */
  upcoming?: boolean;
};

/**
 * 開催の一覧。⚠️ **新しい開催はここに1行足すだけ**で、会員側のタブと公開ページが増える。
 *    （公開ページは /summit/[event]、middleware の PUBLIC_PATHS への追記だけ忘れないこと）
 */
export const SUMMIT_EVENTS: SummitEvent[] = [
  {
    slug: "2026-miyazaki",
    name: "FOOD JAPAN SUMMIT 2026 in MIYAZAKI",
    shortName: "宮崎 2026",
    dates: "2026年11月17日",
    place: "宮崎",
    heading: "宮崎に、食のつくり手と届け手が集まりました。",
  },
  {
    slug: "2026-nagoya",
    name: "FOOD JAPAN SUMMIT 2026 in NAGOYA（TechGALA）",
    shortName: "名古屋 2026",
    dates: "2026年12月15日・16日",
    place: "名鉄グランドホテル（名古屋）",
    heading: "名古屋に、「食」のリーダーが集まります。",
    upcoming: true,
  },
];

export const DEFAULT_EVENT_SLUG = SUMMIT_EVENTS[0].slug;

export function findSummitEvent(slug: string | undefined | null): SummitEvent | null {
  return SUMMIT_EVENTS.find((e) => e.slug === slug) ?? null;
}

/** 入力されたものを、必ず実在する開催に寄せる（知らない値は既定の開催にする） */
export function normalizeEventSlug(slug: string | undefined | null): string {
  return findSummitEvent(slug)?.slug ?? DEFAULT_EVENT_SLUG;
}

export const SHARE_BODY_MAX = 500;
export const SHARE_IMAGE_MAX = 4;
export const SHARE_PAGE_SIZE = 30;

export type ShareKind = "photo" | "video" | "article";
