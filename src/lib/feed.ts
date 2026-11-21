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
 *
 * ⚠️ シェア（紹介）でも**元投稿の公開範囲を広げない**。元の作者とつながっていない人には
 *    中身を出さず「表示できません」と出す。紹介した人の人脈に、元の作者の投稿が
 *    勝手に流れていく作りにしない。
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

/** 紹介された元の投稿。見てよい相手でないときは visible:false で中身を伏せる */
export type SharedOriginal = {
  id: string;
  authorMemberId: string | null;
  visible: boolean;
  body: string;
  linkUrl: string | null;
  linkTitle: string | null;
  linkSiteName: string | null;
  hasLinkImage: boolean;
  imageCount: number;
  createdAt: Date | null;
  /** 元の投稿そのものが消されているか */
  deleted: boolean;
};

export type FeedPost = {
  id: string;
  authorMemberId: string;
  body: string;
  linkUrl: string | null;
  linkTitle: string | null;
  linkSiteName: string | null;
  hasLinkImage: boolean;
  imagePaths: string[];
  createdAt: Date;
  editedAt: Date | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  shared: SharedOriginal | null;
};

/** 投稿1件を読むときの共通の列 */
const POST_SELECT = {
  id: true,
  authorMemberId: true,
  body: true,
  linkUrl: true,
  linkTitle: true,
  linkImageUrl: true,
  linkSiteName: true,
  imagePaths: true,
  createdAt: true,
  editedAt: true,
  sharedPostId: true,
  likes: { select: { memberId: true } },
  _count: { select: { comments: true } },
} as const;

type PostRow = {
  id: string;
  authorMemberId: string;
  body: string;
  linkUrl: string | null;
  linkTitle: string | null;
  linkImageUrl: string | null;
  linkSiteName: string | null;
  imagePaths: string[];
  createdAt: Date;
  editedAt: Date | null;
  sharedPostId: string | null;
  likes: { memberId: string }[];
  _count: { comments: number };
};

/**
 * 紹介された元投稿をまとめて読む。
 * ⚠️ 元の作者とつながっていない人には中身を渡さない（visible:false）。
 */
async function loadSharedOriginals(
  memberId: string,
  ids: string[],
  visibleAuthors: Set<string>
): Promise<Map<string, SharedOriginal>> {
  const map = new Map<string, SharedOriginal>();
  if (ids.length === 0) return map;

  const rows = await prisma.post.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      authorMemberId: true,
      body: true,
      linkUrl: true,
      linkTitle: true,
      linkImageUrl: true,
      linkSiteName: true,
      imagePaths: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  for (const id of ids) {
    const r = rows.find((x) => x.id === id);
    if (!r) {
      // 行そのものが無い（想定外。消えた扱いにする）
      map.set(id, {
        id, authorMemberId: null, visible: false, body: "", linkUrl: null, linkTitle: null,
        linkSiteName: null, hasLinkImage: false, imageCount: 0, createdAt: null, deleted: true,
      });
      continue;
    }
    const canSee = !r.deletedAt && visibleAuthors.has(r.authorMemberId);
    map.set(id, {
      id: r.id,
      authorMemberId: r.authorMemberId,
      visible: canSee,
      body: canSee ? r.body : "",
      linkUrl: canSee ? r.linkUrl : null,
      linkTitle: canSee ? r.linkTitle : null,
      linkSiteName: canSee ? r.linkSiteName : null,
      hasLinkImage: canSee ? Boolean(r.linkImageUrl) : false,
      imageCount: canSee ? r.imagePaths.length : 0,
      createdAt: canSee ? r.createdAt : null,
      deleted: Boolean(r.deletedAt),
    });
  }
  return map;
}

function toFeedPost(r: PostRow, memberId: string, shared: SharedOriginal | null): FeedPost {
  return {
    id: r.id,
    authorMemberId: r.authorMemberId,
    body: r.body,
    linkUrl: r.linkUrl,
    linkTitle: r.linkTitle,
    linkSiteName: r.linkSiteName,
    // ⚠️ 外部の画像URLそのものは画面に渡さない。あるかどうかだけ伝える
    hasLinkImage: Boolean(r.linkImageUrl),
    imagePaths: r.imagePaths,
    createdAt: r.createdAt,
    editedAt: r.editedAt,
    likeCount: r.likes.length,
    likedByMe: r.likes.some((l) => l.memberId === memberId),
    commentCount: r._count.comments,
    shared,
  };
}

