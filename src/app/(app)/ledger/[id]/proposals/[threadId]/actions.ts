"use server";

// 取引条件の提示と合意（Phase 1・2026-08-11）。
// **NAKAMAは当事者にならず、お金も預からない**。当事者間の意思表示を記録するだけ。
// 手数料・仮払い（エスクロー）は未実装＝規約と資金決済法の整理が別途必要。
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser, getMemberUserEmails } from "@/lib/member";
import { prisma } from "@/lib/db";
import { notifyNewMessage } from "@/lib/email";
import { canSendToOthers, trimTo, MESSAGE_MAX } from "@/lib/security";

export type OfferState = { ok?: boolean; error?: string };

/** このスレッドの当事者であること（かつ案件が一致すること）を確かめる。 */
async function participantOr404(offeringId: string, threadId: string) {
  const su = await getSessionUser();
  if (!su) throw new Error("ログインが必要です。");
  const me = await getOrCreateMemberForUser(su);
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread || thread.offeringId !== offeringId) throw new Error("やり取りが見つかりません。");
  if (thread.fromMemberId !== me.id && thread.toMemberId !== me.id) throw new Error("やり取りが見つかりません。");
  const otherId = thread.fromMemberId === me.id ? thread.toMemberId : thread.fromMemberId;
  return { su, me, thread, otherId };
}

/** やり取りに1通メッセージを残し、相手へ通知する（条件のやり取りも会話に残す）。 */
async function postSystemMessage(params: {
  threadId: string;
  offeringId: string;
  senderMemberId: string;
  senderName: string;
  recipientId: string;
  body: string;
}): Promise<void> {
  await prisma.message.create({
    data: {
      threadId: params.threadId,
      senderMemberId: params.senderMemberId,
      body: params.body,
      offeringId: params.offeringId,
    },
  });
  await prisma.thread.update({
    where: { id: params.threadId },
    data: { lastMessageAt: new Date() },
  });
  after(async () => {
    try {
      const to = await getMemberUserEmails(params.recipientId);
      const offering = await prisma.offering.findUnique({
        where: { id: params.offeringId },
        select: { title: true },
      });
      await notifyNewMessage({
        to,
        fromMemberName: params.senderName,
        preview: params.body,
        threadId: params.threadId,
        listingTitle: offering?.title ?? null,
      });
    } catch (e) {
      console.error("[contract] 通知に失敗:", e);
    }
  });
}

function fmtAmount(n: number): string {
  return `${n.toLocaleString()}円（税込）`;
}

function fmtDate(d: Date | null): string {
  return d ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : "未定";
}

/** 新しい条件を提示する（提示中のものがあれば置き換える）。 */
export async function proposeContract(
  offeringId: string,
  threadId: string,
  _prev: OfferState,
  formData: FormData
): Promise<OfferState> {
  const { me, otherId } = await participantOr404(offeringId, threadId);
  if (!canSendToOthers(me.status)) return { error: "現在のご登録状態では提示できません。" };

  const amountRaw = Number(String(formData.get("amount") ?? "").replace(/[^\d]/g, ""));
  if (!Number.isFinite(amountRaw) || amountRaw <= 0 || amountRaw > 1_000_000_000) {
    return { error: "金額を正しく入力してください。" };
  }
  const amount = Math.trunc(amountRaw);
  const quantityText = trimTo(formData.get("quantityText"), 200) || null;
  const terms = trimTo(formData.get("terms"), MESSAGE_MAX) || null;
  const dateRaw = String(formData.get("deliveryDate") ?? "").trim();
  const deliveryDate = dateRaw ? new Date(`${dateRaw}T00:00:00+09:00`) : null;
  if (deliveryDate && Number.isNaN(deliveryDate.getTime())) return { error: "日付を正しく入力してください。" };
  // 消費税率（飲食料品は軽減8%）。請求書の税率区分に使うため、提示の時点で決めておく
  const taxRate = Number(formData.get("taxRate")) === 8 ? 8 : 10;

  await prisma.$transaction([
    // 提示中のものは「置き換え」にする（最新の1件だけが有効）
    prisma.contractOffer.updateMany({
      where: { threadId, status: "proposed" },
      data: { status: "superseded" },
    }),
    prisma.contractOffer.create({
      data: {
        threadId,
        offeringId,
        proposerMemberId: me.id,
        amount,
        quantityText,
        deliveryDate,
        terms,
        taxRate,
      },
    }),
  ]);

  await postSystemMessage({
    threadId,
    offeringId,
    senderMemberId: me.id,
    senderName: me.name,
    recipientId: otherId,
    body:
      `【条件を提示しました】\n` +
      `・金額：${fmtAmount(amount)}（消費税${taxRate}%）\n` +
      (quantityText ? `・数量：${quantityText}\n` : "") +
      `・納品・完了の予定日：${fmtDate(deliveryDate)}\n` +
      (terms ? `・内容：${terms}\n` : "") +
      `\nやり取りの画面で「同意する」または「新しい条件を提示する」を選べます。`,
  });

  revalidatePath(`/ledger/${offeringId}/proposals/${threadId}`);
  return { ok: true };
}

