"use server";

// 「探している（調達したい）」案件への初回提案（初回紹介料）。
// 課金単位＝売り手会員×案件（同一案件・同一相手の継続メッセージは無料）。
// 判定・価格・クレジット消費はすべてサーバー側で確定する。
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser, getMemberUserEmails } from "@/lib/member";
import { prisma } from "@/lib/db";
import { ensureDeal } from "@/lib/deal";
import { notifyNewMessage } from "@/lib/email";
import { pricingTierFor, creditCostFor } from "@/lib/billing-core";
import { consumeCreditsTx } from "@/lib/contact-credits";
import { createOneTimeCheckout } from "@/lib/billing";
import { canSendToOthers, MESSAGE_MAX } from "@/lib/security";
import { MAX_ATTACHMENTS } from "@/lib/attachments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { safeAttachmentContentType } from "@/lib/upload";

export type ProposeState = { error?: string };

// 添付は非公開バケット。提案はまだスレッドが無いので、送信前は会員ごとのフォルダに置き、
// 送信時にそのままメッセージへ紐づける（配信は /api/attachments/[messageId] が参加者検証をする）。
const ATTACHMENT_BUCKET = "message-attachments";
const PROPOSAL_PREFIX = "proposals";

/** 提案対象として有効なWANT案件を取得（公開・承認済み会員・本人以外）。 */
async function loadTarget(offeringId: string, meId: string, tenantId: string) {
  const offering = await prisma.offering.findFirst({
    where: {
      id: offeringId,
      direction: "WANT",
      isPublic: true,
      title: { not: "" },
      // 非公開募集（有料オプション）には提案できない
      visibility: { not: "private" },
      member: { tenantId, status: "APPROVED" },
    },
    include: { member: { select: { id: true, name: true } } },
  });
  if (!offering) return null;
  if (offering.memberId === meId) return null;
  // 募集期限切れは受け付けない（終了案件への課金を防ぐ）
  if (offering.applicationDeadline && offering.applicationDeadline.getTime() < Date.now()) return null;
  return offering;
}

/**
 * 提案に添付するファイルを先にアップロードする（送信前なのでスレッドはまだ無い）。
 * 置き場所は `proposals/<memberId>/…` で、送信時にこのパスをメッセージへ紐づける。
 * 送信されなかったファイルは孤児として残る（台帳の一時画像と同じ扱い・定期掃除は未実装）。
 */
export async function uploadProposalAttachment(
  offeringId: string,
  formData: FormData
): Promise<{ url?: string; name?: string; size?: number; error?: string }> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const me = await getOrCreateMemberForUser(su);
  if (!canSendToOthers(me.status)) return { error: "現在のご登録状態では送信できません。" };

  // 提案できない案件（終了・非公開・自分の案件）ではアップロードもさせない
  const offering = await loadTarget(offeringId, me.id, su.app.tenantId);
  if (!offering) return { error: "この案件には提案できません。" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "ファイルを選んでください。" };
  // Server Action の bodySizeLimit(8MB) を超えるとここに届かないため、上限も8MBに合わせる
  if (file.size > 8 * 1024 * 1024) return { error: "ファイルは8MBまでです。" };

  const safe = file.name.replace(/[^\w.\-一-龠ぁ-んァ-ヶ]/g, "_");
  const path = `${PROPOSAL_PREFIX}/${me.id}/${crypto.randomUUID()}-${safe}`;
  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.storage
    .from(ATTACHMENT_BUCKET)
    // contentType はクライアント申告値を使わない（text/html等を配信させない）
    .upload(path, file, { contentType: safeAttachmentContentType(safe) });
  if (upErr) return { error: `アップロード失敗：${upErr.message}` };

  return { url: path, name: file.name, size: file.size };
}

