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
import { MAX_ATTACHMENTS } from "@/lib/attachments";
import { loadLockedLeadThreadIds, leadPreview } from "@/lib/lead-unlock";
import { isReaction } from "@/lib/reactions";
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

  // 未開封のリードは、通知メールにも本文を載せない
  // （画面だけ伏せてもメールで全部読めてしまっては同じこと）
  const thread = await prisma.thread.findUnique({
    where: { id: params.threadId },
    select: { id: true, offeringId: true, fromMemberId: true },
  });
  const locked = thread
    ? await loadLockedLeadThreadIds(params.recipientId, [thread])
    : new Set<string>();

  await notifyNewMessage({
    to,
    fromMemberName: params.senderName,
    preview: locked.has(params.threadId)
      ? `${leadPreview(params.body)}\n（この先は、NAKAMAの画面で開封すると読めます）`
      : params.body,
    threadId: params.threadId,
    listingTitle: params.listingTitle,
  });
}

// メッセージ添付は非公開バケット。参加者検証と引き合い課金ゲートを通した署名付きURLでのみ配信する
const ATTACHMENT_BUCKET = "message-attachments";

/** 興味を送る：スレッドが無ければ作成し、最初のメッセージを送る。 */
/**
 * 案件ごとの会話（スレッド）を取得または作成する（2026-08-11）。
 * 従来は会員ペアに1本だったため、同じ相手と複数の案件で話すと1つのスレッドに混ざり、
 * どの案件の話か分からなかった。案件IDまで含めて分ける（案件なしの直接会話は1本のまま）。
 */
export async function findOrCreateThread(params: {
  tenantId: string;
  meId: string;
  otherId: string;
  offeringId: string | null;
}) {
  const { tenantId, meId, otherId, offeringId } = params;
  const existing = await prisma.thread.findFirst({
    where: {
      tenantId,
      offeringId: offeringId ?? null,
      OR: [
        { fromMemberId: meId, toMemberId: otherId },
        { fromMemberId: otherId, toMemberId: meId },
      ],
    },
  });
  if (existing) return existing;
  return prisma.thread.create({
    data: { tenantId, fromMemberId: meId, toMemberId: otherId, offeringId: offeringId ?? null },
  });
}

/**
 * 直近に同じ本文を送っていないか（二重送信のガード）。
 * 反応が遅いと感じて何度も押され、同じメッセージが並んでしまう事故があったため。
 * 押し間違いの範囲を超えないよう2分に限定する（本当に同じ文面を続けて送りたい場合もあるため）。
 */
