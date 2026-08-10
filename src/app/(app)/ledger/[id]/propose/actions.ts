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
import { pricingTierFor, creditTypeForTier } from "@/lib/billing-core";
import { consumeOneCreditTx } from "@/lib/contact-credits";
import { createOneTimeCheckout } from "@/lib/billing";
import { canSendToOthers, MESSAGE_MAX } from "@/lib/security";

export type ProposeState = { error?: string };

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

/** 初回提案を送信する。未解放なら紹介料（クレジット1件）を消費して解放する。 */
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

  // ビジネス会員も提案チケットを消費する（毎月20件付与・繰越なし。2026-08-11確定）。
  // 会員特典は「追加チケットと掲載オプションの20%割引」に集約した。
  const tier = pricingTierFor(offering.verifiedLeadAt, new Date());
  const creditType = creditTypeForTier(tier);

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

        const consumed = await consumeOneCreditTx(tx, {
          tenantId: su!.app.tenantId,
          memberId: me.id,
          creditType,
          contactUnlockId: unlock.id,
        });
        if (!consumed) throw new Error("NO_CREDIT");
        await tx.contactUnlock.update({
          where: { id: unlock.id },
          data: { creditLedgerEntryId: consumed.ledgerEntryId },
        });
      }

      // スレッド（会員ペアで1本）を用意
      let thread = await tx.thread.findFirst({
        where: {
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
          },
        });
      }

      notifyUnread = await tx.message.count({
        where: { threadId: thread.id, senderMemberId: me.id, readAt: null },
      });

      const message = await tx.message.create({
        // 案件の文脈を残す（引き合い課金の判定はメッセージ単位で行う。WANT提案は紹介料モデル＝対象外）
        data: { threadId: thread.id, senderMemberId: me.id, body, offeringId: offering.id },
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
        error:
          tier === "verified_lead"
            ? "優良案件用の紹介クレジットがありません。下の「1件購入」からご購入ください。"
            : "紹介クレジットがありません。下の「1件購入」またはパックをご購入ください。",
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

  redirect(`/messages/${threadId}`);
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
