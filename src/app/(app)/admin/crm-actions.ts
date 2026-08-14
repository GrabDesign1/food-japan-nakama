"use server";

// 事務局CRM（Phase 11）のサーバーアクション。
// 会員の顧客カルテ（/admin/crm/[memberId]）から呼ぶ。
// 注意：ここで扱うのは事務局の内部記録のみ。会員間メッセージの本文は保存しない（規約17条）。

import { revalidatePath } from "next/cache";
import { requireAdmin, isSuperAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import {
  CRM_NEXT_ACTION_MAX,
  CRM_NOTE_MAX,
  CRM_STAGE_KEYS,
  NOTE_KIND_KEYS,
  parseTags,
} from "@/lib/crm";

/** 同一テナントの会員であることを確かめる（他テナントのIDを渡されても触らせない） */
async function adminMemberOr404(memberId: string) {
  const su = await requireAdmin();
  const member = await prisma.member.findFirst({
    where: { id: memberId, tenantId: su.app.tenantId },
    select: { id: true, name: true, crmStage: true, crmOwnerUserId: true },
  });
  if (!member) throw new Error("会員が見つかりません。");
  return { su, member };
}

/** 担当者・状況・次にやること・期限・タグを保存する */
export async function saveMemberCrm(memberId: string, formData: FormData): Promise<void> {
  const { su, member } = await adminMemberOr404(memberId);

  const g = (k: string, max = 500) => String(formData.get(k) ?? "").trim().slice(0, max);

  const stageRaw = g("crmStage", 20);
  const crmStage = CRM_STAGE_KEYS.has(stageRaw) ? stageRaw : null;

  // 担当者は同一テナントの事務局ユーザーだけを許可する
  const ownerRaw = g("crmOwnerUserId", 40);
  let crmOwnerUserId: string | null = null;
  if (ownerRaw) {
    const owner = await prisma.user.findFirst({
      where: {
        id: ownerRaw,
        tenantId: su.app.tenantId,
        role: { in: ["TENANT_ADMIN", "ADMIN", "REVIEWER"] },
      },
      select: { id: true },
    });
    crmOwnerUserId = owner?.id ?? null;
  }

  const dueRaw = g("crmNextActionDue", 10);
  const crmNextActionDue = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw)
    ? new Date(`${dueRaw}T23:59:59+09:00`)
    : null;

  await prisma.member.update({
    where: { id: member.id },
    data: {
      crmStage,
      crmOwnerUserId,
      crmNextAction: g("crmNextAction", CRM_NEXT_ACTION_MAX) || null,
      crmNextActionDue,
      crmTags: parseTags(g("crmTags", 300)),
    },
  });

  await writeAudit(su, "member.crm_update", {
    targetType: "member",
    targetId: member.id,
    detail: `状況=${crmStage ?? "未設定"} / 担当=${crmOwnerUserId ?? "未設定"}`,
  });
  revalidatePath(`/admin/crm/${member.id}`);
  revalidatePath("/admin");
}

/** 対応履歴（架電・メールなど）を1件追加する */
export async function addMemberNote(memberId: string, formData: FormData): Promise<void> {
  const { su, member } = await adminMemberOr404(memberId);

  const body = String(formData.get("body") ?? "").trim().slice(0, CRM_NOTE_MAX);
  if (!body) return; // 空の記録は作らない

  const kindRaw = String(formData.get("kind") ?? "").trim();
  const kind = NOTE_KIND_KEYS.has(kindRaw) ? kindRaw : "other";

  const occurredRaw = String(formData.get("occurredAt") ?? "").trim(); // datetime-local
  const occurredAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(occurredRaw)
    ? new Date(`${occurredRaw}:00+09:00`)
    : new Date();

  await prisma.memberNote.create({
    data: {
      tenantId: su.app.tenantId,
      memberId: member.id,
      kind,
      body,
      occurredAt,
      authorUserId: su.app.id,
      authorName: su.app.name || su.app.email || "事務局",
    },
  });

  await writeAudit(su, "member.crm_note_add", { targetType: "member", targetId: member.id });
  revalidatePath(`/admin/crm/${member.id}`);
}

/** 対応履歴を削除する（書いた本人か上位管理者のみ。記録の改ざんを防ぐため他人の記録は消せない） */
export async function deleteMemberNote(noteId: string): Promise<void> {
  const su = await requireAdmin();
  const note = await prisma.memberNote.findFirst({
    where: { id: noteId, tenantId: su.app.tenantId },
    select: { id: true, memberId: true, authorUserId: true },
  });
  if (!note) return;
  if (note.authorUserId !== su.app.id && !isSuperAdminRole(su.app.role)) return;

  await prisma.memberNote.delete({ where: { id: note.id } });
  await writeAudit(su, "member.crm_note_delete", {
    targetType: "member",
    targetId: note.memberId,
    detail: `note=${note.id}`,
  });
  revalidatePath(`/admin/crm/${note.memberId}`);
}
