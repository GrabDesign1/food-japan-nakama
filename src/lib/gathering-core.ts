// 「集まりたい」の定数（2026-11-23）。
// ⚠️ ここはクライアント（投稿欄）からも読み込む。
//    サーバー専用のもの（prisma, 環境変数, node:*）を絶対に入れない。

export const GATHERING_TITLE_MAX = 80;
export const GATHERING_BODY_MAX = 2000;
export const GATHERING_PLACE_MAX = 100;
export const GATHERING_TIMENOTE_MAX = 60;
export const GATHERING_NOTE_MAX = 300;
export const GATHERING_PAGE_SIZE = 20;

/** 参加の表明。⚠️ 「気になります」を必ず用意する——
 *  行けるか分からない段階で手を挙げられないと、小さい集まりは人が集まらない。 */
export const JOIN_KINDS = [
  ["going", "行きます"],
  ["interested", "気になります"],
] as const;
export type JoinKind = (typeof JOIN_KINDS)[number][0];

export const GATHERING_STATUS: Record<string, string> = {
  open: "募集中",
  closed: "締め切りました",
  done: "終わりました",
};

/** 「5月ごろ」のような書き方の例（入力欄の案内に使う） */
export const TIME_NOTE_EXAMPLES = ["5月ごろ", "来年の田植えの時期", "平日の夜", "未定"];

/** 日時の表示。決まっていなければ timeNote を出す */
export function whenLabel(startAt: Date | string | null, timeNote: string | null): string {
  if (startAt) {
    const d = typeof startAt === "string" ? new Date(startAt) : startAt;
    return d.toLocaleString("ja-JP", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }
  return timeNote?.trim() || "日程はこれから";
}

/** 場所の表示 */
export function placeLabel(prefecture: string | null, place: string | null): string {
  return [prefecture, place].filter(Boolean).join("　") || "場所はこれから";
}
