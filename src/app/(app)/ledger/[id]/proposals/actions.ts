"use server";

// 届いた提案・問い合わせの管理操作（掲載者のみ）。
// クラウドワークスの応募者一覧に相当する画面から使う（2026-08-11）。
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser, getMemberUserEmails } from "@/lib/member";
import { prisma } from "@/lib/db";
import { notifyNewMessage } from "@/lib/email";
import { canSendToOthers, trimTo, MESSAGE_MAX } from "@/lib/security";

/** 掲載者本人であることと、そのスレッドがこの案件のものであることを確かめる。 */
async function ownOfferingThreads(offeringId: string, threadIds: string[]) {
  const su = await getSessionUser();
  if (!su) throw new Error("ログインが必要です。");
  const me = await getOrCreateMemberForUser(su);
  const offering = await prisma.offering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.memberId !== me.id) throw new Error("案件が見つかりません。");
  if (!threadIds.length) return { su, me, offering, threads: [] };
  const threads = await prisma.thread.findMany({
    where: {
      id: { in: threadIds },
      offeringId,
      OR: [{ fromMemberId: me.id }, { toMemberId: me.id }],
    },
    select: { id: true, fromMemberId: true, toMemberId: true },
  });
  return { su, me, offering, threads };
}

/** 5段階の評価と非公開メモを保存する（相手には見えない）。 */
export async function saveProposalNote(
  offeringId: string,
  threadId: string,
  formData: FormData
): Promise<void> {
  const { me, threads } = await ownOfferingThreads(offeringId, [threadId]);
  if (!threads.length) return;

  const ratingRaw = Number(formData.get("rating") ?? 0);
  const rating = Number.isFinite(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? Math.trunc(ratingRaw) : null;
  const memo = trimTo(formData.get("memo"), 2000) || null;

  await prisma.proposalNote.upsert({
    where: { threadId_memberId: { threadId, memberId: me.id } },
    create: { threadId, memberId: me.id, rating, memo },
    update: { rating, memo },
  });
  revalidatePath(`/ledger/${offeringId}/proposals`);
}

/**
 * 選んだ相手へ同じ文面をまとめて送る（メッセージ／お断り）。
 * 1通ずつ通常のメッセージとして入るので、相手からは個別のやり取りに見える。
 */
export async function bulkSendToProposals(
  offeringId: string,
  _prev: { ok?: number; error?: string },
  formData: FormData
): Promise<{ ok?: number; error?: string }> {
  const threadIds = formData.getAll("threadIds").map(String).filter(Boolean);
  if (!threadIds.length) return { error: "送る相手を選んでください。" };

  const body = trimTo(formData.get("body"), MESSAGE_MAX);
  if (!body) return { error: "本文を入力してください。" };

  const { me, offering, threads } = await ownOfferingThreads(offeringId, threadIds);
  if (!canSendToOthers(me.status)) return { error: "現在のご登録状態では送信できません。" };
  if (!threads.length) return { error: "送る相手が見つかりません。" };

  const now = new Date();
  await prisma.$transaction([
    prisma.message.createMany({
      data: threads.map((t) => ({
        threadId: t.id,
        senderMemberId: me.id,
        body,
        offeringId,
      })),
    }),
    prisma.thread.updateMany({
      where: { id: { in: threads.map((t) => t.id) } },
      data: { lastMessageAt: now },
    }),
  ]);

  // 通知は送信の完了を待たせない（失敗しても送信自体は成立している）
  after(async () => {
    for (const t of threads) {
      const otherId = t.fromMemberId === me.id ? t.toMemberId : t.fromMemberId;
      try {
        const to = await getMemberUserEmails(otherId);
        await notifyNewMessage({
          to,
          fromMemberName: me.name,
          preview: body,
          threadId: t.id,
          listingTitle: offering.title,
        });
      } catch (e) {
        console.error("[bulkSend] 通知に失敗:", e);
      }
    }
  });

  revalidatePath(`/ledger/${offeringId}/proposals`);
  return { ok: threads.length };
}
