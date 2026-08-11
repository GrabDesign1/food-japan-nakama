// 課金の純粋ロジック（DB非依存。vitestの対象）。
// 価格・判定はすべてサーバー側で確定する（最終実装指示 2026-08-10）。

/** 優良案件（NAKAMA確認済み）の確認有効期間。過ぎたら通常案件扱いに戻る。 */
export const VERIFIED_LEAD_VALID_DAYS = 30;

/**
 * 有償クレジット（単品・パック）の有効期限（購入日から）。
 * 2026-08-11の法務レビューにより、単品購入分も含めてすべての有償クレジットに期限を設定する
 * （期限延長・実質的な再発行は行わない。資金決済法の適用除外の整理による）。
 */
export const CREDIT_PACK_EXPIRY_DAYS = 180;

/** 送信後この日数未読ならクレジットを返還（unlock単位で一度だけ）。 */
export const UNREAD_REFUND_DAYS = 14;

/** 確認済み案件への提案で消費するクレジット数（通常案件は1）。 */
export const VERIFIED_LEAD_CREDIT_COST = 3;

// NAKAMAビジネス会員（月額22,000円・税込）の特典（ユーザー確定 2026-08-11・同日夜に価格整合で改定）：
// 毎月50クレジット（繰越なし）＋追加クレジット（単品購入）と掲載オプションが20%割引。
// 「提案無制限」は、大量営業・スパムで買い手が離れる懸念から撤回した。
//
// 価格整合の考え方（2026-08-11 見直し）：
// 会員が得になる分岐点は「月額 ÷ 1件あたりの購入単価」で決まり、付与数は上限にしか効かない。
// 旧設定（22,000円・月20件・パック770円/件）では分岐点が28.6件で上限20件を超えており、
// フル消化しても会員が損をする状態だった。パックのまとめ買い割引を廃止して単価を1,100円に統一し、
// 分岐点を20件（22,000 ÷ 1,100）にした。付与数は上限にしか効かないため、
// 上限を30→50に引き上げて会費の価値を高めている（2026-08-11 ユーザー決定）。
// 会員の実効単価は 22,000 ÷ 50 = 440円/件（フル消化時）＝55,000円相当。

/** 確認済み事業者への初回登録特典（組織単位で一度だけ）。 */
export const SIGNUP_FREE_CREDITS = 3;

/**
 * ビジネス会員の割引率（%）。掲載オプションと追加チケット（1件購入）に適用する。
 * パック（5件・10件）は会員割引の対象外＝会費より安く同じものが買える二重割引を避けるため。
 */
export const MEMBER_OPTION_DISCOUNT_PERCENT = 20;

/** ビジネス会員に毎月付与する提案チケット数（繰越なし＝翌月の付与時に期限切れ）。 */
export const MEMBER_MONTHLY_CREDITS = 50;

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

/**
 * ティアに対応する消費クレジット数（通常案件1／確認済み案件3）。
 * 2026-08-11の改定で「優良案件専用クレジット」を廃止し、同じクレジットの消費数で差をつける方式にした
 * （会員の月次クレジットを確認済み案件にも使えるようにするため）。
 */
export function creditCostFor(tier: PricingTier): number {
  return tier === "verified_lead" ? VERIFIED_LEAD_CREDIT_COST : 1;
}

/**
 * 有償クレジットの有効期限＝購入日から180日後の23:59:59.999（日本時間）。
 * 「購入日から180日」を利用者が分かる形（日単位・日本時間の日末）で切る。
 */
export function creditExpiryFrom(purchasedAt: Date): Date {
  const JST_OFFSET = 9 * 60 * 60 * 1000;
  const jst = new Date(purchasedAt.getTime() + JST_OFFSET);
  const endOfDayJst = Date.UTC(
    jst.getUTCFullYear(),
    jst.getUTCMonth(),
    jst.getUTCDate() + CREDIT_PACK_EXPIRY_DAYS,
    23,
    59,
    59,
    999
  );
  return new Date(endOfDayJst - JST_OFFSET);
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
  entryType: string; // member_monthly / purchase / grant / admin_adjust
};

/**
 * 消費順序の優先度（小さいほど先に使う）。
 * ①月次付与分（次回更新日で失効するため先に使うのが利用者に有利）
 * ②有償購入分
 * ③無償付与分（登録特典・無期限）
 * 同順位内は有効期限が早い順、無期限は最後。
 */
function consumePriority(entryType: string): number {
  if (entryType === "member_monthly") return 0;
  if (entryType === "purchase") return 1;
  return 2;
}

function byConsumeOrder(a: CreditLot, b: CreditLot): number {
  const pa = consumePriority(a.entryType);
  const pb = consumePriority(b.entryType);
  if (pa !== pb) return pa - pb;
  if (!a.expiresAt && !b.expiresAt) return 0;
  if (!a.expiresAt) return 1;
  if (!b.expiresAt) return -1;
  return a.expiresAt.getTime() - b.expiresAt.getTime();
}

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

/** 消費に使えるロット（残数あり・期限内）を消費順に並べる。 */
function usableLots(lots: CreditLot[], now: Date): CreditLot[] {
  return lots
    .filter((l) => lotRemaining(l) > 0 && (!l.expiresAt || l.expiresAt.getTime() > now.getTime()))
    .sort(byConsumeOrder);
}

/**
 * 消費するロットを選ぶ（1件分）。残数のあるロットのみ。見つからなければ null。
 */
export function pickLotToConsume(lots: CreditLot[], now: Date): CreditLot | null {
  return usableLots(lots, now)[0] ?? null;
}

/**
 * 必要数を複数ロットに割り当てる（消費順・1ロットで足りなければ次のロットへ）。
 * 残高が足りなければ null（部分消費はしない）。
 */
export function allocateCredits(
  lots: CreditLot[],
  need: number,
  now: Date
): { lotId: string; take: number }[] | null {
  if (need <= 0) return [];
  const plan: { lotId: string; take: number }[] = [];
  let rest = need;
  for (const lot of usableLots(lots, now)) {
    if (rest <= 0) break;
    const take = Math.min(rest, lotRemaining(lot));
    if (take <= 0) continue;
    plan.push({ lotId: lot.id, take });
    rest -= take;
  }
  return rest > 0 ? null : plan;
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
