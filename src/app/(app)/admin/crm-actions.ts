"use server";

// 事務局CRM（Phase 11）のサーバーアクション。
// 会員の顧客カルテ（/admin/crm/[memberId]）から呼ぶ。
// 注意：ここで扱うのは事務局の内部記録のみ。会員間メッセージの本文は保存しない（規約17条）。

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdmin, isSuperAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { sendAdminMessageEmail } from "@/lib/email";
import { runEmailJob, type JobTarget } from "@/lib/email-job";
import type { Prisma } from "@/generated/prisma/client";
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
      // 名刺・ヒアリングで分かった連絡先（事務局が控える欄。会員のプロフィールとは別物）
      crmPhone: g("crmPhone", 40) || null,
      crmDepartment: g("crmDepartment", 120) || null,
      crmMemo: g("crmMemo", 500) || null,
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

/**
 * 顧客カルテから会員へメールを送る（2026-08-16）。
 *
 * 種別（規約第27条の2）：
 *  - notice＝利用案内（手続きの連絡）。同意の有無に関わらず送れる。
 *  - ad＝広告・宣伝を含む案内。**案内メールに同意した宛先にしか送らない**（特定電子メール法）。
 *    未同意の宛先が選ばれていたらサーバー側で送信を中止する（画面側の制御に依存しない）。
 *
 * 送信内容は対応履歴（MemberNote）に自動で残し、監査ログにも記録する。
 */
export async function sendMemberEmail(
  memberId: string,
  _prev: { ok?: boolean; error?: string; message?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; error?: string; message?: string }> {
  const { su, member } = await adminMemberOr404(memberId);

  const kind = String(formData.get("kind") ?? "") === "ad" ? "ad" : "notice";
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim().slice(0, CRM_NOTE_MAX);
  const toIds = formData.getAll("to").map((v) => String(v));

  if (!subject) return { error: "件名を入力してください。" };
  if (!body) return { error: "本文を入力してください。" };
  if (toIds.length === 0) return { error: "送信先を1人以上選んでください。" };

  // 宛先はこの会員に属するユーザーだけ（他会員のIDを渡されても送らない）
  const users = await prisma.user.findMany({
    where: { id: { in: toIds }, memberId: member.id, tenantId: su.app.tenantId, status: "ACTIVE" },
    select: { id: true, name: true, email: true, marketingOptInAt: true },
  });
  if (users.length === 0) return { error: "送信できる宛先が見つかりませんでした。" };

  if (kind === "ad") {
    const ng = users.filter((u) => !u.marketingOptInAt);
    if (ng.length > 0) {
      return {
        error: `案内メールに同意していない宛先が含まれています（${ng
          .map((u) => u.email)
          .join("、")}）。広告・宣伝を含む内容は送れません。手続きの連絡として送るか、宛先から外してください。`,
      };
    }
  }

  const senderName = su.app.name || "担当者";
  for (const u of users) {
    await sendAdminMessageEmail({ to: u.email, subject, body, kind, senderName });
  }

  // 送った内容をそのまま対応履歴に残す（あとから「何を送ったか」を追えるように）
  await prisma.memberNote.create({
    data: {
      tenantId: su.app.tenantId,
      memberId: member.id,
      kind: "email",
      body: `【${kind === "ad" ? "案内メール（広告あり）" : "利用案内メール"}を送信】\n宛先：${users
        .map((u) => u.email)
        .join("、")}\n件名：${subject}\n\n${body}`,
      occurredAt: new Date(),
      authorUserId: su.app.id,
      authorName: senderName,
    },
  });

  await writeAudit(su, "member.email_send", {
    targetType: "member",
    targetId: member.id,
    detail: `${kind === "ad" ? "広告あり" : "利用案内"} / 宛先${users.length}件 / 件名=${subject.slice(0, 60)}`,
  });

  revalidatePath(`/admin/crm/${member.id}`);
  return { ok: true, message: `${users.length}件に送信し、対応履歴に記録しました。` };
}

/**
 * 会員一覧から、選んだ会員へまとめてメールを送る（2026-08-16）。
 *
 * **送信はバックグラウンドで行う**＝ここでは宛先を確定してジョブを作るだけで、すぐ画面に返す。
 * 実際の送信は `after()` で応答後に進み、途中で止まっても日次バッチが続きを送る（src/lib/email-job.ts）。
 *
 * 種別の扱い（規約第27条の2・特定電子メール法）：
 *  - notice＝利用案内。同意の有無に関わらず送れる。
 *  - ad＝広告・宣伝を含む案内。**未同意の宛先は最初から外す**（個別送信と違い、一括は送れる相手にだけ送る）。
 *  - 停止中（SUSPENDED）の会員はどちらの種別でも送らない。
 */
export async function sendBulkEmail(
  _prev: { ok?: boolean; error?: string; message?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; error?: string; message?: string }> {
  const su = await requireAdmin();

  const kind = String(formData.get("kind") ?? "") === "ad" ? "ad" : "notice";
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim().slice(0, CRM_NOTE_MAX);
  const memberIds = formData.getAll("memberIds").map((v) => String(v));

  if (!subject) return { error: "件名を入力してください。" };
  if (!body) return { error: "本文を入力してください。" };
  if (memberIds.length === 0) return { error: "送信先の会員を選んでください。" };

  const members = await prisma.member.findMany({
    where: { id: { in: memberIds }, tenantId: su.app.tenantId },
    select: {
      id: true,
      name: true,
      status: true,
      users: {
        where: { status: "ACTIVE" },
        select: { email: true, marketingOptInAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const targets: JobTarget[] = [];
  let skipped = 0;
  for (const m of members) {
    if (m.status === "SUSPENDED") {
      skipped += m.users.length;
      continue;
    }
    const ok = kind === "ad" ? m.users.filter((u) => u.marketingOptInAt) : m.users;
    skipped += m.users.length - ok.length;
    for (const u of ok) {
      targets.push({ memberId: m.id, memberName: m.name || "（名称未設定）", email: u.email });
    }
  }

  if (targets.length === 0) {
    return {
      error:
        kind === "ad"
          ? "選んだ会員に、案内メールへ同意した宛先がありません。手続きの連絡として送るか、宛先を選び直してください。"
          : "送信できる宛先がありません。",
    };
  }

  const senderName = su.app.name || "担当者";
  const job = await prisma.emailJob.create({
    data: {
      tenantId: su.app.tenantId,
      createdByUserId: su.app.id,
      createdByName: senderName,
      kind,
      subject,
      body,
      targets: targets as unknown as Prisma.InputJsonValue,
      skippedCount: skipped,
    },
    select: { id: true },
  });

  await writeAudit(su, "member.bulk_email_send", {
    targetType: "member",
    detail: `${kind === "ad" ? "広告あり" : "利用案内"} / 宛先${targets.length}件 / 対象外${skipped}件 / 件名=${subject.slice(0, 60)}`,
  });

  // 応答を返したあとに送信を進める（画面は待たせない）
  after(() => runEmailJob(job.id).catch((e) => console.error("[bulk email] 送信に失敗:", e)));

  revalidatePath("/admin/members");
  return {
    ok: true,
    message:
      `${targets.length}件へ送信を開始しました。` +
      (skipped > 0
        ? kind === "ad"
          ? `（${skipped}件は案内メール未同意または停止中のため送りません）`
          : `（${skipped}件は停止中のため送りません）`
        : "") +
      "送信が終わると、各会員の対応履歴に記録されます。",
  };
}
