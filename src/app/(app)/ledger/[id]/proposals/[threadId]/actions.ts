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
      `・金額：${fmtAmount(amount)}\n` +
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
