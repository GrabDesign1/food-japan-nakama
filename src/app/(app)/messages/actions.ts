"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser, getMemberUserEmails } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDeal, touchDealActivity } from "@/lib/deal";
import { notifyNewMessage } from "@/lib/email";
import { safeAttachmentContentType } from "@/lib/upload";
import {
  trimTo,
  canSendToOthers,
  MESSAGE_MAX,
  TEMPLATE_NAME_MAX,
  TEMPLATE_BODY_MAX,
} from "@/lib/security";

/** 相手が未読を溜めていないときだけメール通知する（連投で通知が洪水にならないように）。 */
async function notifyRecipientIfCaughtUp(params: {
  threadId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  body: string;
  unreadBefore: number;
  listingTitle?: string | null;
}): Promise<void> {
  if (params.unreadBefore > 0) return;
  const to = await getMemberUserEmails(params.recipientId);
  await notifyNewMessage({
    to,
    fromMemberName: params.senderName,
    preview: params.body,
    threadId: params.threadId,
    listingTitle: params.listingTitle,
  });
}

// メッセージ添付は非公開バケット。参加者検証と引き合い課金ゲートを通した署名付きURLでのみ配信する
const ATTACHMENT_BUCKET = "message-attachments";

/** 興味を送る：スレッドが無ければ作成し、最初のメッセージを送る。 */
export async function sendInterest(
  toMemberId: string,
  offeringId: string | null,
  formData: FormData
): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su!);
  if (me.id === toMemberId) return;
  // 非承認・停止の会員は他社へ送信できない
  if (!canSendToOthers(me.status)) return;

  // 「探している」案件への新規提案は初回紹介料の対象 → 提案フロー（/propose）へ回す。
  // 買い手からの問い合わせ（GIVE案件）と、その返信は無料。
  if (offeringId) {
    const target = await prisma.offering.findUnique({
      where: { id: offeringId },
      select: { direction: true, memberId: true },
    });
    if (target && target.direction === "WANT" && target.memberId === toMemberId) {
      const unlocked = await prisma.contactUnlock.findUnique({
        where: { sellerMemberId_offeringId: { sellerMemberId: me.id, offeringId } },
        select: { id: true },
      });
      if (!unlocked) redirect(`/ledger/${offeringId}/propose`);
    }
  }

  // 相手が同一テナントの承認済み会員であることを確認
  const target = await prisma.member.findFirst({
    where: { id: toMemberId, tenantId: su!.app.tenantId, status: "APPROVED" },
    select: { id: true },
  });
  if (!target) return;

  const body = trimTo(formData.get("message"), MESSAGE_MAX);
  if (!body) return;

  let thread = await prisma.thread.findFirst({
    where: {
      tenantId: su!.app.tenantId,
      OR: [
        { fromMemberId: me.id, toMemberId },
        { fromMemberId: toMemberId, toMemberId: me.id },
      ],
    },
  });

  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        tenantId: su!.app.tenantId,
        fromMemberId: me.id,
        toMemberId,
        offeringId: offeringId || null,
      },
    });
  }

  // 相手が既読済みか（通知判定は書き込み前に見る）
  const unreadBefore = await prisma.message.count({
    where: { threadId: thread.id, senderMemberId: me.id, readAt: null },
  });

  await prisma.message.create({
    // 案件の文脈を残す（引き合い課金はメッセージ単位で判定する）
    data: { threadId: thread.id, senderMemberId: me.id, body, offeringId: offeringId || null },
  });
  await prisma.thread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date() },
  });

  // 案件経由の問い合わせなら、メール件名に案件名を入れる
  const listing = offeringId
    ? await prisma.offering.findUnique({ where: { id: offeringId }, select: { title: true } })
    : null;

  await notifyRecipientIfCaughtUp({
    threadId: thread.id,
    senderId: me.id,
    senderName: me.name,
    recipientId: toMemberId,
    body,
    unreadBefore,
    listingTitle: listing?.title || null,
  });

  // 商談を自動作成（phase 0 出会う）
  await ensureDeal({
    tenantId: su!.app.tenantId,
    meId: me.id,
    otherId: toMemberId,
    threadId: thread.id,
  });

  redirect(`/messages/${thread.id}`);
}

/** 事業者に問い合わせる：会話（スレッド）を用意してメッセージ画面へ直行する。 */
export async function startConversation(toMemberId: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su!);
  if (me.id === toMemberId) return;
  if (!canSendToOthers(me.status)) return;

  // 問い合わせは無料（2026-08-10 最終決定書：月額ゲート撤廃）

  // 相手が同一テナントの承認済み会員であることを確認
  const target = await prisma.member.findFirst({
    where: { id: toMemberId, tenantId: su!.app.tenantId, status: "APPROVED" },
    select: { id: true },
  });
  if (!target) return;

  let thread = await prisma.thread.findFirst({
    where: {
      tenantId: su!.app.tenantId,
      OR: [
        { fromMemberId: me.id, toMemberId },
        { fromMemberId: toMemberId, toMemberId: me.id },
      ],
    },
  });

  // 会話（スレッド）だけ用意する。商談・「やり取りあり」はメッセージ送信をトリガーに成立させる。
  if (!thread) {
    thread = await prisma.thread.create({
      data: { tenantId: su!.app.tenantId, fromMemberId: me.id, toMemberId },
    });
  }

  redirect(`/messages/${thread.id}`);
}

