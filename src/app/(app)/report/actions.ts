"use server";

// 違反報告の受付（2026-08-11）。会員が事務局へ知らせるための導線。
// 判断と対応は事務局が行い、報告者への個別回答は約束しない（画面にも明記する）。
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { notifyAdminLines } from "@/lib/email";
import { trimTo } from "@/lib/security";
import { VIOLATION_KIND_LABEL } from "@/lib/violation";

export type ReportState = { ok?: boolean; error?: string };

const TARGET_TYPES = new Set(["member", "offering", "thread"]);

export async function submitViolationReport(
  _prev: ReportState,
  formData: FormData
): Promise<ReportState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const me = await getOrCreateMemberForUser(su);

  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const detail = trimTo(formData.get("detail"), 4000) || null;

  if (!TARGET_TYPES.has(targetType) || !targetId) return { error: "報告の対象が不正です。" };
  if (!VIOLATION_KIND_LABEL[kind]) return { error: "違反の種類を選んでください。" };

  // 同じ対象への連続投稿を防ぐ（誤操作・連打対策）
  const recent = await prisma.violationReport.findFirst({
    where: {
      reporterMemberId: me.id,
      targetType,
      targetId,
      createdAt: { gte: new Date(Date.now() - 5 * 60_000) },
    },
    select: { id: true },
  });
  if (recent) return { ok: true };

  const report = await prisma.violationReport.create({
    data: {
      tenantId: su.app.tenantId,
      reporterMemberId: me.id,
      targetType,
      targetId,
      kind,
      detail,
    },
  });

  // 事務局へ通知（失敗しても受付自体は成立させる）
  after(async () => {
    try {
      await notifyAdminLines({
        subject: "違反報告が届きました",
        lines: [
          `報告者：${me.name || "（名称未設定）"}（${me.id}）`,
          `対象：${targetType} / ${targetId}`,
          `種類：${VIOLATION_KIND_LABEL[kind]}`,
          `詳細：${detail || "（記載なし）"}`,
          `受付ID：${report.id}`,
        ],
      });
    } catch (e) {
      console.error("[report] 事務局通知に失敗:", e);
    }
  });

  revalidatePath("/admin/reports");
  return { ok: true };
}

/** 事務局：対応状況の更新（上位管理者のみ）。 */
export async function updateViolationReport(
  reportId: string,
  formData: FormData
): Promise<void> {
  const { requireSuperAdmin } = await import("@/lib/auth");
  const su = await requireSuperAdmin();
  const status = String(formData.get("status") ?? "");
  if (!["new", "reviewing", "handled", "dismissed"].includes(status)) return;
  const adminNote = trimTo(formData.get("adminNote"), 2000) || null;
  await prisma.violationReport.updateMany({
    where: { id: reportId, tenantId: su.app.tenantId },
    data: { status, adminNote },
  });
  revalidatePath("/admin/reports");
}
