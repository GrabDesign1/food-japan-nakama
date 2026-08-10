// 課金の純粋ロジック（DB非依存。vitestの対象）。
// 価格・判定はすべてサーバー側で確定する（最終実装指示 2026-08-10）。

/** 優良案件（NAKAMA確認済み）の確認有効期間。過ぎたら通常案件扱いに戻る。 */
export const VERIFIED_LEAD_VALID_DAYS = 30;

/** 紹介クレジットパックの有効期限（購入日から）。 */
export const CREDIT_PACK_EXPIRY_DAYS = 180;

/** 送信後この日数未読ならクレジットを1件返還（一度だけ）。 */
export const UNREAD_REFUND_DAYS = 14;

// 月額会員（22,000円・税込）の特典：通常・優良案件への提案が無制限＋掲載オプション20%割引
// （ユーザー確定 2026-08-10。クレジットは消費しない）

/** 確認済み事業者への初回登録特典（組織単位で一度だけ）。 */
export const SIGNUP_FREE_CREDITS = 3;

/** 月額会員の掲載オプション割引率（%）。 */
export const MEMBER_OPTION_DISCOUNT_PERCENT = 20;

export type PricingTier = "standard" | "verified_lead";
export type CreditType = "standard" | "verified";

/** 優良案件の確認が現在有効か。 */
export function isVerifiedLeadActive(verifiedLeadAt: Date | null | undefined, now: Date): boolean {
  if (!verifiedLeadAt) return false;
  const expires = verifiedLeadAt.getTime() + VERIFIED_LEAD_VALID_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() < expires;
}

/** 案件から紹介料ティアを判定。 */
export function pricingTierFor(verifiedLeadAt: Date | null | undefined, now: Date): PricingTier {
  return isVerifiedLeadActive(verifiedLeadAt, now) ? "verified_lead" : "standard";
}

/** ティアに対応するクレジット種別。 */
export function creditTypeForTier(tier: PricingTier): CreditType {
  return tier === "verified_lead" ? "verified" : "standard";
}

/**
 * 会員割引後の単価（税込・円）。JPYは最小単位＝円の整数。
 * 端数は切り捨て（利用者有利）。割引率0またはfalseで定価。
 */
export function discountedUnitAmount(
  unitAmount: number,
  discountPercent: number,
  isMember: boolean
): number {
  if (!isMember || discountPercent <= 0) return unitAmount;
  const p = Math.min(100, Math.max(0, Math.floor(discountPercent)));
  return Math.floor((unitAmount * (100 - p)) / 100);
}

export type CreditLot = {
  id: string;
  quantity: number; // 付与数（正）
  consumed: number; // このロットから消費済みの数（正の数で渡す）
  expiresAt: Date | null;
};

/** ロットの残数。 */
export function lotRemaining(lot: CreditLot): number {
  return Math.max(0, lot.quantity - lot.consumed);
}

/** 利用可能残高（期限切れロットは除外）。 */
export function availableBalance(lots: CreditLot[], now: Date): number {
  return lots
    .filter((l) => !l.expiresAt || l.expiresAt.getTime() > now.getTime())
    .reduce((sum, l) => sum + lotRemaining(l), 0);
}

/**
 * 消費するロットを選ぶ：期限が近い順（無期限は最後）。残数のあるロットのみ。
 * 見つからなければ null。
 */
export function pickLotToConsume(lots: CreditLot[], now: Date): CreditLot | null {
  const usable = lots.filter(
    (l) => lotRemaining(l) > 0 && (!l.expiresAt || l.expiresAt.getTime() > now.getTime())
  );
  usable.sort((a, b) => {
    if (!a.expiresAt && !b.expiresAt) return 0;
    if (!a.expiresAt) return 1;
    if (!b.expiresAt) return -1;
    return a.expiresAt.getTime() - b.expiresAt.getTime();
  });
  return usable[0] ?? null;
}

/** 14日未読返還の対象か（開封なし・期限到来・未返還）。 */
export function isUnreadRefundDue(params: {
  openedAt: Date | null;
  unreadRefundDueAt: Date | null;
  unreadRefundedAt: Date | null;
  now: Date;
}): boolean {
  const { openedAt, unreadRefundDueAt, unreadRefundedAt, now } = params;
  if (openedAt) return false; // 開封済みは返還しない（返信なしでも返還しない）
  if (unreadRefundedAt) return false; // 一度だけ
  if (!unreadRefundDueAt) return false;
  return unreadRefundDueAt.getTime() <= now.getTime();
}