/** スレッドに返信 */
export async function sendMessage(
  threadId: string,
  formData: FormData
): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);

  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread || (thread.fromMemberId !== me.id && thread.toMemberId !== me.id)) {
    return;
  }
  if (!canSendToOthers(me.status)) return;

  const body = trimTo(formData.get("message"), MESSAGE_MAX);
  // 添付は非公開バケットの保存パス。自スレッド配下のパスだけを受け付ける
  const attachmentPathRaw = String(formData.get("attachmentUrl") ?? "").trim();
  const attachmentUrl =
    attachmentPathRaw.startsWith(`${threadId}/`) && !attachmentPathRaw.includes("..")
      ? attachmentPathRaw
      : null;
  const attachmentName = String(formData.get("attachmentName") ?? "").trim().slice(0, 200) || null;
  const sizeRaw = Number(formData.get("attachmentSize") ?? 0);
  const attachmentSize =
    attachmentUrl && Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.floor(sizeRaw) : null;
  if (!body && !attachmentUrl) return;

  const unreadBefore = await prisma.message.count({
    where: { threadId, senderMemberId: me.id, readAt: null },
  });

  await prisma.message.create({
    data: {
      threadId,
      senderMemberId: me.id,
      body: body || "（ファイルを送信しました）",
      attachmentUrl,
      attachmentName,
      attachmentSize,
    },
  });
  await prisma.thread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });
  const otherId =
    thread.fromMemberId === me.id ? thread.toMemberId : thread.fromMemberId;

  // 送信したら下書きを消す
  await prisma.messageDraft.deleteMany({ where: { threadId, memberId: me.id } });

  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");

  // 商談の作成とメール通知は画面の応答を待たせない（メールは外部APIで数百ms〜数秒かかる）。
  // after() はレスポンスを返したあとに実行される。
  after(async () => {
    try {
      await ensureDeal({ tenantId: su.app.tenantId, meId: me.id, otherId, threadId });
      await touchDealActivity(me.id, otherId);
      await notifyRecipientIfCaughtUp({
        threadId,
        senderId: me.id,
        senderName: me.name,
        recipientId: otherId,
        body: body || "（ファイルを送信しました）",
        unreadBefore,
      });
    } catch (e) {
      console.error("[messages] 送信後処理に失敗:", e);
    }
  });
}

/** 下書き保存（スレッド参加者のみ） */
export async function saveDraft(
  threadId: string,
  body: string
): Promise<{ ok?: boolean }> {
  const su = await getSessionUser();
  if (!su) return {};
  const me = await getOrCreateMemberForUser(su);
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread || (thread.fromMemberId !== me.id && thread.toMemberId !== me.id)) return {};
  const draft = body.slice(0, MESSAGE_MAX);
  await prisma.messageDraft.upsert({
    where: { threadId_memberId: { threadId, memberId: me.id } },
    create: { threadId, memberId: me.id, body: draft },
    update: { body: draft },
  });
  return { ok: true };
}

/** メッセージテンプレートを作成 */
export async function createTemplate(
  name: string,
  body: string
): Promise<{ id: string; name: string; body: string } | { error: string }> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const me = await getOrCreateMemberForUser(su);
  const n = name.trim().slice(0, TEMPLATE_NAME_MAX);
  const b = body.trim().slice(0, TEMPLATE_BODY_MAX);
  if (!n || !b) return { error: "テンプレート名と本文を入力してください。" };
  const t = await prisma.messageTemplate.create({
    data: { memberId: me.id, name: n, body: b },
  });
  return { id: t.id, name: t.name, body: t.body };
}

/** メッセージテンプレートを削除 */
export async function deleteTemplate(id: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await prisma.messageTemplate.deleteMany({ where: { id, memberId: me.id } });
}

/** 添付ファイルのアップロード */
export async function uploadMessageAttachment(
  threadId: string,
  formData: FormData
): Promise<{ url?: string; name?: string; size?: number; error?: string }> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const me = await getOrCreateMemberForUser(su);
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread || (thread.fromMemberId !== me.id && thread.toMemberId !== me.id)) {
    return { error: "スレッドが見つかりません。" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "ファイルを選んでください。" };
  // Server Action の bodySizeLimit(8MB) を超えるとここに届かないため、上限も8MBに合わせる
  if (file.size > 8 * 1024 * 1024) return { error: "ファイルは8MBまでです。" };

  const safe = file.name.replace(/[^\w.\-一-龠ぁ-んァ-ヶ]/g, "_");
  const path = `${threadId}/${crypto.randomUUID()}-${safe}`;
  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.storage
    .from(ATTACHMENT_BUCKET)
    // contentType はクライアント申告値を使わない（text/html等を配信させない）
    .upload(path, file, { contentType: safeAttachmentContentType(safe) });
  if (upErr) return { error: `アップロード失敗：${upErr.message}` };

  // 非公開バケットなので公開URLは作らない。保存パスだけを返し、配信は /api/attachments 経由で行う
  return { url: path, name: file.name, size: file.size };
}

/** スレッドを開いたとき、相手からの未読を既読にする（本人＝スレッド参加者のみ） */
export async function markThreadRead(threadId: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread || (thread.fromMemberId !== me.id && thread.toMemberId !== me.id)) return;
  await prisma.message.updateMany({
    where: {
      threadId,
      senderMemberId: { not: me.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  // 初回提案の開封記録（14日未読返還の判定に使用。開封＝スレッドを開いた時点）
  await prisma.contactUnlock.updateMany({
    where: { threadId, seekerMemberId: me.id, openedAt: null },
    data: { openedAt: new Date() },
  });
}
