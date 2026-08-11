// 添付ファイルの上限。クライアント（フォーム）とサーバー（検証）の両方から読むため、
// server専用の依存を持たない独立したモジュールに置く。
// （security.ts は prisma や next/headers を使うので、client component から import できない）

/** 1通のメッセージ・提案に添付できるファイル数の上限。 */
export const MAX_ATTACHMENTS = 5;
