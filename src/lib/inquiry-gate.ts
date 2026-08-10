// 「売りたい」案件に受信した問い合わせの閲覧制限（2026-08-10 ユーザー指示）。
// ルール：買い手からの問い合わせスレッドは、1通目のみ無料で閲覧可。
// 2通目以降のやり取り（閲覧・返信）は NAKAMA Premium会員（PAID）の特典。
// 判定・本文の秘匿はサーバー側で行う（マスク対象の本文はHTMLに含めない）。
import { prisma } from "@/lib/db";

export type InquiryGate = {
  /** 制限中か（true=非Premiumの売り手が受信した問い合わせスレッド） */
  limited: boolean;
  /** 無料で閲覧できる1通目のメッセージid（limited時のみ） */
  firstMessageId: string | null;
};

/**
 * スレッドの閲覧制限を判定する。
 * 制限対象：スレッドが「売りたい（GIVE）」案件に紐づき、閲覧者がその案件の掲載者（売り手）で、
 * かつ閲覧者が Premium（paymentStatus=PAID）でない場合。
 * 「探している（WANT）」の提案スレッド（紹介料済み）や、案件に紐づかないスレッドは対象外。
 */
export async function getInquiryGate(params: {
  threadId: string;
  offeringId: string | null;
  viewerMemberId: string;
  viewerIsPremium: boolean;
}): Promise<InquiryGate> {
  const none: InquiryGate = { limited: false, firstMessageId: null };
  if (params.viewerIsPremium) return none;
  if (!params.offeringId) return none;

  const offering = await prisma.offering.findUnique({
    where: { id: params.offeringId },
    select: { direction: true, memberId: true },
  });
  if (!offering) return none;
  if (offering.direction !== "GIVE") return none; // WANT提案スレッドは紹介料モデル（受信側は無料）
  if (offering.memberId !== params.viewerMemberId) return none; // 買い手側の閲覧は制限しない

  const first = await prisma.message.findFirst({
    where: { threadId: params.threadId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return { limited: true, firstMessageId: first?.id ?? null };
}