/**
 * タイムライン。新しい順。
 * ⚠️ 著者で絞ってから読む（読んでから捨てる作りにしない＝件数がずれる）。
 */
export async function listFeed(
  memberId: string,
  opts: { before?: Date; take?: number } = {}
): Promise<FeedPost[]> {
  const authors = await visibleAuthorIds(memberId);
  const take = Math.min(opts.take ?? FEED_PAGE_SIZE, 200);

  const rows = (await prisma.post.findMany({
    where: {
      authorMemberId: { in: authors },
      deletedAt: null,
      ...(opts.before ? { createdAt: { lt: opts.before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: POST_SELECT,
  })) as PostRow[];

  const sharedIds = [...new Set(rows.map((r) => r.sharedPostId).filter((x): x is string => !!x))];
  const originals = await loadSharedOriginals(memberId, sharedIds, new Set(authors));

  return rows.map((r) =>
    toFeedPost(r, memberId, r.sharedPostId ? originals.get(r.sharedPostId) ?? null : null)
  );
}

/**
 * ある会員の投稿だけを読む（プロフィールの「取り組み」欄）。
 * ⚠️ 相手とつながっていなければ空を返す。プロフィールは誰でも開けるため、ここで必ず絞る。
 */
export async function listMemberPosts(
  viewerMemberId: string,
  authorMemberId: string,
  opts: { take?: number } = {}
): Promise<FeedPost[]> {
  const authors = await visibleAuthorIds(viewerMemberId);
  if (!authors.includes(authorMemberId)) return [];

  const rows = (await prisma.post.findMany({
    where: { authorMemberId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.take ?? 5, 20),
    select: POST_SELECT,
  })) as PostRow[];

  const sharedIds = [...new Set(rows.map((r) => r.sharedPostId).filter((x): x is string => !!x))];
  const originals = await loadSharedOriginals(viewerMemberId, sharedIds, new Set(authors));

  return rows.map((r) =>
    toFeedPost(r, viewerMemberId, r.sharedPostId ? originals.get(r.sharedPostId) ?? null : null)
  );
}

/** その会員の投稿の本数（つながっていなければ 0） */
export async function countMemberPosts(
  viewerMemberId: string,
  authorMemberId: string
): Promise<number> {
  const authors = await visibleAuthorIds(viewerMemberId);
  if (!authors.includes(authorMemberId)) return 0;
  return prisma.post.count({ where: { authorMemberId, deletedAt: null } });
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

/** 投稿を書いた人。接触の記録に使う（消された投稿は null） */
export async function postAuthorId(postId: string): Promise<string | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorMemberId: true, deletedAt: true },
  });
  return post && !post.deletedAt ? post.authorMemberId : null;
}

export type CreatePostInput = {
  body: string;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkImageUrl?: string | null;
  linkSiteName?: string | null;
  imagePaths?: string[];
};

/** 貼られたURLを点検して整える。http/https 以外は断る */
function normalizeLinkUrl(raw: string): { ok: true; url: string | null } | { ok: false; error: string } {
  const s = (raw ?? "").trim();
  if (!s) return { ok: true, url: null };
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "リンクは http から始まるURLを入れてください。" };
    }
    return { ok: true, url: u.toString().slice(0, 2000) };
  } catch {
    return { ok: false, error: "リンクのURLを読み取れませんでした。" };
  }
}

export async function createPost(
  me: { id: string; tenantId: string },
  input: CreatePostInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const body = input.body.trim().slice(0, POST_BODY_MAX);
  const images = (input.imagePaths ?? []).slice(0, POST_IMAGE_MAX);
  if (!body && images.length === 0) {
    return { ok: false, error: "本文か写真のどちらかを入れてください。" };
  }

  const link = normalizeLinkUrl(input.linkUrl ?? "");
  if (!link.ok) return { ok: false, error: link.error };

  const post = await prisma.post.create({
    data: {
      tenantId: me.tenantId,
      authorMemberId: me.id,
      body,
      linkUrl: link.url,
      linkTitle: (input.linkTitle ?? "").trim().slice(0, 200) || null,
      linkImageUrl: link.url ? (input.linkImageUrl ?? "").trim().slice(0, 2000) || null : null,
      linkSiteName: link.url ? (input.linkSiteName ?? "").trim().slice(0, 100) || null : null,
      imagePaths: images,
    },
    select: { id: true },
  });
  return { ok: true, id: post.id };
}

/**
 * 他の人の投稿を、ひとことを添えて自分のつながりに紹介する（シェア）。
 * ⚠️ シェアのシェアは作らない（元をたどって、いつも元の1本に紐づける）。
 * ⚠️ 紹介できるのは**自分が見てよい投稿**だけ。
 */
