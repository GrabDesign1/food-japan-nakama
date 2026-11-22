// 「みんなの取り組み」の通知メール、宛先の決め方（2026-11-21）。
//
// なぜ分けて置くか:
//   文面は email.ts、送るきっかけは feed/actions.ts。その間の「誰に送るか・送ってよいか」を
//   1か所にまとめる。actions.ts に散らすと、停止設定の確認を書き忘れた経路から漏れる。
//
// ⚠️ **自分の操作で自分に送らない**（自分の投稿に自分でいいねしても通知しない）。
// ⚠️ **止めている人には送らない**（User.feedEmailOptOutAt）。判定はここだけで行う。
// ⚠️ **通知の失敗で操作を失敗させない**。すべて try/catch で飲み込み、ログに出すだけにする。
//    いいねが「保存されたのにエラー表示」になるのが一番困る。
// ⚠️ いいねは**1投稿につき1日1通**まで。1件ごとに送ると人気の投稿で洪水になる。
import { prisma } from "@/lib/db";
import {
  notifyPostComment, notifyPostLike, notifyPostShared, notifyGatheringJoin,
} from "@/lib/email";

/** 通知を受け取る宛先（止めている人・停止中の人は外す） */
async function recipients(memberId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      memberId,
      status: { not: "SUSPENDED" },
      feedEmailOptOutAt: null,
    },
    select: { email: true },
  });
  return Array.from(new Set(users.map((u) => u.email).filter(Boolean)));
}

/** 通知文に出す差出人の表示名。事業者名を使う（画面の表示と揃える） */
async function senderName(memberId: string): Promise<string> {
  const m = await prisma.member.findUnique({ where: { id: memberId }, select: { name: true } });
  return m?.name ?? "会員";
}

/**
 * コメント・返信がついたことを知らせる。
 * 宛先は「投稿の作者」と、返信なら「返信先コメントの作者」。
 */
export async function notifyOnComment(params: {
  postId: string;
  actorMemberId: string;
  body: string;
  parentId?: string | null;
}): Promise<void> {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.postId },
      select: { authorMemberId: true, deletedAt: true },
    });
    if (!post || post.deletedAt) return;

    const from = await senderName(params.actorMemberId);

    // 返信先コメントの作者（返信のとき）
    let parentAuthor: string | null = null;
    if (params.parentId) {
      const parent = await prisma.postComment.findUnique({
        where: { id: params.parentId },
        select: { authorMemberId: true, deletedAt: true },
      });
      if (parent && !parent.deletedAt) parentAuthor = parent.authorMemberId;
    }

    // 同じ人に2通送らない。自分には送らない
    const targets = new Set<string>();
    if (post.authorMemberId !== params.actorMemberId) targets.add(post.authorMemberId);
    if (parentAuthor && parentAuthor !== params.actorMemberId) targets.add(parentAuthor);

    for (const memberId of targets) {
      const to = await recipients(memberId);
      if (to.length === 0) continue;
      await notifyPostComment({
        to,
        fromMemberName: from,
        preview: params.body,
        postId: params.postId,
        // 返信先コメントの作者には「返信」として、投稿者には「コメント」として知らせる
        isReply: memberId === parentAuthor,
      });
    }
  } catch (e) {
    console.error("[feed-notify] コメント通知に失敗:", e);
  }
}

/**
 * いいねを知らせる。
 * ⚠️ その投稿に**直近24時間でついたいいねが今の1件だけ**のときに限って送る。
 */
export async function notifyOnLike(params: {
  postId: string;
  actorMemberId: string;
}): Promise<void> {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.postId },
      select: { authorMemberId: true, body: true, deletedAt: true },
    });
    if (!post || post.deletedAt) return;
    if (post.authorMemberId === params.actorMemberId) return;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.postLike.count({
      where: { postId: params.postId, createdAt: { gte: since } },
    });
    if (recent !== 1) return; // 今日はもう送っている

    const to = await recipients(post.authorMemberId);
    if (to.length === 0) return;
    await notifyPostLike({
      to,
      fromMemberName: await senderName(params.actorMemberId),
      postPreview: post.body,
      postId: params.postId,
    });
  } catch (e) {
    console.error("[feed-notify] いいね通知に失敗:", e);
  }
}

/** 投稿が紹介（シェア）されたことを、元の投稿者に知らせる */
export async function notifyOnShare(params: {
  originalPostId: string;
  sharePostId: string;
  actorMemberId: string;
  comment: string;
}): Promise<void> {
  try {
    const original = await prisma.post.findUnique({
      where: { id: params.originalPostId },
      select: { authorMemberId: true, deletedAt: true },
    });
    if (!original || original.deletedAt) return;
    if (original.authorMemberId === params.actorMemberId) return;

    const to = await recipients(original.authorMemberId);
    if (to.length === 0) return;
    await notifyPostShared({
      to,
      fromMemberName: await senderName(params.actorMemberId),
      comment: params.comment,
      // 飛び先は「紹介した投稿」。元投稿は中に入って見える
      postId: params.sharePostId,
    });
  } catch (e) {
    console.error("[feed-notify] シェア通知に失敗:", e);
  }
}

/** 通知メールを受け取るか（画面の切り替え表示用） */
export async function feedEmailEnabled(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { feedEmailOptOutAt: true },
  });
  return !u?.feedEmailOptOutAt;
}

/** 通知メールの受け取りを切り替える */
export async function setFeedEmailEnabled(userId: string, enabled: boolean): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { feedEmailOptOutAt: enabled ? null : new Date() },
  });
}

/**
 * 集まりに手が挙がったことを主催に知らせる（2026-11-23）。
 * ⚠️ 初めて手を挙げたときだけ。種類を変えるたびには送らない（going⇄interested の往復で洪水になる）。
 * ⚠️ 停止設定（feedEmailOptOutAt）はここでも効かせる。通知の止め場所を1つにするため。
 */
export async function notifyOnGatheringJoin(params: {
  gatheringId: string;
  hostMemberId: string;
  actorMemberId: string;
  kindLabel: string;
  note: string | null;
}): Promise<void> {
  try {
    if (params.hostMemberId === params.actorMemberId) return;
    const g = await prisma.gathering.findUnique({
      where: { id: params.gatheringId },
      select: { title: true, deletedAt: true, joins: { select: { kind: true } } },
    });
    if (!g || g.deletedAt) return;

    const to = await recipients(params.hostMemberId);
    if (to.length === 0) return;

    await notifyGatheringJoin({
      to,
      gatheringId: params.gatheringId,
      gatheringTitle: g.title,
      fromMemberName: await senderName(params.actorMemberId),
      kindLabel: params.kindLabel,
      note: params.note,
      goingCount: g.joins.filter((j) => j.kind === "going").length,
    });
  } catch (e) {
    console.error("[feed-notify] 集まりの通知に失敗:", e);
  }
}
