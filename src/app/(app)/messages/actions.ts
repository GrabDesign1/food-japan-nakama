"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDeal, touchDealActivity } from "@/lib/deal";

const BUCKET = "member-images";

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

  // フリープランはメッセージ送信不可。アップグレードへ誘導。
  if (me.paymentStatus !== "PAID") redirect("/billing");

  const body = String(formData.get("message") ?? "").trim();
  if (!body) return;

  let thread = await prisma.thread.findFirst({
    where: {
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

  await prisma.message.create({
    data: { threadId: thread.id, senderMemberId: me.id, body },
  });
  await prisma.thread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date() },
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

  // フリープランは問い合わせ不可 → アップグレードへ
  if (me.paymentStatus !== "PAID") redirect("/billing");

  let thread = await prisma.thread.findFirst({
    where: {
      OR: [
        { fromMemberId: me.id, toMemberId },
        { fromMemberId: toMemberId, toMemberId: me.id },
      ],
    },
  });

  if (!thread) {
    thread = await prisma.thread.create({
      data: { tenantId: su!.app.tenantId, fromMemberId: me.id, toMemberId },
    });
    // 初回接触で商談を自動作成（phase 0 出会う）
    await ensureDeal({
      tenantId: su!.app.tenantId,
      meId: me.id,
      otherId: toMemberId,
      threadId: thread.id,
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
  // フリープランは送信・返信不可。アップグレードへ誘導。
  if (me.paymentStatus !== "PAID") redirect("/billing");
  const body = String(formData.get("message") ?? "").trim();
  const attachmentUrl = String(formData.get("attachmentUrl") ?? "").trim() || null;
  const attachmentName = String(formData.get("attachmentName") ?? "").trim() || null;
  if (!body && !attachmentUrl) return;

  await prisma.message.create({
    data: {
      threadId,
      senderMemberId: me.id,
      body: body || "（ファイルを送信しました）",
      attachmentUrl,
      attachmentName,
    },
  });
  await prisma.thread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });
  // 商談の最終活動日を更新
  const otherId =
    thread.fromMemberId === me.id ? thread.toMemberId : thread.fromMemberId;
  await touchDealActivity(me.id, otherId);
  // 送信したら下書きを消す
  await prisma.messageDraft.deleteMany({ where: { threadId, memberId: me.id } });

  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
}

/** 下書き保存 */
export async function saveDraft(
  threadId: string,
  body: string
): Promise<{ ok?: boolean }> {
  const su = await getSessionUser();
  if (!su) return {};
  const me = await getOrCreateMemberForUser(su);
  await prisma.messageDraft.upsert({
    where: { threadId_memberId: { threadId, memberId: me.id } },
    create: { threadId, memberId: me.id, body },
    update: { body },
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
  const n = name.trim();
  const b = body.trim();
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
): Promise<{ url?: string; name?: string; error?: string }> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const me = await getOrCreateMemberForUser(su);
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread || (thread.fromMemberId !== me.id && thread.toMemberId !== me.id)) {
    return { error: "スレッドが見つかりません。" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "ファイルを選んでください。" };
  if (file.size > 10 * 1024 * 1024) return { error: "ファイルは10MBまでです。" };

  const safe = file.name.replace(/[^\w.\-一-龠ぁ-んァ-ヶ]/g, "_");
  const path = `messages/${threadId}/${crypto.randomUUID()}-${safe}`;
  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (upErr) return { error: `アップロード失敗：${upErr.message}` };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, name: file.name };
}

/** スレッドを開いたとき、相手からの未読を既読にする */
export async function markThreadRead(threadId: string, myMemberId: string) {
  await prisma.message.updateMany({
    where: { threadId, senderMemberId: { not: myMemberId }, readAt: null },
    data: { readAt: new Date() },
  });
}