/** 提示された条件に同意する／辞退する（提示した本人は操作できない）。 */
export async function respondToContract(
  offeringId: string,
  threadId: string,
  offerId: string,
  decision: "accept" | "decline",
  _prev: OfferState,
  formData: FormData
): Promise<OfferState> {
  const { me, otherId } = await participantOr404(offeringId, threadId);
  const offer = await prisma.contractOffer.findFirst({
    where: { id: offerId, threadId, status: "proposed" },
  });
  if (!offer) return { error: "この条件はすでに更新されています。画面を再読み込みしてください。" };
  if (offer.proposerMemberId === me.id) return { error: "自分が提示した条件には回答できません。" };

  const note = trimTo(formData.get("note"), MESSAGE_MAX);

  await prisma.contractOffer.update({
    where: { id: offer.id },
    data: {
      status: decision === "accept" ? "accepted" : "declined",
      respondedAt: new Date(),
      respondedBy: me.id,
    },
  });

  // 合意したら商談の進捗も「成約・商品化」に進める（手で直す手間を省く）
  if (decision === "accept") {
    await prisma.deal.updateMany({
      where: { threadId },
      data: { phase: 5, lastActivityAt: new Date() },
    });
  }

  await postSystemMessage({
    threadId,
    offeringId,
    senderMemberId: me.id,
    senderName: me.name,
    recipientId: otherId,
    body:
      decision === "accept"
        ? `【条件に同意しました】\n・金額：${fmtAmount(offer.amount)}\n` +
          (offer.quantityText ? `・数量：${offer.quantityText}\n` : "") +
          `・納品・完了の予定日：${fmtDate(offer.deliveryDate)}\n` +
          (note ? `\n${note}\n` : "") +
          `\n※この合意は当事者間のものです。支払い・納品の方法は、おふたりで取り決めてください。`
        : `【条件を見送りました】\n${note || "今回は見送らせていただきます。"}`,
  });

  revalidatePath(`/ledger/${offeringId}/proposals/${threadId}`);
  return { ok: true };
}

/**
 * 発送・受け渡しの完了を記録する（合意済みの条件が対象）。
 * どちらの当事者からでも押せる（売り手が発送した／買い手が受け取った、のどちらの起点もあるため）。
 * これ自体は事実の記録であり、支払いの完了を意味しない。
 */
export async function completeContract(
  offeringId: string,
  threadId: string,
  offerId: string,
  _prev: OfferState,
  _formData: FormData
): Promise<OfferState> {
  const { me, otherId } = await participantOr404(offeringId, threadId);
  const offer = await prisma.contractOffer.findFirst({
    where: { id: offerId, threadId, status: "accepted" },
  });
  if (!offer) return { error: "合意済みの条件が見つかりません。画面を再読み込みしてください。" };
  if (offer.completedAt) return { ok: true };

  const now = new Date();
  await prisma.contractOffer.update({
    where: { id: offer.id },
    data: { completedAt: now, completedBy: me.id },
  });

  await postSystemMessage({
    threadId,
    offeringId,
    senderMemberId: me.id,
    senderName: me.name,
    recipientId: otherId,
    body:
      `【発送・受け渡しが完了しました】\n` +
      `・完了日：${fmtDate(now)}\n` +
      `・金額：${fmtAmount(offer.amount)}\n` +
      (offer.quantityText ? `・数量：${offer.quantityText}\n` : "") +
      `\nやり取りの画面から納品書・請求書を作成できます（NAKAMAは代金を預かりません）。`,
  });

  revalidatePath(`/ledger/${offeringId}/proposals/${threadId}`);
  return { ok: true };
}

/** 完了の記録を取り消す（押し間違いの取り消し用）。 */
export async function undoCompleteContract(
  offeringId: string,
  threadId: string,
  offerId: string
): Promise<void> {
  await participantOr404(offeringId, threadId);
  await prisma.contractOffer.updateMany({
    where: { id: offerId, threadId, status: "accepted" },
    data: { completedAt: null, completedBy: null },
  });
  revalidatePath(`/ledger/${offeringId}/proposals/${threadId}`);
}