/** 初回提案を送信する。未解放なら紹介料（通常1・確認済み案件3クレジット）を消費して解放する。 */
export async function sendProposal(
  offeringId: string,
  _prev: ProposeState,
  formData: FormData
): Promise<ProposeState> {
  const su = await getSessionUser();
  if (!su) redirect(`/login?next=${encodeURIComponent(`/ledger/${offeringId}/propose`)}`);
  const me = await getOrCreateMemberForUser(su!);

  if (!canSendToOthers(me.status)) {
    return { error: "現在のご登録状態では提案を送信できません。事務局までお問い合わせください。" };
  }

  const offering = await loadTarget(offeringId, me.id, su!.app.tenantId);
  if (!offering) return { error: "この案件には提案できません（終了・非公開・またはご自身の案件です）。" };

  const body = String(formData.get("message") ?? "").trim().slice(0, MESSAGE_MAX);
  if (!body) return { error: "提案内容を入力してください。" };

  // 添付は uploadProposalAttachment が返したパスのみ受け付ける
  // （他人のファイルや任意のパスを紐づけられないよう、自分のフォルダ配下に限定する）
  const rawAttachments = formData.getAll("attachments").map(String);
  if (rawAttachments.length > MAX_ATTACHMENTS) {
    return { error: `添付できるファイルは${MAX_ATTACHMENTS}件までです。` };
  }
  const attachments: { path: string; name: string; size: number; sortOrder: number }[] = [];
  for (const [i, raw] of rawAttachments.entries()) {
    let parsed: { url?: string; name?: string; size?: number };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { error: "添付ファイルを認識できませんでした。もう一度添付してください。" };
    }
    const path = String(parsed.url ?? "");
    const size = Number(parsed.size ?? 0);
    if (!path.startsWith(`${PROPOSAL_PREFIX}/${me.id}/`) || !Number.isFinite(size) || size <= 0) {
      return { error: "添付ファイルを認識できませんでした。もう一度添付してください。" };
    }
    attachments.push({
      path,
      name: String(parsed.name ?? "file").slice(0, 200),
      size: Math.floor(size),
      sortOrder: i,
    });
  }

  // 提示額（任意）。掲載者が一覧で比較するための目安で、契約・合意ではない。
  const amountRaw = Number(String(formData.get("proposedAmount") ?? "").replace(/[^\d]/g, ""));
  const proposedAmount =
    Number.isFinite(amountRaw) && amountRaw > 0 && amountRaw <= 1_000_000_000 ? Math.trunc(amountRaw) : null;

  // ビジネス会員も提案クレジットを消費する（毎月50クレジット付与・繰越なし。2026-08-11確定）。
  // 会員特典は「毎月の付与」と「追加クレジット（単品購入）・掲載オプションの20%割引」に集約した。
  // 消費数は通常案件1／確認済み案件3（クレジットは1種類）。
  const tier = pricingTierFor(offering.verifiedLeadAt, new Date());
  const creditCost = creditCostFor(tier);

  let threadId: string | null = null;
  let notifyUnread = 0;

  try {
    threadId = await prisma.$transaction(async (tx) => {
      // 解放済みか（同一キーの二重課金防止）
      const existing = await tx.contactUnlock.findUnique({
        where: {
          sellerMemberId_offeringId: { sellerMemberId: me.id, offeringId: offering.id },
        },
      });

      let unlockId = existing?.id ?? null;
      if (!existing) {
        const unlock = await tx.contactUnlock.create({
          data: {
            tenantId: su!.app.tenantId,
            sellerMemberId: me.id,
            offeringId: offering.id,
            seekerMemberId: offering.memberId,
            pricingTier: tier,
            status: "unlocked",
            unreadRefundDueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
        unlockId = unlock.id;

        const consumed = await consumeCreditsTx(tx, {
          tenantId: su!.app.tenantId,
          memberId: me.id,
          contactUnlockId: unlock.id,
          quantity: creditCost,
        });
        if (!consumed) throw new Error("NO_CREDIT");
        await tx.contactUnlock.update({
          where: { id: unlock.id },
          // 複数ロットに跨る場合は先頭の消費エントリを記録（返還は contactUnlockId で全件を辿る）
          data: { creditLedgerEntryId: consumed.ledgerEntryIds[0] },
        });
      }

      // スレッドは案件ごとに分ける（2026-08-11。従来は会員ペアで1本だったため
      // 同じ相手との別案件の会話が混ざっていた）
      let thread = await tx.thread.findFirst({
        where: {
          offeringId: offering.id,
          OR: [
            { fromMemberId: me.id, toMemberId: offering.memberId },
            { fromMemberId: offering.memberId, toMemberId: me.id },
          ],
        },
      });
      if (!thread) {
        thread = await tx.thread.create({
          data: {
            tenantId: su!.app.tenantId,
            fromMemberId: me.id,
            toMemberId: offering.memberId,
            offeringId: offering.id,
            proposedAmount,
          },
        });
      } else if (proposedAmount != null) {
        // 提示額は最新のものを残す（掲載者は一覧で最新の金額を見る）
        await tx.thread.update({ where: { id: thread.id }, data: { proposedAmount } });
      }

      notifyUnread = await tx.message.count({
        where: { threadId: thread.id, senderMemberId: me.id, readAt: null },
      });

      const message = await tx.message.create({
        // 案件の文脈を残す（引き合い課金の判定はメッセージ単位で行う。WANT提案は紹介料モデル＝対象外）
        data: {
          threadId: thread.id,
          senderMemberId: me.id,
          body,
          offeringId: offering.id,
          // 添付は複数可（旧列 attachmentUrl は既存メッセージの表示専用で、新規は使わない）
          attachments: attachments.length ? { createMany: { data: attachments } } : undefined,
        },
      });
      await tx.thread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date() } });

      // 初回提案メッセージを未読返還の判定対象として記録
      if (unlockId) {
        await tx.contactUnlock.update({
          where: { id: unlockId },
          data: {
            threadId: thread.id,
            ...(existing?.messageId ? {} : { messageId: message.id }),
          },
        });
      }
      return thread.id;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NO_CREDIT") {
      return {
        error: `紹介クレジットが不足しています（この案件には${creditCost}クレジット必要です）。下の購入からお求めください。`,
      };
    }
    console.error("[propose] 送信失敗:", e);
    return { error: "送信に失敗しました。時間をおいて再度お試しください。" };
  }

  // 通知・商談作成（失敗しても送信自体は成立）
  try {
    if (notifyUnread === 0) {
      const to = await getMemberUserEmails(offering.memberId);
      await notifyNewMessage({
        to,
        fromMemberName: me.name,
        preview: body,
        threadId: threadId!,
        listingTitle: offering.title,
      });
    }
    await ensureDeal({
      tenantId: su!.app.tenantId,
      meId: me.id,
      otherId: offering.memberId,
      threadId: threadId!,
    });
  } catch (e) {
    console.error("[propose] 通知失敗:", e);
  }

  // 案件とやり取りを1画面につなぐため、送信後は案件ごとのやり取り画面へ戻す（2026-08-11）
  redirect(`/ledger/${offering.id}/proposals/${threadId}`);
}

/** 紹介料・クレジットパックの購入（Stripe Checkout）。決済後は提案ページへ戻る。 */
export async function buyProposalProduct(
  offeringId: string,
  productCode: string,
  _prev: ProposeState,
  _formData: FormData
): Promise<ProposeState> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su!);

  // 購入できるのは紹介料系の商品のみ（掲載オプションはこの導線から買わせない）
  const allowed = new Set([
    "contact_unlock_standard",
    "contact_unlock_verified_lead",
    "contact_credits_5",
    "contact_credits_10",
  ]);
  if (!allowed.has(productCode)) return { error: "この商品は購入できません。" };

  // 注文に他人の案件IDが記録されないよう、提案先として妥当な案件かを確認する
  const offering = await loadTarget(offeringId, me.id, su!.app.tenantId);
  if (!offering) return { error: "この案件には提案できません（終了・非公開・またはご自身の案件です）。" };

  const result = await createOneTimeCheckout({
    tenantId: su!.app.tenantId,
    memberId: me.id,
    isMember: me.paymentStatus === "PAID",
    email: su!.app.email,
    productCode,
    offeringId,
    returnPath: `/ledger/${offeringId}/propose`,
  });
  if (result.error) return { error: result.error };
  redirect(result.url!);
}
