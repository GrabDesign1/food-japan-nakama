// 商談のフェーズ定義（prisma を含まない純粋な定数。クライアントからも安全に import 可能）。
export const PHASES = [
  "出会う",
  "初回商談",
  "条件整理",
  "試作・PoC",
  "実証",
  "成約・商品化",
] as const;

export const PHASE_DESC: string[] = [
  "興味の送受信のみ。まだ話していない",
  "一度会った・話した",
  "数量・価格・時期を詰めている",
  "サンプルや試験を回している",
  "実際の売り場・店舗・ルートで検証中",
  "継続的な取引になった",
];

const STALE_MS = 30 * 24 * 60 * 60 * 1000;

export function isStale(lastActivityAt: Date): boolean {
  return Date.now() - lastActivityAt.getTime() > STALE_MS;
}
