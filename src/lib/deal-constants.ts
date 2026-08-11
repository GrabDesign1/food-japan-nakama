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

/** 契約（合意）済みを表すフェーズ番号。条件に同意したときここまで進める */
export const PHASE_CONTRACTED = 1;
/** 完了を表すフェーズ番号 */
export const PHASE_DONE = PHASES.length - 1;

const STALE_MS = 30 * 24 * 60 * 60 * 1000;

export function isStale(lastActivityAt: Date): boolean {
  return Date.now() - lastActivityAt.getTime() > STALE_MS;
}