export async function sharePost(
  me: { id: string; tenantId: string },
  originalPostId: string,
  comment: string
): Promise<{ ok: true; id: string; originalId: string } | { ok: false; error: string }> {
  if (!(await canSeePost(me.id, originalPostId))) {
    return { ok: false, error: "この投稿は紹介できません。" };
  }
  const original = await prisma.post.findUnique({
    where: { id: originalPostId },
    select: { id: true, sharedPostId: true, authorMemberId: true },
  });
  if (!original) return { ok: false, error: "この投稿は紹介できません。" };

  // シェアをシェアしたときは、元の1本に付け替える
  const rootId = original.sharedPostId ?? original.id;
  if (rootId !== original.id && !(await canSeePost(me.id, rootId))) {
    return { ok: false, error: "もとの投稿を読める方だけが紹介できます。" };
  }
  const root = await prisma.post.findUnique({
    where: { id: rootId },
    select: { authorMemberId: true, deletedAt: true },
  });
  if (!root || root.deletedAt) return { ok: false, error: "もとの投稿は削除されています。" };
  if (root.authorMemberId === me.id) {
    return { ok: false, error: "自分の投稿は紹介しなくても、つながっている方に届いています。" };
  }

  const post = await prisma.post.create({
    data: {
      tenantId: me.tenantId,
      authorMemberId: me.id,
      body: comment.trim().slice(0, POST_BODY_MAX),
      imagePaths: [],
      sharedPostId: rootId,
    },
    select: { id: true },
  });
  return { ok: true, id: post.id, originalId: rootId };
}

/**
 * 自分の投稿の本文・見出しを直す。
 * ⚠️ 写真とリンク先URLは差し替えない（あとから中身がすり替わると、
 *    すでに読んだ人・いいねした人にとって別のものになる）。
 */
export async function editMyPost(
  memberId: string,
  postId: string,
  input: { body: string; linkTitle?: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorMemberId: true, deletedAt: true, imagePaths: true, sharedPostId: true, linkUrl: true },
  });
  if (!post || post.deletedAt || post.authorMemberId !== memberId) {
    return { ok: false, error: "この投稿は直せません。" };
  }
  const body = input.body.trim().slice(0, POST_BODY_MAX);
  const isShare = Boolean(post.sharedPostId);
  if (!body && post.imagePaths.length === 0 && !isShare && !post.linkUrl) {
    return { ok: false, error: "本文を空にはできません。消すときは削除してください。" };
  }
  await prisma.post.update({
    where: { id: postId },
    data: {
      body,
      ...(post.linkUrl
        ? { linkTitle: (input.linkTitle ?? "").trim().slice(0, 200) || null }
        : {}),
      editedAt: new Date(),
    },
  });
  return { ok: true };
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
  /** 返信先。空なら投稿への直のコメント */
  parentId: string | null;
};

export async function listComments(memberId: string, postId: string): Promise<FeedComment[]> {
  if (!(await canSeePost(memberId, postId))) return [];
  const rows = await prisma.postComment.findMany({
    where: { postId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, authorMemberId: true, body: true, createdAt: true, parentId: true },
  });
  return rows;
}

/**
 * コメント・返信を書く。
 * ⚠️ 返信先は**同じ投稿のコメント**であることを確かめる（他の投稿の枝に混ぜられないように）。
 * ⚠️ 枝は1段だけ。返信への返信は、同じ親にぶら下げ直す。
 */
export async function addComment(
  memberId: string,
  postId: string,
  body: string,
  parentId?: string | null
): Promise<{ ok: true; parentId: string | null } | { ok: false; error: string }> {
  const text = body.trim().slice(0, COMMENT_BODY_MAX);
  if (!text) return { ok: false, error: "コメントを入力してください。" };
  if (!(await canSeePost(memberId, postId))) {
    return { ok: false, error: "この投稿にはコメントできません。" };
  }

  let parent: string | null = null;
  const wanted = (parentId ?? "").trim();
  if (wanted) {
    const row = await prisma.postComment.findUnique({
      where: { id: wanted },
      select: { postId: true, parentId: true, deletedAt: true },
    });
    // 同じ投稿の、生きているコメントだけを親にできる
    if (row && !row.deletedAt && row.postId === postId) {
      parent = row.parentId ?? wanted; // 2段目より深くしない
    }
  }

  await prisma.postComment.create({
    data: { postId, authorMemberId: memberId, body: text, parentId: parent },
  });
  return { ok: true, parentId: parent };
}

