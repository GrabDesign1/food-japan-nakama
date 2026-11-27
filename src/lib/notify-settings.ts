/**
 * 【通知メールの ON/OFF】2026-11-28（ユーザー指示「やだったら通知を消せるように ON OFF ボタンを」）。
 *
 * ⚠️⚠️ **既定はON（列が null ＝受け取る）。** ここに並ぶのは「自分宛に起きたこと」の
 *    お知らせであって広告ではない。届かないと、商談に気づかないほうの損が大きい。
 *    ⚠️ 広告・案内メールは `User.marketingOptInAt` が担当で、あちらは**同意が要る**ので既定OFF。
 *       特定電子メール法の同意記録なので、**この仕組みと混ぜないこと**。
 *
 * ⚠️⚠️ **1本のスイッチにしない。** 「商談のメールは要るが、いいねは要らない」を叶えられないと、
 *    うるさい側に合わせて全部切られ、肝心の商談の通知まで届かなくなる。
 *
 * ⚠️ 止められない通知が1つだけある＝**パスワードの変更・退会・決済**のような、
 *    本人の資産に関わるもの。これは設定に出していない（出すと事故に気づけない）。
 */
import { prisma } from "@/lib/db";

export const NOTIFY_KINDS = ["message", "mention", "connection", "deal", "feed"] as const;
export type NotifyKind = (typeof NOTIFY_KINDS)[number];

/** 列名の対応表。⚠️ feed は 2026-11-21 から動いている既存の列。 */
const COLUMN: Record<NotifyKind, string> = {
  message: "messageEmailOptOutAt",
  mention: "mentionEmailOptOutAt",
  connection: "connectionEmailOptOutAt",
  deal: "dealEmailOptOutAt",
  feed: "feedEmailOptOutAt",
};

export const NOTIFY_LABEL: Record<NotifyKind, { title: string; note: string }> = {
  message: {
    title: "メッセージ・提案が届いたとき",
    note: "商談のやり取りと、自分の案件に届いた提案のお知らせです。切ると、提案に気づけなくなります。",
  },
  mention: {
    title: "チャンネルで名前を呼ばれたとき",
    note: "＠であなたが指名されたときだけ届きます。チャンネルのふつうの発言では届きません。",
  },
  connection: {
    title: "つながりの申請・承認",
    note: "仲間になりたいという申請と、その返事のお知らせです。",
  },
  deal: {
    title: "取引が進んだとき",
    note: "条件の合意、発送、受け取り、入金の確認、評価のお願い。",
  },
  feed: {
    title: "投稿への反応",
    note: "自分の投稿へのコメント・いいね・紹介のお知らせです。",
  },
};

export type NotifySettings = Record<NotifyKind, boolean>;

/** すべてONの既定値（会員が見つからないときもこれを返す＝黙って止めない）。 */
export const ALL_ON: NotifySettings = {
  message: true,
  mention: true,
  connection: true,
  deal: true,
  feed: true,
};

export async function getNotifySettings(userId: string): Promise<NotifySettings> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      messageEmailOptOutAt: true,
      mentionEmailOptOutAt: true,
      connectionEmailOptOutAt: true,
      dealEmailOptOutAt: true,
      feedEmailOptOutAt: true,
    },
  });
  if (!u) return { ...ALL_ON };
  return {
    message: !u.messageEmailOptOutAt,
    mention: !u.mentionEmailOptOutAt,
    connection: !u.connectionEmailOptOutAt,
    deal: !u.dealEmailOptOutAt,
    feed: !u.feedEmailOptOutAt,
  };
}

export async function setNotifySetting(
  userId: string,
  kind: NotifyKind,
  enabled: boolean
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { [COLUMN[kind]]: enabled ? null : new Date() },
  });
}

/**
 * **会員（法人）あてに送ってよいか**を、その会員のユーザー全員ぶんで判定する。
 * ⚠️ 通知の宛先は会員単位で集めている実装が多いので、ここでメールアドレスごとに絞る。
 * ⚠️ 返すのは「送ってよいメールアドレス」だけ。1人も残らなければ空配列＝送らない。
 */
export async function allowedEmailsForMember(
  memberId: string,
  kind: NotifyKind
): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { memberId, status: { not: "SUSPENDED" } },
    select: {
      email: true,
      messageEmailOptOutAt: true,
      mentionEmailOptOutAt: true,
      connectionEmailOptOutAt: true,
      dealEmailOptOutAt: true,
      feedEmailOptOutAt: true,
    },
  });
  return users
    .filter((u) => {
      switch (kind) {
        case "message":
          return !u.messageEmailOptOutAt;
        case "mention":
          return !u.mentionEmailOptOutAt;
        case "connection":
          return !u.connectionEmailOptOutAt;
        case "deal":
          return !u.dealEmailOptOutAt;
        case "feed":
          return !u.feedEmailOptOutAt;
      }
    })
    .map((u) => u.email);
}
