import { prisma } from "@/lib/db";
import { POST_BODY_MAX, POST_IMAGE_MAX, COMMENT_BODY_MAX, FEED_PAGE_SIZE } from "@/lib/feed-core";

/**
 * コミュニティの投稿（2026-11-21）。
 *
 * ⚠️⚠️ **公開範囲はつながっている人同士**（ユーザー判断「参加者同士だけで十分」）。
 *    見えるのは「自分の投稿」＋「カードを交換した相手の投稿」だけ。
 *    ⚠️ 範囲の判定は**必ずここ（サーバー）で行う**。画面から渡された id を信じない。
 *
 * ⚠️ 投稿は規約17条（通信の秘密）が守る「会員間の非公開メッセージ」ではない。
 *    ただしAIの学習・分析には使わない（会員の取り組みを勝手に材料にしない）。
 */

// 定数は feed-core.ts（クライアントからも読み込める）。従来どおりここからも使えるように再輸出する。
export * from "@/lib/feed-core";

/** 自分とカードを交換した相手の memberId（＝投稿が見える範囲） */
export async function connectionIds(memberId: string): Promise<string[]> {
  const rows = await prisma.cardExchange.findMany({
    where: { OR: [{ memberAId: memberId }, { memberBId: memberId }] },
    select: { memberAId: true, memberBId: true },
  });
  const ids = new Set<string>();
  for (const r of rows) ids.add(r.memberAId === memberId ? r.memberBId : r.memberAId);
  return [...ids];
}

/** 自分が読んでよい著者の集合（自分＋つながっている相手） */
export async function visibleAuthorIds(memberId: string): Promise<string[]> {
  return [memberId, ...(await connectionIds(memberId))];
}

export type FeedPost = {
  id: string;
  authorMemberId: string;
  body: string;
  linkUrl: string | null;
  linkTitle: string | null;
  imagePaths: string[];
  createdAt: Date;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

/**
 * タイムライン。新しい順。
 * ⚠️ 著者で絞ってから読む（読んでから捨てる作りにしない＝件数がずれる）。
 */
export async function listFeed(
  memberId: string,
  opts: { before?: Date; take?: number } = {}
): Promise<FeedPost[]> {
  const authors = await visibleAuthorIds(memberId);
  const take = Math.min(opts.take ?? FEED_PAGE_SIZE, 50);

  const rows = await prisma.post.findMany({
    where: {
      authorMemberId: { in: authors },
      deletedAt: null,
      ...(opts.before ? { createdAt: { lt: opts.before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true, authorMemberId: true, body: true,
      linkUrl: true, linkTitle: true, imagePaths: true, createdAt: true,
      likes: { select: { memberId: true } },
      _count: { select: { comments: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    authorMemberId: r.authorMemberId,
    body: r.body,
    linkUrl: r.linkUrl,
    linkTitle: r.linkTitle,
    imagePaths: r.imagePaths,
    createdAt: r.createdAt,
    likeCount: r.likes.length,
    likedByMe: r.likes.some((l) => l.memberId === memberId),
    commentCount: r._count.comments,
  }));
}

/** その投稿を自分が読んでよいか。いいね・コメントの前に必ず通す */
export async function canSeePost(memberId: string, postId: string): Promise<boolean> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorMemberId: true, deletedAt: true },
  });
  if (!post || post.deletedAt) return false;
  if (post.authorMemberId === memberId) return true;
  const ids = await connectionIds(memberId);
  return ids.includes(post.authorMemberId);
}

export type CreatePostInput = {
  body: string;
  linkUrl?: string | null;
  linkTitle?: string | null;
  imagePaths?: string[];
};

export async function createPost(
  me: { id: string; tenantId: string },
  input: CreatePostInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const body = input.body.trim().slice(0, POST_BODY_MAX);
  const images = (input.imagePaths ?? []).slice(0, POST_IMAGE_MAX);
  if (!body && images.length === 0) {
    return { ok: false, error: "本文か写真のどちらかを入れてください。" };
  }

  // URLは http/https だけ。javascript: などを弾く
  let linkUrl: string | null = null;
  const raw = (input.linkUrl ?? "").trim();
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { ok: false, error: "リンクは http から始まるURLを入れてください。" };
      }
      linkUrl = u.toString().slice(0, 2000);
    } catch {
      return { ok: false, error: "リンクのURLを読み取れませんでした。" };
    }
  }

  const post = await prisma.post.create({
    data: {
      tenantId: me.tenantId,
      authorMemberId: me.id,
      body,
      linkUrl,
      linkTitle: (input.linkTitle ?? "").trim().slice(0, 200) || null,
      imagePaths: images,
    },
    select: { id: true },
  });
  return { ok: true, id: post.id };
}

/** いいねの付け外し。戻り値は「付いた状態か」 */
export async function toggleLike(memberId: string, postId: string): Promise<boolean | null> {
  if (!(await canSeePost(memberId, postId))) return null;
  const existing = await prisma.postLike.findUnique({
    where: { postId_memberId: { postId, memberId } },
    select: { id: true },
  });
  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    return false;
  }
  try {
    await prisma.postLike.create({ data: { postId, memberId } });
  } catch {
    // 二重押しは成立済みとして扱う
  }
  return true;
}

export type FeedComment = {
  id: string;
  authorMemberId: string;
  body: string;
  createdAt: Date;
};

export async function listComments(memberId: string, postId: string): Promise<FeedComment[]> {
  if (!(await canSeePost(memberId, postId))) return [];
  const rows = await prisma.postComment.findMany({
    where: { postId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, authorMemberId: true, body: true, createdAt: true },
  });
  return rows;
}

export async function addComment(
  memberId: string,
  postId: string,
  body: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const text = body.trim().slice(0, COMMENT_BODY_MAX);
  if (!text) return { ok: false, error: "コメントを入力してください。" };
  if (!(await canSeePost(memberId, postId))) {
    return { ok: false, error: "この投稿にはコメントできません。" };
  }
  await prisma.postComment.create({ data: { postId, authorMemberId: memberId, body: text } });
  return { ok: true };
}

/** 自分の投稿を消す（論理削除） */
export async function deleteMyPost(memberId: string, postId: string): Promise<boolean> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorMemberId: true },
  });
  if (!post || post.authorMemberId !== memberId) return false;
  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: new Date(), deletedReason: "本人が削除" },
  });
  return true;
}
