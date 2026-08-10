// 「売りたい」案件に受信した問い合わせの閲覧制限（2026-08-10 ユーザー指示）。
// ルール：買い手からの問い合わせは1通目のみ無料で閲覧可（＋こちらから1通は無料で返信できる）。
// 2通目以降の相手メッセージの閲覧と、その後の返信は NAKAMA Premium会員（PAID）の特典。
// 判定・本文の秘匿はサーバー側で行う（マスク対象の本文はHTMLに含めない）。
//
// 判定はスレッド単位ではなく**メッセージ単位の文脈**で行う（2026-08-11 Phase 6）。
// スレッドは会員ペアで1本しか作られないため、スレッド生成時の offeringId や
// 「誰が会話を始めたか」で判定すると、先に空のスレッドを作っておくだけで
// 以後の問い合わせがすべて無料になってしまう（実際に回避可能だった）。
import { cache } from "react";
import { prisma } from "@/lib/db";

export type InquiryGate = {
  /** 制限中か（非Premiumで、課金対象の受信メッセージがある） */
  limited: boolean;
  /** 本文を出してはいけないメッセージのID（2通目以降の受信） */
  maskedMessageIds: Set<string>;
  /** 無料の返信枠（1往復目）が残っているか＝まだ一度も返信していない */
  canReplyFree: boolean;
  /** 無料で閲覧できる最後の受信メッセージの時刻（既読処理の基準） */
  freeUntil: Date | null;
};

const NONE: InquiryGate = {
  limited: false,
  maskedMessageIds: new Set(),
  canReplyFree: true,
  freeUntil: null,
};

// cache()：同一リクエスト内（ページ表示＋既読処理など）の重複判定を1回のDB照会にまとめる。
// cacheは引数の同値比較でメモ化するため、オブジェクトではなく位置引数で受ける。
const getInquiryGateCached = cache(
  async (
    threadId: string,
    threadFromMemberId: string,
    viewerMemberId: string,
    viewerIsPremium: boolean
  ): Promise<InquiryGate> => {
    if (viewerIsPremium) return NONE;

    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      select: { id: true, senderMemberId: true, offeringId: true, createdAt: true },
    });
    if (messages.length === 0) return NONE;

    const offeringIds = Array.from(
      new Set(messages.map((m) => m.offeringId).filter((v): v is string => !!v))
    );
    const offerings = offeringIds.length
      ? await prisma.offering.findMany({
          where: { id: { in: offeringIds } },
          select: { id: true, direction: true, memberId: true },
        })
      : [];
    const offeringById = new Map(offerings.map((o) => [o.id, o]));

    // 課金対象＝自分が受け取った「引き合い」。
    // ① 自分が掲載している「売りたい（GIVE）」案件への問い合わせ
    // ② 案件に紐づかない直接の問い合わせで、自分が受信側（会話を始めたのが相手）
    // 「探している（WANT）」への提案は紹介料モデルのため対象外（受信側＝買い手は無料）。
    // 一度「引き合い」が始まったスレッドでは、以後の案件に紐づかない受信も同じ会話の続きとして扱う
    // （そうしないと、続きのメッセージを送るだけで無料に戻せてしまう）。
    let inquiryStarted = threadFromMemberId !== viewerMemberId;
    const chargeable: { id: string; createdAt: Date }[] = [];
    for (const m of messages) {
      if (m.senderMemberId === viewerMemberId) continue;
      if (m.offeringId) {
        const o = offeringById.get(m.offeringId);
        if (!o) continue;
        // 「探している（WANT）」への提案は紹介料モデルのため対象外
        if (o.direction !== "GIVE" || o.memberId !== viewerMemberId) continue;
        inquiryStarted = true;
        chargeable.push(m);
        continue;
      }
      if (inquiryStarted) chargeable.push(m);
    }
    if (chargeable.length === 0) return NONE;

    const iHaveReplied = messages.some((m) => m.senderMemberId === viewerMemberId);
    return {
      limited: true,
      // 1通目だけ無料。2通目以降は自分が返信したかどうかに関係なくマスクする
      maskedMessageIds: new Set(chargeable.slice(1).map((m) => m.id)),
      canReplyFree: !iHaveReplied,
      freeUntil: chargeable[0].createdAt,
    };
  }
);

export async function getInquiryGate(params: {
  threadId: string;
  threadFromMemberId: string; // スレッドを開始した側
  viewerMemberId: string;
  viewerIsPremium: boolean;
}): Promise<InquiryGate> {
  return getInquiryGateCached(
    params.threadId,
    params.threadFromMemberId,
    params.viewerMemberId,
    params.viewerIsPremium
  );
}
