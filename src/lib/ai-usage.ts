// 下書き支援の利用回数（2026-08-14）。
//
// 専用テーブルは作らず、監査ログの件数をそのまま回数として数える。
// 台帳（売りたい）とプロフィールで**上限を共有**する（合わせて1日20回）。
// 別々にすると、片方を使い切ってからもう片方で続けられてしまうため。
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";
import { AI_DRAFT_DAILY_LIMIT } from "@/lib/ai";

export const AI_ACTION_OFFERING = "ai.draft_offering";
export const AI_ACTION_PROFILE = "ai.draft_profile";
const AI_ACTIONS = [AI_ACTION_OFFERING, AI_ACTION_PROFILE];

/** 直近24時間の利用回数。 */
export async function aiDraftUsedToday(su: SessionUser): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.auditLog.count({
    where: {
      tenantId: su.app.tenantId,
      actorUserId: su.app.id,
      action: { in: AI_ACTIONS },
      createdAt: { gte: since },
    },
  });
}

/** 上限に達しているときのメッセージ（達していなければ null）。 */
export async function aiDraftLimitReached(su: SessionUser): Promise<string | null> {
  const used = await aiDraftUsedToday(su);
  if (used < AI_DRAFT_DAILY_LIMIT) return null;
  return `下書きの作成は1日${AI_DRAFT_DAILY_LIMIT}回までです。明日またお試しください。`;
}

/** 成功したときだけ回数に数える（エラーで枠を消費させない）。 */
export async function recordAiDraftUse(
  su: SessionUser,
  action: string,
  detail: string
): Promise<void> {
  await writeAudit(su, action, { targetType: "member", targetId: su.app.id, detail });
}