/** このやり取りを見送る（辞退）。どちらの当事者からでも終了できる。 */
export async function closeThread(
  offeringId: string,
  threadId: string,
  _prev: OfferState,
  formData: FormData
): Promise<OfferState> {
  const { me, thread, otherId } = await participantOr404(offeringId, threadId);
  if (thread.closedAt) return { ok: true };
  const reason = trimTo(formData.get("reason"), 1000) || null;

  await prisma.thread.update({
    where: { id: threadId },
    data: { closedAt: new Date(), closedBy: me.id, closedReason: reason },
  });
  // 提示中の条件は宙ぶらりんにせず見送りにする
  await prisma.contractOffer.updateMany({
    where: { threadId, status: "proposed" },
    data: { status: "declined", respondedAt: new Date(), respondedBy: me.id },
  });

  await postSystemMessage({
    threadId,
    offeringId,
    senderMemberId: me.id,
    senderName: me.name,
    recipientId: otherId,
    body: `【今回は見送りとさせていただきます】\n${reason || "ご検討いただきありがとうございました。またの機会によろしくお願いいたします。"}`,
  });

  revalidatePath(`/ledger/${offeringId}/proposals/${threadId}`);
  return { ok: true };
}

/** 見送りを取り消して再開する。 */
export async function reopenThread(offeringId: string, threadId: string): Promise<void> {
  await participantOr404(offeringId, threadId);
  await prisma.thread.update({
    where: { id: threadId },
    data: { closedAt: null, closedBy: null, closedReason: null },
  });
  revalidatePath(`/ledger/${offeringId}/proposals/${threadId}`);
}

/** 秘密保持契約（NDA）の同意リクエストを送る。 */
export async function requestNda(
  offeringId: string,
  threadId: string,
  _prev: OfferState,
  formData: FormData
): Promise<OfferState> {
  const { me, otherId } = await participantOr404(offeringId, threadId);
  const { NDA_TEMPLATE_VERSION } = await import("@/lib/nda");
  const other = await prisma.member.findUnique({
    where: { id: otherId },
    select: { name: true, prefecture: true, city: true, address: true },
  });
  const specialTerms = trimTo(formData.get("specialTerms"), 4000) || null;

  const addressOf = (m: { prefecture: string | null; city: string | null; address: string | null } | null) =>
    [m?.prefecture, m?.city, m?.address].filter(Boolean).join(" ") || null;

  const existing = await prisma.ndaAgreement.findUnique({ where: { threadId } });
  if (existing?.status === "agreed") return { error: "すでに締結済みです。" };

  const data = {
    threadId,
    offeringId,
    requestedBy: me.id,
    partyAName: me.name || "（名称未設定）",
    partyAAddress: addressOf(me),
    partyBName: other?.name || "（名称未設定）",
    partyBAddress: addressOf(other),
    specialTerms,
    templateVersion: NDA_TEMPLATE_VERSION,
    status: "requested",
    agreedBy: null,
    agreedAt: null,
  };
  await prisma.ndaAgreement.upsert({ where: { threadId }, create: data, update: data });

  await postSystemMessage({
    threadId,
    offeringId,
    senderMemberId: me.id,
    senderName: me.name,
    recipientId: otherId,
    body:
      `【秘密保持契約（NDA）の同意リクエストを送りました】\n` +
      `やり取りの画面で内容を確認し、「同意する」を押してください。\n` +
      (specialTerms ? `\n特記事項：${specialTerms}\n` : "") +
      `\n※この契約は当事者間のものです（NAKAMAは当事者になりません）。`,
  });

  revalidatePath(`/ledger/${offeringId}/proposals/${threadId}`);
  return { ok: true };
}

/** NDAに同意する／見送る（リクエストした本人は操作できない）。 */
export async function respondNda(
  offeringId: string,
  threadId: string,
  decision: "agree" | "decline",
  _prev: OfferState,
  _formData: FormData
): Promise<OfferState> {
  const { me, otherId } = await participantOr404(offeringId, threadId);
  const nda = await prisma.ndaAgreement.findUnique({ where: { threadId } });
  if (!nda || nda.status !== "requested") return { error: "対象のリクエストがありません。" };
  if (nda.requestedBy === me.id) return { error: "自分が送ったリクエストには回答できません。" };

  await prisma.ndaAgreement.update({
    where: { threadId },
    data:
      decision === "agree"
        ? { status: "agreed", agreedBy: me.id, agreedAt: new Date() }
        : { status: "declined" },
  });

  await postSystemMessage({
    threadId,
    offeringId,
    senderMemberId: me.id,
    senderName: me.name,
    recipientId: otherId,
    body:
      decision === "agree"
        ? "【秘密保持契約（NDA）に同意しました】\nこれ以降のやり取りは、締結した内容に沿って取り扱ってください。"
        : "【秘密保持契約（NDA）の同意を見送りました】",
  });

  revalidatePath(`/ledger/${offeringId}/proposals/${threadId}`);
  return { ok: true };
}
