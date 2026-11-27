/**
 * 【絵文字リアクション】2026-11-27。
 *
 * ⚠️⚠️ **ここは "use server" ではない普通のファイル。**
 *    `messages/actions.ts` は "use server" なので、**定数を export できない**
 *    （async 関数しか出せない。⚠️ tsc は通り、ビルドで落ちる）。だからここに置いている。
 *
 * ⚠️ 使える絵文字は6つだけ。商談の場なので全絵文字は出さない。
 *    ⚠️ 増やすと「どれを押すか」で迷いが生まれ、合図としての速さが失われる。
 * ⚠️ 並びは画面とサーバーで同じものを使う（ここが唯一の定義）。
 */
export const REACTIONS = ["👍", "✅", "🙏", "👀", "🎉", "💡"] as const;

export type ReactionEmoji = (typeof REACTIONS)[number];

/** 一覧にある絵文字かどうか（サーバー側の受け入れ判定に使う）。 */
export function isReaction(s: string): boolean {
  return (REACTIONS as readonly string[]).includes(s);
}
