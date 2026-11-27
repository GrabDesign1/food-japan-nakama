/**
 * 【携帯番号】2026-11-28 ユーザー指示「携帯番号は登録するようにして」「登録必須」。
 *
 * ⚠️⚠️ **この番号を名簿・事業者ページに出さない。** 本人の同意なく掲載しない（2026-11-26 ユーザー指示）。
 *    使うのは、事務局からの緊急のご連絡と、将来のSMS通知だけ。
 * ⚠️ `Member.crmPhone`（事務局が入力した会社の代表番号）とは**別物**。SMSに流用しないこと。
 * ⚠️⚠️ **まだ本人確認（SMS認証）はしていない。** 他人の番号も書けてしまう状態なので、
 *    SMSを実際に送り始める前に、認証コードの往復を入れること。
 */

/** 全角数字→半角、空白・括弧・記号を落として、数字とハイフンだけにする。 */
export function normalizeMobile(raw: string): string {
  if (!raw) return "";
  const half = raw.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  return half.replace(/[^0-9-]/g, "");
}

/**
 * 日本の携帯番号として成り立っているか。
 * ⚠️ 070 / 080 / 090 の11桁だけを通す（固定電話を弾くため＝SMSが届かない番号を登録させない）。
 * ⚠️ 国際表記（+81）は、頭の +81 を 0 に戻してから見る。
 */
export function isValidMobile(raw: string): boolean {
  let d = normalizeMobile(raw).replace(/-/g, "");
  if (d.startsWith("81") && d.length === 12) d = `0${d.slice(2)}`;
  return /^0[789]0\d{8}$/.test(d);
}

/** 画面に出すときの体裁（090-1234-5678）。⚠️ 出してよいのは本人と事務局だけ。 */
export function formatMobile(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = normalizeMobile(raw).replace(/-/g, "");
  if (!/^0[789]0\d{8}$/.test(d)) return raw;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
