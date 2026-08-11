// 商談のフェーズ定義（prisma を含まない純粋な定数。クライアントからも安全に import 可能）。
//
// 2026-08-12：取引の実務に合わせて作り直した（旧：出会う〜成約・商品化の6段階）。
// 成約したあとの「発送→受け取り→請求→入金」までを1本の流れとして追えるようにしている。
export const PHASES = [
  "ご商談",
  "ご契約",
  "発送",
  "受け取り",
  "納品書・請求書発行",
  "入金確認",
  "完了（領収書発行）",
] as const;

export const PHASE_DESC: string[] = [
  "条件を話し合っている段階",
  "条件に合意した",
  "商品を発送・お渡しした",
  "相手が受け取った",
  "納品書・請求書を発行した",
  "入金を確認した",
  "領収書を発行し、この取引は完了",
];

// 段階は**実際の操作から自動で進む**。利用者が手で動かすと事実と食い違うため、
// 画面では表示だけにしている（クリックで変更しない）。
export const PHASE_CONTRACTED = 1; // 条件に同意した
export const PHASE_SHIPPED = 2;    // 売り手が発送を記録した
export const PHASE_RECEIVED = 3;   // 買い手が受け取りを記録した
export const PHASE_DOCS = 4;       // 納品書・請求書を発行した
export const PHASE_PAID = 5;       // 売り手が入金を確認した
export const PHASE_DONE = PHASES.length - 1; // 領収書を発行した＝完了

const STALE_MS = 30 * 24 * 60 * 60 * 1000;

export function isStale(lastActivityAt: Date): boolean {
  return Date.now() - lastActivityAt.getTime() > STALE_MS;
}
