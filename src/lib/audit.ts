// 監査ログ（事務局の重要操作の記録。HANDOVER 11章・規約17条「記録の下で」）。
// 記録失敗で本処理を止めない（ログはベストエフォート、ただしエラーは出力する）。
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export async function writeAudit(
  su: SessionUser,
  action: string,
  opts?: { targetType?: string; targetId?: string; detail?: string }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: su.app.tenantId,
        actorUserId: su.app.id,
        actorEmail: su.app.email,
        action,
        targetType: opts?.targetType ?? null,
        targetId: opts?.targetId ?? null,
        detail: opts?.detail ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] 記録に失敗:", e);
  }
}
