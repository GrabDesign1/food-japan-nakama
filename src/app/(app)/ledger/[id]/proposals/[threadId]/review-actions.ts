"use server";

/**
 * 【取引のあとの評価】2026-11-28（ユーザー決定・B案）。
 *
 * ⚠️⚠️ **両者が出すまで、どちらにも見せない。** 先に見えると報復になる
 *    （メルカリ・クラウドワークスが同時開示にしているのと同じ理由）。
 *    両方そろった時点で、2件ともに `publishedAt` を入れる。
 *    片方だけのときは14日たてば公開扱い（判定は `lib/track-record.ts` の `isRevealed`）。
 * ⚠️⚠️ **書けるのは、取引が完了した当事者だけ。** 完了していないのに評価できると、
 *    交渉の途中で「悪い評価をつけるぞ」と圧力をかける道具になる。
 * ⚠️ 1つの取引につき1人1回（`@@unique([threadId, authorMemberId])`）。出し直しはできない。
 */
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { PHASE_DONE } from "@/lib/deal-constants";

export type ReviewState = { ok?: boolean; error?: string };

/** 一言の長さ（DBも VARCHAR(80)）。 */
const COMMENT_MAX = 80;

export async function submitDealReview(
  offeringId: string,
  threadId: string,
  _prev: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const me = await getOrCreateMemberForUser(su);

  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread || thread.offeringId !== offeringId) return { error: "やり取りが見つかりません。" };
  if (thread.fromMemberId !== me.id && thread.toMemberId !== me.id) {
    return { error: "やり取りが見つかりません。" };
  }
  const targetMemberId = thread.fromMemberId === me.id ? thread.toMemberId : thread.fromMemberId;

  // ⚠️ 完了していない取引は評価できない（交渉中の圧力に使わせない）
  const deal = await prisma.deal.findFirst({ where: { threadId }, select: { phase: true } });
  if (!deal || deal.phase < PHASE_DONE) {
    return { error: "この取引が完了してから評価できます。" };
  }

  const answer = formData.get("wouldWorkAgain");
  if (answer !== "yes" && answer !== "no") return { error: "「はい」か「いいえ」を選んでください。" };
  const raw = (formData.get("comment") ?? "").toString().trim();
  if (raw.length > COMMENT_MAX) return { error: `一言は${COMMENT_MAX}字までです。` };

  const existing = await prisma.dealReview.findUnique({
    where: { threadId_authorMemberId: { threadId, authorMemberId: me.id } },
    select: { id: true },
  });
  if (existing) return { error: "この取引の評価は、すでに出していただいています。" };

  await prisma.dealReview.create({
    data: {
      threadId,
      authorMemberId: me.id,
      targetMemberId,
      wouldWorkAgain: answer === "yes",
      comment: raw.length > 0 ? raw : null,
    },
  });

  // ⚠️⚠️ 相手も出していたら、ここで**2件まとめて**公開に切り替える。
  //    片方だけ公開すると、後から書く側が内容を見てから書けてしまう。
  const both = await prisma.dealReview.count({ where: { threadId } });
  if (both >= 2) {
    await prisma.dealReview.updateMany({
      where: { threadId, publishedAt: null },
      data: { publishedAt: new Date() },
    });
  }

  revalidatePath(`/ledger/${offeringId}/proposals/${threadId}`);
  revalidatePath(`/producers/${targetMemberId}`);
  return { ok: true };
}