async function isDuplicateMessage(threadId: string, senderMemberId: string, body: string): Promise<boolean> {
  const since = new Date(Date.now() - 2 * 60 * 1000);
  const found = await prisma.message.findFirst({
    where: { threadId, senderMemberId, body, createdAt: { gte: since } },
    select: { id: true },
  });
  return !!found;
}

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

  // 「探している（調達したい）」案件への新規提案は初回紹介料の対象 → 提案フロー（/propose）へ回す。
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
    where: { id: toMemberId, tenantId: su!.app.tenantId, status: "APPROVED", listed: true },
    select: { id: true },
  });
  if (!target) return;

  const body = trimTo(formData.get("message"), MESSAGE_MAX);
  if (!body) return;

  const thread = await findOrCreateThread({
    tenantId: su!.app.tenantId,
    meId: me.id,
    otherId: toMemberId,
    offeringId: offeringId || null,
  });

  // 反応が遅いと感じて連打されたときに同じ文面が並ばないようにする
  if (await isDuplicateMessage(thread.id, me.id, body)) {
    redirect(`/messages/${thread.id}`);
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

  // 案件に紐づく問い合わせは、案件＋やり取り＋返信が1画面の画面へ送る（提案と同じ体験にする・2026-08-11）。
  // 案件に紐づかない会話は従来どおりメッセージ画面。
  redirect(offeringId ? `/ledger/${offeringId}/proposals/${thread.id}` : `/messages/${thread.id}`);
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
    where: { id: toMemberId, tenantId: su!.app.tenantId, status: "APPROVED", listed: true },
    select: { id: true },
  });
  if (!target) return;

  // 会話（スレッド）だけ用意する。商談・「やり取りあり」はメッセージ送信をトリガーに成立させる。
  // 事業者への直接会話は案件に紐づかないため offeringId=null のスレッドを使う。
  const thread = await findOrCreateThread({
    tenantId: su!.app.tenantId,
    meId: me.id,
    otherId: toMemberId,
    offeringId: null,
  });

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
  // 添付は非公開バケットの保存パス。自スレッド配下のパスだけを受け付ける（複数可）
  const attachments: { path: string; name: string; size: number; sortOrder: number }[] = [];
  for (const [i, raw] of formData.getAll("attachments").map(String).entries()) {
    if (attachments.length >= MAX_ATTACHMENTS) break;
    let parsed: { url?: string; name?: string; size?: number };
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const path = String(parsed.url ?? "");
    const size = Number(parsed.size ?? 0);
    if (!path.startsWith(`${threadId}/`) || path.includes("..") || !Number.isFinite(size) || size <= 0) {
      continue;
    }
    attachments.push({
      path,
      name: String(parsed.name ?? "file").slice(0, 200),
      size: Math.floor(size),
      sortOrder: i,
    });
  }
  if (!body && !attachments.length) return;
  // 連打による二重送信を防ぐ（添付つきは同じ本文でも別物なので対象外）
  if (body && !attachments.length && (await isDuplicateMessage(threadId, me.id, body))) return;

  const unreadBefore = await prisma.message.count({
    where: { threadId, senderMemberId: me.id, readAt: null },
  });

  await prisma.message.create({
    data: {
      threadId,
      senderMemberId: me.id,
      body: body || "（ファイルを送信しました）",
      attachments: attachments.length ? { createMany: { data: attachments } } : undefined,
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

// ── スレッド返信と絵文字リアクション（2026-11-27）─────────────────────────
// ユーザー指示「Slack相当の5機能」のうち、1対1の中で完結する2つ。
//
// ⚠️⚠️ **参加者かどうかを必ずサーバー側で確かめる。** メッセージIDは推測されうるので、
//    クライアントから渡された ID をそのまま信用しない。
// ⚠️⚠️ **リアクションでは通知しない。** 設計の「黙る」段（開けば分かる）。
//    ⚠️ ここでメールを送ると、1往復ごとに何通も飛ぶ。絶対に足さないこと。

/** 自分が参加しているスレッドの発言かどうかを確かめ、スレッドIDを返す。 */
async function assertParticipantMessage(
  messageId: string,
  memberId: string,
): Promise<{ threadId: string }> {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, threadId: true, thread: { select: { fromMemberId: true, toMemberId: true } } },
  });
  if (!msg) throw new Error("メッセージが見つかりません");
  const t = msg.thread;
  if (t.fromMemberId !== memberId && t.toMemberId !== memberId) {
    throw new Error("このやり取りには参加していません");
  }
  return { threadId: msg.threadId };
}

/**
 * 絵文字リアクションを付ける／外す（同じものをもう一度押すと外れる）。
 * ⚠️ 通知しない。⚠️ 未読件数にも数えない。
 */
export async function toggleReaction(messageId: string, emoji: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  if (!isReaction(emoji)) return; // 一覧にないものは受け付けない（src/lib/reactions.ts が唯一の定義）
  const { threadId } = await assertParticipantMessage(messageId, me.id);

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_memberId_emoji: { messageId, memberId: me.id, emoji } },
    select: { id: true },
  });
  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.messageReaction.create({ data: { messageId, memberId: me.id, emoji } });
  }
  revalidatePath(`/messages/${threadId}`);
}

/**
 * スレッド返信（この発言にぶら下げる）。
 * ⚠️⚠️ **入れ子は1段だけ。** 親がすでに誰かの子なら、その親の親にぶら下げる。
 * ⚠️ スレッドの返信は本文に流れない（＝本文が枝葉で埋まらない）。
 * ⚠️ 相手への通知は本文の新着と同じ扱い（未読が溜まっていないときだけメール）。
 */
export async function sendThreadReply(parentMessageId: string, formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const body = trimTo(String(formData.get("body") ?? ""), MESSAGE_MAX);
  if (!body) return;

  const parent = await prisma.message.findUnique({
    where: { id: parentMessageId },
    select: {
      id: true,
      threadId: true,
      parentMessageId: true,
      offeringId: true,
      thread: { select: { fromMemberId: true, toMemberId: true } },
    },
  });
  if (!parent) throw new Error("メッセージが見つかりません");
  const t = parent.thread;
  if (t.fromMemberId !== me.id && t.toMemberId !== me.id) {
    throw new Error("このやり取りには参加していません");
  }
  // 1段に畳む（返信への返信も、同じ親にぶら下げる）
  const rootId = parent.parentMessageId ?? parent.id;

  await prisma.message.create({
    data: {
      threadId: parent.threadId,
      senderMemberId: me.id,
      body,
      parentMessageId: rootId,
      offeringId: parent.offeringId,
    },
  });
  // ⚠️ スレッドの返信でも「最後のやり取り」は進める（一覧の並び順が古いままにならないように）
  await prisma.thread.update({
    where: { id: parent.threadId },
    data: { lastMessageAt: new Date() },
  });

  revalidatePath(`/messages/${parent.threadId}`);
}

