// 「売りたい」に届いたリード（買い手からの問い合わせ）の開封（2026-08-12・ユーザー決定）。
//
// **初回の接点に紹介料**という一本のルールにする。
//   ・売り手 →「探している」への初回提案 … ContactUnlock（従来）
//   ・買い手 →「売りたい」への問い合わせ … 売り手が開くときに LeadUnlock（今回）
// どちらも1クレジット。**開封後のやり取りは何往復でも無料**。
//
// 一覧では社名・地域・業種と概要（冒頭のみ）まで無料で見える。
// 本文の全文と連絡先は開封してから。開封＝価値を得た時点なので、未読返還の対象にはしない
// （提案側は「送ったが読まれない」ことがあるため返還があるが、こちらは自分で開く）。
import { prisma } from "@/lib/db";
import { consumeCreditsTx } from "@/lib/contact-credits";

/** リードを開くのに必要なクレジット数（提案側の通常案件と同じ1）。 */
export const LEAD_UNLOCK_COST = 1;

/** 一覧で無料で見せる概要の文字数。これ以上は開封するまで伏せる。 */
export const LEAD_PREVIEW_CHARS = 40;

/** 開封済みのスレッドIDの集合を返す（一覧でまとめて判定する用）。 */
export async function loadUnlockedThreadIds(
  memberId: string,
  threadIds: string[]
): Promise<Set<string>> {
  if (!threadIds.length) return new Set();
  const rows = await prisma.leadUnlock.findMany({
    where: { memberId, threadId: { in: threadIds } },
    select: { threadId: true },
  });
  return new Set(rows.map((r) => r.threadId));
}

export async function isLeadUnlocked(memberId: string, threadId: string): Promise<boolean> {
  const row = await prisma.leadUnlock.findUnique({ where: { threadId } });
  return !!row && row.memberId === memberId;
}

/**
 * 課金の対象になるリードか。
 * 対象＝**自分が掲載した「売りたい」案件に、相手から届いた問い合わせ**。
 * 自分から送ったやり取り・「探している」案件・案件に紐づかない直接連絡は対象外（従来どおり無料）。
 */
export function isChargeableLead(params: {
  direction: string;
  offeringMemberId: string;
  viewerMemberId: string;
  threadFromMemberId: string;
}): boolean {
  if (params.direction !== "GIVE") return false;
  if (params.offeringMemberId !== params.viewerMemberId) return false;
  // 掲載者が自分から送り始めたスレッドは「届いたリード」ではない
  return params.threadFromMemberId !== params.viewerMemberId;
}

export type OpenLeadResult = { ok: true } | { ok: false; error: string };

/**
 * リードを開封する（1クレジット消費）。
 * 消費と記録は1トランザクションで行い、二重課金は threadId の unique で防ぐ。
 */
export async function openLead(params: {
  tenantId: string;
  memberId: string;
  buyerMemberId: string;
  threadId: string;
  offeringId: string | null;
}): Promise<OpenLeadResult> {
  const existing = await prisma.leadUnlock.findUnique({ where: { threadId: params.threadId } });
  if (existing) return { ok: true };

  try {
    await prisma.$transaction(async (tx) => {
      // 先に記録を作る＝同時押しは unique 制約で1回だけ通る
      const unlock = await tx.leadUnlock.create({
        data: {
          tenantId: params.tenantId,
          memberId: params.memberId,
          buyerMemberId: params.buyerMemberId,
          threadId: params.threadId,
          offeringId: params.offeringId,
        },
      });
      const consumed = await consumeCreditsTx(tx, {
        tenantId: params.tenantId,
        memberId: params.memberId,
        contactUnlockId: unlock.id,
        quantity: LEAD_UNLOCK_COST,
      });
      if (!consumed) throw new Error("INSUFFICIENT");
      await tx.leadUnlock.update({
        where: { id: unlock.id },
        data: { creditLedgerEntryId: consumed.ledgerEntryIds[0] ?? null },
      });
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INSUFFICIENT") {
      return { ok: false, error: "クレジットが不足しています。お支払い画面から購入できます。" };
    }
    // unique 制約＝ほぼ同時に押された。すでに開封済みとして扱う
    if (await prisma.leadUnlock.findUnique({ where: { threadId: params.threadId } })) {
      return { ok: true };
    }
    console.error("[lead-unlock] 開封に失敗:", e);
    return { ok: false, error: "開封できませんでした。時間をおいてお試しください。" };
  }
}
