// 紹介クレジット台帳の操作（台帳方式：正のエントリ=付与ロット、負のエントリはロットを参照して消費）。
// 冪等性は idempotencyKey（unique）で担保する。
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  type CreditLot,
  type CreditType,
  availableBalance,
  allocateCredits,
  CREDIT_PACK_EXPIRY_DAYS,
  SIGNUP_FREE_CREDITS,
  MEMBER_MONTHLY_CREDITS,
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
      lots.set(e.id, {
        id: e.id,
        quantity: e.quantity,
        consumed: 0,
        expiresAt: e.expiresAt,
        entryType: e.entryType,
      });
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

/** 利用可能残高（クレジットは1種類＝standard。verifiedは2026-08-11に廃止した旧種別）。 */
export async function getCreditBalance(memberId: string, creditType: CreditType = "standard"): Promise<number> {
  const lots = await loadLots(prisma, memberId, creditType);
  return availableBalance(lots, new Date());
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

/**
 * ビジネス会員の月次クレジット付与（請求書1通につき一度だけ）。
 * 「未使用分は翌月へ繰り越さない」ため、新しい月の付与に成功したら、
 * 前月までの月次ロットの未使用分をその場で失効させる。
 * （有効期限だけに頼ると、Stripeの請求期間の丸めで前月分が数日残ってしまう）
 */
export async function grantMonthlyMemberCredits(params: {
  tenantId: string;
  memberId: string;
  invoiceId: string;
  periodEnd: Date | null;
}): Promise<{ granted: boolean }> {
  const expiresAt = params.periodEnd ?? new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
  const result = await grantCredits({
    tenantId: params.tenantId,
    memberId: params.memberId,
    creditType: "standard",
    quantity: MEMBER_MONTHLY_CREDITS,
    entryType: "member_monthly",
    expiresAt,
    idempotencyKey: `member_monthly:${params.invoiceId}`,
    note: "NAKAMAビジネス会員 月次クレジット（繰越なし）",
  });
  if (result.granted) {
    await expirePreviousMonthlyLots(params.memberId, params.invoiceId);
  }
  return result;
}

/** 今回付与した月次ロット以外の、未使用の月次ロットを失効させる（繰越なしの担保）。 */
async function expirePreviousMonthlyLots(memberId: string, currentInvoiceId: string): Promise<void> {
  const lots = await prisma.contactCreditLedger.findMany({
    where: {
      memberId,
      entryType: "member_monthly",
      quantity: { gt: 0 },
      lotEntryId: null,
      idempotencyKey: { not: `member_monthly:${currentInvoiceId}` },
    },
    select: { id: true, tenantId: true, quantity: true, creditType: true },
  });
  for (const lot of lots) {
    const used = await prisma.contactCreditLedger.aggregate({
      where: { lotEntryId: lot.id },
      _sum: { quantity: true },
    });
    const remaining = lot.quantity + (used._sum.quantity ?? 0);
    if (remaining <= 0) continue;
    await prisma.contactCreditLedger
      .create({
        data: {
          tenantId: lot.tenantId,
          memberId,
          creditType: lot.creditType,
          quantity: -remaining,
          entryType: "expire",
          lotEntryId: lot.id,
          idempotencyKey: `monthly_reset:${lot.id}`,
          note: "翌月分の付与に伴う失効（繰越なし）",
        },
      })
      .catch((e) => {
        // 既に失効済み（再送）なら何もしない
        if (!(typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002")) {
          throw e;
        }
      });
  }
}

/**
 * トランザクション内でクレジットを指定数消費する（通常案件1・確認済み案件3）。
 * 消費順は月次付与→有償購入→無償付与、同順位は期限が早い順。1ロットで足りなければ次のロットへ。
 * 消費後にロット残数が負になっていないか再検証する（並行消費対策）。
 * 残高が足りなければ null を返す（部分消費はしない）。
 */
export async function consumeCreditsTx(
  tx: Tx,
  params: {
    tenantId: string;
    memberId: string;
    creditType?: CreditType;
    contactUnlockId: string;
    quantity: number;
  }
): Promise<{ ledgerEntryIds: string[] } | null> {
  const creditType: CreditType = params.creditType ?? "standard";
  // 会員×種別の消費を直列化する。
  // 既定の READ COMMITTED では、別案件への同時提案が互いの未コミット消費を見られず、
  // 残高1件で2件解放できてしまう（後段の再検証もすり抜ける）。
  // トランザクション終了時に自動解放されるアドバイザリロック（pgbouncerのトランザクションプールでも安全）。
  await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${`credit:${params.memberId}:${creditType}`}))`;

  const now = new Date();
  const lots = await loadLots(tx, params.memberId, creditType);
  const plan = allocateCredits(lots, params.quantity, now);
  if (!plan) return null;

  const ledgerEntryIds: string[] = [];
  for (const step of plan) {
    const entry = await tx.contactCreditLedger.create({
      data: {
        tenantId: params.tenantId,
        memberId: params.memberId,
        creditType,
        quantity: -step.take,
        entryType: "consume",
        lotEntryId: step.lotId,
        contactUnlockId: params.contactUnlockId,
        // 1回の解放で複数ロットに跨ることがあるため、ロットIDまでを冪等キーに含める
        idempotencyKey: `consume:${params.contactUnlockId}:${step.lotId}`,
      },
    });
    ledgerEntryIds.push(entry.id);
  }

  // 並行消費でロットを超過していないか再検証（超過ならロールバック）
  const after = await loadLots(tx, params.memberId, creditType);
  for (const step of plan) {
    const thisLot = after.find((l) => l.id === step.lotId);
    if (thisLot && thisLot.quantity - thisLot.consumed < 0) {
      throw new Error("credit lot over-consumed");
    }
  }
  return { ledgerEntryIds };
}

/**
 * 14日未読返還（unlock単位で一度だけ・冪等）。消費した各ロットへ同数を戻す。
 * 元ロットが期限切れの場合は返還しない（期限延長・実質的な再発行を行わないため。
 * 2026-08-11の法務レビューによる方針。購入画面・規約にもその旨を明示している）。
 */
export async function refundUnreadCredits(params: {
  tenantId: string;
  memberId: string;
  contactUnlockId: string;
}): Promise<{ refunded: number; skippedExpired: number }> {
  const consumeEntries = await prisma.contactCreditLedger.findMany({
    where: { contactUnlockId: params.contactUnlockId, entryType: "consume", quantity: { lt: 0 } },
  });
  const now = Date.now();
  let refunded = 0;
  let skippedExpired = 0;

  for (const entry of consumeEntries) {
    if (!entry.lotEntryId) continue;
    const lot = await prisma.contactCreditLedger.findUnique({
      where: { id: entry.lotEntryId },
      select: { expiresAt: true },
    });
    if (lot?.expiresAt && lot.expiresAt.getTime() <= now) {
      skippedExpired += -entry.quantity;
      continue;
    }
    try {
      await prisma.contactCreditLedger.create({
        data: {
          tenantId: params.tenantId,
          memberId: params.memberId,
          creditType: entry.creditType,
          quantity: -entry.quantity, // 消費は負なので反転して戻す
          entryType: "refund",
          lotEntryId: entry.lotEntryId,
          contactUnlockId: params.contactUnlockId,
          idempotencyKey: `unread_refund:${params.contactUnlockId}:${entry.lotEntryId}`,
          note: "14日間未読による返還",
        },
      });
      refunded += -entry.quantity;
    } catch (e) {
      // 既に返還済み（再送）なら何もしない
      if (!(typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002")) {
        throw e;
      }
    }
  }
  return { refunded, skippedExpired };
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