// ── グループ（商談から人を招く）2026-11-27 ────────────────────────────────
// ⚠️⚠️ **グループは商談から生やす。** ゼロから作らせない（設計キャンバス④）。
//    1対1で話が始まり、3社目が要る段になってから招く、という順番にしている。
// ⚠️⚠️ **招待は同意制。** 招いた時点では相手は本文を読めない（status=INVITED）。
//    ⚠️ 招く＝相手の会社名と担当者名が他社に見えるということ。本人の承諾なしに参加させない。
// ⚠️ 最初の2人（from/to）は `thread_participants` に行を作らない。
//    ⚠️⚠️ **GROUP になっても from/to はそのまま残す。** 既存の問い合わせ63か所が
//       from/to で絞っているため、ここを崩すと全部を書き換えることになる。

/** 自分がそのスレッドに関われるか（最初の2人、または参加中のメンバー）。 */
export async function canAccessThread(threadId: string, memberId: string): Promise<boolean> {
  const t = await prisma.thread.findUnique({
    where: { id: threadId },
    select: {
      fromMemberId: true,
      toMemberId: true,
      participants: { where: { memberId, status: "JOINED" }, select: { id: true } },
    },
  });
  if (!t) return false;
  return t.fromMemberId === memberId || t.toMemberId === memberId || t.participants.length > 0;
}

/** この商談に人を招く（グループにする）。⚠️ 相手が承諾するまで読めない。 */
export async function inviteToThread(threadId: string, inviteeId: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  if (!(await canAccessThread(threadId, me.id))) throw new Error("このやり取りには参加していません");
  if (inviteeId === me.id) return;

  const t = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { fromMemberId: true, toMemberId: true },
  });
  if (!t) throw new Error("やり取りが見つかりません");
  // 最初の2人は招く必要がない
  if (t.fromMemberId === inviteeId || t.toMemberId === inviteeId) return;

  await prisma.$transaction([
    prisma.threadParticipant.upsert({
      where: { threadId_memberId: { threadId, memberId: inviteeId } },
      create: { threadId, memberId: inviteeId, invitedBy: me.id, status: "INVITED" },
      // 抜けた人をもう一度招くときは、招待し直しになる
      update: { status: "INVITED", invitedBy: me.id, invitedAt: new Date(), leftAt: null },
    }),
    prisma.thread.update({ where: { id: threadId }, data: { kind: "GROUP" } }),
  ]);
  revalidatePath(`/messages/${threadId}`);
}

/** 招待に答える（承諾 or 辞退）。⚠️ 承諾してはじめて本文が読める。 */
export async function respondThreadInvite(threadId: string, accept: boolean): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const row = await prisma.threadParticipant.findUnique({
    where: { threadId_memberId: { threadId, memberId: me.id } },
    select: { id: true, status: true },
  });
  if (!row || row.status !== "INVITED") return;

  if (accept) {
    await prisma.threadParticipant.update({
      where: { id: row.id },
      data: { status: "JOINED", joinedAt: new Date() },
    });
  } else {
    // ⚠️ 辞退は記録を残さず消す（断ったことが相手に伝わらないように）
    await prisma.threadParticipant.delete({ where: { id: row.id } });
  }
  revalidatePath("/messages");
  revalidatePath(`/messages/${threadId}`);
}

/** グループから抜ける。⚠️ 書いたものは消さない（場の記録が虫食いになる）。 */
export async function leaveThread(threadId: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  await prisma.threadParticipant.updateMany({
    where: { threadId, memberId: me.id, status: "JOINED" },
    data: { status: "LEFT", leftAt: new Date() },
  });
  revalidatePath("/messages");
}

/** フォームから招く（相手は仲間の一覧から選ぶ）。⚠️ 画面からはこちらを使う。 */
export async function inviteToThreadForm(threadId: string, formData: FormData): Promise<void> {
  const inviteeId = String(formData.get("inviteeId") ?? "").trim();
  if (!inviteeId) return;
  await inviteToThread(threadId, inviteeId);
}