/**
 * 自分のコメントを消す（論理削除）。
 * ⚠️ 投稿の作者も、自分の投稿についたコメントを消せる（場を保つため）。
 */
export async function deleteComment(
  memberId: string,
  commentId: string
): Promise<{ ok: boolean; postId: string | null }> {
  const c = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { authorMemberId: true, postId: true, deletedAt: true },
  });
  if (!c || c.deletedAt) return { ok: false, postId: null };

  let allowed = c.authorMemberId === memberId;
  if (!allowed) {
    const post = await prisma.post.findUnique({
      where: { id: c.postId },
      select: { authorMemberId: true },
    });
    allowed = post?.authorMemberId === memberId;
  }
  if (!allowed) return { ok: false, postId: null };

  await prisma.postComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  return { ok: true, postId: c.postId };
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

/** 画面に出すための、投稿者・コメント投稿者の表示内容 */
export type FeedAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
  categoryL1: string;
  prefecture: string | null;
};

/**
 * タイムライン1ページ分を、画面に必要な形でまとめて読む。
 * ⚠️ 画面（page.tsx）と「もっと読む」（server action）の**両方がここを通る**。
 *    片方だけ直すと、続きを読んだときだけ表示が違う、という壊れ方をする。
 */
export type FeedPage = {
  posts: FeedPost[];
  comments: Record<string, FeedComment[]>;
  authors: FeedAuthor[];
  /** まだ続きがあるか（「もっと読む」を出すかどうか） */
  hasMore: boolean;
};

/** 「もっと読む」で読む件数の上限。これ以上は押せないようにする */
export const FEED_MAX_SHOWN = 200;

/**
 * 画面に出す件数を決める。
 * ⚠️ 問い合わせの数字をそのまま take に渡さない（1万件を要求されたらDBが持たない）。
 *    20の倍数に丸めて、上限で止める。
 */
export function normalizeShown(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n) || n <= FEED_PAGE_SIZE) return FEED_PAGE_SIZE;
  const rounded = Math.ceil(n / FEED_PAGE_SIZE) * FEED_PAGE_SIZE;
  return Math.min(rounded, FEED_MAX_SHOWN);
}

export async function loadFeedPage(
  memberId: string,
  opts: { take?: number; before?: Date } = {}
): Promise<FeedPage> {
  const take = Math.min(opts.take ?? FEED_PAGE_SIZE, FEED_MAX_SHOWN);
  const posts = await listFeed(memberId, { before: opts.before, take });
  const { comments, authors } = await decoratePosts(memberId, posts);
  return { posts, comments, authors, hasMore: posts.length === take && take < FEED_MAX_SHOWN };
}

/**
 * その会員の「取り組み」欄（プロフィールの壁）。
 * ⚠️ つながっていない相手の投稿は listMemberPosts が空を返す。ここで判定を足さない
 *    （二重に書くと、片方を直し忘れたときに漏れる）。
 */
export async function loadMemberWall(
  viewerMemberId: string,
  authorMemberId: string,
  take = 5
): Promise<FeedPage & { total: number }> {
  const [posts, total] = await Promise.all([
    listMemberPosts(viewerMemberId, authorMemberId, { take }),
    countMemberPosts(viewerMemberId, authorMemberId),
  ]);
  const { comments, authors } = await decoratePosts(viewerMemberId, posts);
  return { posts, comments, authors, hasMore: total > posts.length, total };
}

/** 投稿の一覧に、コメントと表示名を付ける（流れと壁の両方から使う） */
async function decoratePosts(
  memberId: string,
  posts: FeedPost[]
): Promise<{ comments: Record<string, FeedComment[]>; authors: FeedAuthor[] }> {
  const commentLists = await Promise.all(
    posts.map(async (p) => [p.id, await listComments(memberId, p.id)] as const)
  );
  const comments: Record<string, FeedComment[]> = {};
  for (const [id, list] of commentLists) comments[id] = list;

  // 投稿者・コメント投稿者・紹介元の作者をまとめて引く
  const ids = new Set<string>();
  for (const p of posts) {
    ids.add(p.authorMemberId);
    if (p.shared?.authorMemberId) ids.add(p.shared.authorMemberId);
  }
  for (const list of Object.values(comments)) for (const c of list) ids.add(c.authorMemberId);

  const authors = ids.size
    ? await prisma.member.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true, name: true, avatarUrl: true, categoryL1: true, prefecture: true },
      })
    : [];

  return { comments, authors };
}
