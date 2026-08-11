// 納品書・請求書の作成支援（2026-08-12）。
//
// **NAKAMAは当事者にならず、代金も預からない**。ここで作るのは「売り手名義の帳票を
// 画面で組み立てて印刷できるようにする」だけの補助であり、NAKAMAが請求・回収する
// わけではない（媒介者交付特例は使わない）。
//
// 発行済みPDFはサーバーに保存しない。保存すると電子帳簿保存法（検索機能・訂正削除
// 防止）の要件を負うため、その場で組み立てて当事者がダウンロード・保存する。

export type TaxRate = 8 | 10;

/** 税率の既定＝飲食料品は軽減8%、それ以外は10%。カテゴリから推定する。 */
export function defaultTaxRate(category: string | null | undefined): TaxRate {
  return category === "食材・原料" ? 8 : 10;
}

export function normalizeTaxRate(v: number | null | undefined, fallback: TaxRate = 10): TaxRate {
  return v === 8 || v === 10 ? v : fallback;
}

export type TaxBreakdown = {
  rate: TaxRate;
  /** 税抜（本体）金額 */
  excluding: number;
  /** 消費税額 */
  tax: number;
  /** 税込金額 */
  including: number;
};

/**
 * 税込金額から内訳を割り戻す。
 * 消費税額は円未満を切り捨て（適格請求書の端数処理は税率ごとに1回。ここは1明細なので単純）。
 */
export function taxBreakdown(including: number, rate: TaxRate): TaxBreakdown {
  const incl = Math.max(0, Math.trunc(including));
  const tax = Math.floor((incl * rate) / (100 + rate));
  return { rate, excluding: incl - tax, tax, including: incl };
}

/** 帳票番号。保存せず毎回同じ値になるよう、発行対象のIDから決定的に作る。 */
export function documentNo(kind: "invoice" | "delivery", offerId: string, issuedAt: Date): string {
  const y = issuedAt.getFullYear();
  const m = String(issuedAt.getMonth() + 1).padStart(2, "0");
  const d = String(issuedAt.getDate()).padStart(2, "0");
  const seq = offerId.slice(-6).toUpperCase();
  return `${kind === "invoice" ? "INV" : "DLV"}-${y}${m}${d}-${seq}`;
}

/**
 * 売り手・買い手の判定。
 * 「売りたい（GIVE）」＝掲載者が売り手、「探している（WANT）」＝掲載者が買い手。
 */
export function sellerBuyerIds(params: {
  direction: string;
  offeringMemberId: string;
  participantAId: string;
  participantBId: string;
}): { sellerId: string; buyerId: string } {
  const { direction, offeringMemberId, participantAId, participantBId } = params;
  const other = participantAId === offeringMemberId ? participantBId : participantAId;
  return direction === "WANT"
    ? { sellerId: other, buyerId: offeringMemberId }
    : { sellerId: offeringMemberId, buyerId: other };
}

/** 郵便番号・住所を1行に整形する。 */
export function formatAddress(m: {
  postalCode?: string | null;
  prefecture?: string | null;
  city?: string | null;
  address?: string | null;
}): string {
  const zip = m.postalCode ? `〒${m.postalCode}　` : "";
  const rest = [m.prefecture, m.city, m.address].filter(Boolean).join(" ");
  return `${zip}${rest}`.trim();
}

/** 登録番号の体裁チェック（T＋13桁）。緩めに整形して返す。空欄は許す。 */
export function normalizeInvoiceRegNo(v: string | null | undefined): string | null {
  const s = String(v ?? "").trim().toUpperCase().replace(/[\s-]/g, "");
  if (!s) return null;
  const digits = s.startsWith("T") ? s.slice(1) : s;
  if (!/^\d{13}$/.test(digits)) return null;
  return `T${digits}`;
}

export function formatJpDate(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
