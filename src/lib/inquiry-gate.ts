// 「売りたい」案件に受信した問い合わせの閲覧制限（2026-08-10 ユーザー指示）。
// ルール：買い手からの問い合わせスレッドは、1通目のみ無料で閲覧可。
// 2通目以降のやり取り（閲覧・返信）は NAKAMA Premium会員（PAID）の特典。
// 判定・本文の秘匿はサーバー側で行う（マスク対象の本文はHTMLに含めない）。
import { prisma } from "@/lib/db";

export type InquiryGate = {
  /** 制限中か（true=非Premiumの受信側の問い合わせスレッド） */
  limited: boolean;
  /** 自分の初回返信の時刻。これより後に届いた相手のメッセージ（2往復目以降）をマスクする。null=未返信（マスクなし） */
  freeUntil: Date | null;
  /** 無料の返信枠（1往復目）が残っているか＝まだ一度も返信していない */
  canReplyFree: boolean;
};

/**
 * スレッドの閲覧制限を判定する。
 * 制限対象（閲覧者が Premium＝paymentStatus:PAID でない場合）：
 * ① 「売りたい（GIVE）」案件への問い合わせスレッドで、閲覧者がその案件の掲載者（売り手）
 * ② 案件に紐づかない直接の問い合わせスレッド（事業者ページ経由）で、閲覧者が受信側
 *    （スレッドを開始されなかった側）
 * 「探している（WANT）」の提案スレッドは紹介料モデルのため対象外（受信側＝買い手は無料）。
 */
export async function getInquiryGate(params: {
  threadId: string;
  offeringId: string | null;
  threadFromMemberId: string; // スレッドを開始した側
  viewerMemberId: string;
  viewerIsPremium: boolean;
}): Promise<InquiryGate> {
  const none: InquiryGate = { limited: false, freeUntil: null, canReplyFree: true };
  if (params.viewerIsPremium) return none;

  if (params.offeringId) {
    const offering = await prisma.offering.findUnique({
      where: { id: params.offeringId },
      select: { direction: true, memberId: true },
    });
    if (!offering) return none;
    if (offering.direction !== "GIVE") return none; // WANT提案スレッドは紹介料モデル（受信側は無料）
    if (offering.memberId !== params.viewerMemberId) return none; // 買い手側の閲覧は制限しない
  } else {
    // 直接の問い合わせ：自分から始めた会話は制限しない。受信側のみ対象
    if (params.threadFromMemberId === params.viewerMemberId) return none;
  }

  // 1往復目は無料：自分の初回返信までの受信は全て閲覧可。初回返信より後に届いた相手の
  // メッセージ（2往復目の相手の返信以降）をマスクする。未返信なら無料返信枠が1通残っている。
  const myFirstReply = await prisma.message.findFirst({
    where: { threadId: params.threadId, senderMemberId: params.viewerMemberId },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  return {
    limited: true,
    freeUntil: myFirstReply?.createdAt ?? null,
    canReplyFree: !myFirstReply,
  };
}
