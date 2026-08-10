// 紹介クレジット台帳の操作（台帳方式：正のエントリ=付与ロット、負のエントリはロットを参照して消費）。
// 冪等性は idempotencyKey（unique）で担保する。
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  type CreditLot,
  type CreditType,
  availableBalance,
  pickLotToConsume,
  CREDIT_PACK_EXPIRY_DAYS,
  SIGNUP_FREE_CREDITS,
} from "@/lib/billing-core";

type Tx = Prisma.TransactionClient;

/** 会員のロット一覧（消費済み数を集計して返す）。 */
async function loadLots(db: Tx | typeof prisma, memberId: string, creditType: CreditType): Promise<CreditLot[]> {
  const entries = await db.contactCreditLedger.findMany({
    where: { memberId, creditType },
    orderBy: { createdAt: "asc" },
  });
  const lots = new Map<string, CreditLot>();
  for (const e of entries) {
    if (e.quantity > 0 && !e.lotEntryId) {
      lots.set(e.id, { id: e.id, quantity: e.quantity, consumed: 0, expiresAt: e.expiresAt });
    }
  }
  for (const e of entries) {
    if (e.lotEntryId && e.quantity < 0) {
      const lot = lots.get(e.lotEntryId);
      if (lot) lot.consumed += -e.quantity;
    }
    if (e.lotEntryId && e.quantity > 0) {
      // release/refund でロットへ戻した分
      const lot = lots.get(e.lotEntryId);
      if (lot) lot.consumed -= e.quantity;
    }
  }
  return Array.from(lots.values());
}

/** 利用可能残高。 */
export async function getCreditBalance(memberId: string, creditType: CreditType): Promise<number> {
  const lots = await loadLots(prisma, memberId, creditType);
  return availableBalance(lots, new Date());
}

/** 両種別の残高（画面表示用）。 */
export async function getCreditBalances(memberId: string): Promise<{ standard: number; verified: number }> {
  const [standard, verified] = await Promise.all([
    getCreditBalance(memberId, "standard"),
    getCreditBalance(memberId, "verified"),
  ]);
  return { standard, verified };
}

/** 付与ロットを作成（冪等）。既に同じ idempotencyKey があれば何もしない。 */
export async function grantCredits(params: {
  tenantId: string;
  memberId: string;
  creditType: CreditType;
  quantity: number;
  entryType: "purchase" | "grant" | "member_monthly" | "admin_adjust";
  expiresAt?: Date | null;
  orderItemId?: string | null;
  idempotencyKey: string;
  note?: string;
}): Promise<{ granted: boolean }> {
  try {
    await prisma.contactCreditLedger.create({
      data: {
        tenantId: params.tenantId,
        memberId: params.memberId,
        creditType: params.creditType,
        quantity: params.quantity,
        entryType: params.entryType,
        expiresAt: params.expiresAt ?? null,
        orderItemId: params.orderItemId ?? null,
        idempotencyKey: params.idempotencyKey,
        note: params.note ?? null,
      },
    });
    return { granted: true };
  } catch (e) {
    // idempotencyKey の一意制約違反＝付与済み
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { granted: false };
    }
    throw e;
  }
}

/** 確認済み事業者への初回無料3件（組織単位で一度だけ）。 */
export async function grantSignupCredits(tenantId: string, memberId: string): Promise<void> {
  await grantCredits({
    tenantId,
    memberId,
    creditType: "standard",
    quantity: SIGNUP_FREE_CREDITS,
    entryType: "grant",
    expiresAt: null, // 無期限（不正時は admin_adjust で取消）
    idempotencyKey: `signup3:${memberId}`,
    note: "初回登録特典（事業者確認後）",
  });
}

// 月額会員は提案無制限（クレジット消費なし）のため、月次付与は行わない（ユーザー確定 2026-08-10）。

/**
 * トランザクション内でクレジットを1件消費する。
 * 期限が近いロットから消費し、消費後にロット残数が負になっていないか再検証する（並行消費対策）。
 * 残高が無ければ null を返す。
 */
export async function consumeOneCreditTx(
  tx: Tx,
  params: {
    tenantId: string;
    memberId: string;
    creditType: CreditType;
    contactUnlockId: string;
  }
): Promise<{ ledgerEntryId: string } | null> {
  const now = new Date();
  const lots = await loadLots(tx, params.memberId, params.creditType);
  const lot = pickLotToConsume(lots, now);
  if (!lot) return null;

  const entry = await tx.contactCreditLedger.create({
    data: {
      tenantId: params.tenantId,
      memberId: params.memberId,
      creditType: params.creditType,
      quantity: -1,
      entryType: "consume",
      lotEntryId: lot.id,
      contactUnlockId: params.contactUnlockId,
      idempotencyKey: `consume:${params.contactUnlockId}`,
    },
  });

  // 並行消費でロットを超過していないか再検証（超過ならロールバック）
  const after = await loadLots(tx, params.memberId, params.creditType);
  const thisLot = after.find((l) => l.id === lot.id);
  if (thisLot && thisLot.quantity - thisLot.consumed < 0) {
    throw new Error("credit lot over-consumed");
  }
  return { ledgerEntryId: entry.id };
}

/** 14日未読返還（unlock単位で一度だけ・冪等）。元ロットへ+1を戻す。 */
export async function refundUnreadCredit(params: {
  tenantId: string;
  memberId: string;
  creditType: CreditType;
  lotEntryId: string | null;
  contactUnlockId: string;
}): Promise<{ granted: boolean }> {
  try {
    await prisma.contactCreditLedger.create({
      data: {
        tenantId: params.tenantId,
        memberId: params.memberId,
        creditType: params.creditType,
        quantity: 1,
        entryType: "refund",
        // 元ロットが分かる場合はロットへ戻す（期限も元ロットに従う）。不明なら新ロット扱い（無期限）。
        lotEntryId: params.lotEntryId,
        contactUnlockId: params.contactUnlockId,
        idempotencyKey: `unread_refund:${params.contactUnlockId}`,
        note: "14日間未読による返還",
      },
    });
    return { granted: true };
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return { granted: false };
    }
    throw e;
  }
}

/** 期限切れロットの残数を失効させる（日次バッチ・ロット単位で冪等）。 */
export async function expireCreditLots(): Promise<number> {
  const now = new Date();
  // 期限切れの付与ロットを走査（件数は当面小さい想定）
  const expiredLots = await prisma.contactCreditLedger.findMany({
    where: { quantity: { gt: 0 }, lotEntryId: null, expiresAt: { lt: now } },
  });
  let expiredCount = 0;
  for (const lot of expiredLots) {
    const lots = await loadLots(prisma, lot.memberId, lot.creditType as CreditType);
    const l = lots.find((x) => x.id === lot.id);
    if (!l) continue;
    const remaining = l.quantity - l.consumed;
    if (remaining <= 0) continue;
    try {
      await prisma.contactCreditLedger.create({
        data: {
          tenantId: lot.tenantId,
          memberId: lot.memberId,
          creditType: lot.creditType,
          quantity: -remaining,
          entryType: "expire",
          lotEntryId: lot.id,
          idempotencyKey: `expire:${lot.id}`,
          note: "有効期限切れによる失効",
        },
      });
      expiredCount += remaining;
    } catch (e) {
      if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
        continue; // 既に失効処理済み
      }
      throw e;
    }
  }
  return expiredCount;
}

export { CREDIT_PACK_EXPIRY_DAYS };
