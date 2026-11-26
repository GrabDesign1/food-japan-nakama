// サミット特設ページの共有（写真・動画・記事）。2026-11-26 ユーザー指示
//   「2026 宮崎 の特設サイトを作って、皆からの写真の共有、動画の共有、記事の共有をするページを準備して」
//
// ⚠️⚠️ **二段構え**（ユーザー選択 2026-11-26）。
//    集めるのは会員だけが見る場所。**事務局が featured を立てたものだけ**が公開ページに出る。
//    会場の写真には人の顔が写るので、自動で世に出さない。
// ⚠️ 動画はURLを貼る形式。動画ファイルは預からない（保存料と変換の仕組みを持たない）。
import { prisma } from "@/lib/db";
import {
  SHARE_BODY_MAX, SHARE_IMAGE_MAX, SHARE_PAGE_SIZE, normalizeEventSlug, type ShareKind,
} from "@/lib/summit-share-shared";

// ⚠️ 画面からも使う値は summit-share-shared.ts に置いてある（prisma を読ませないため）。
//    ここから再輸出するので、サーバー側は今までどおり "@/lib/summit-share" から取れる。
export * from "@/lib/summit-share-shared";

export type ShareView = {
  id: string;
  kind: ShareKind;
  body: string;
  imageCount: number;
  linkUrl: string | null;
  linkTitle: string | null;
  linkSiteName: string | null;
  hasLinkImage: boolean;
  featured: boolean;
  createdAt: Date;
  author: { id: string; name: string; contactName: string | null; photoUrl: string | null } | null;
  /** 自分が書いたもの（消せるかどうかの判断に使う） */
  mine: boolean;
};

function toKind(v: string): ShareKind {
  return v === "photo" || v === "video" ? v : "article";
}

/**
 * 一覧を読む。
 * ⚠️ onlyFeatured=true は**公開ページ専用**。ログインしていない人に渡すのはこれだけ。
 */
export async function listShares(args: {
  /** どの開催か。⚠️ 必ず渡す（知らない値は既定の開催に寄せる） */
  eventSlug: string;
  tenantId?: string;
  viewerMemberId?: string;
  onlyFeatured?: boolean;
  take?: number;
}): Promise<ShareView[]> {
  const rows = await prisma.summitShare.findMany({
    where: {
      eventSlug: normalizeEventSlug(args.eventSlug),
      deletedAt: null,
      ...(args.tenantId ? { tenantId: args.tenantId } : {}),
      ...(args.onlyFeatured ? { featured: true } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(args.take ?? SHARE_PAGE_SIZE, 100),
  });
  if (rows.length === 0) return [];

  const authors = await prisma.member.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.authorMemberId))] } },
    select: { id: true, name: true, contactName: true, contactPhotoUrl: true, avatarUrl: true },
  });
  const byId = new Map(authors.map((a) => [a.id, a]));

  return rows.map((r) => {
    const a = byId.get(r.authorMemberId);
    return {
      id: r.id,
      kind: toKind(r.kind),
      body: r.body,
      imageCount: r.imagePaths.length,
      linkUrl: r.linkUrl,
      linkTitle: r.linkTitle,
      linkSiteName: r.linkSiteName,
      hasLinkImage: Boolean(r.linkImageUrl),
      featured: r.featured,
      createdAt: r.createdAt,
      author: a
        ? {
            id: a.id,
            name: a.name,
            contactName: a.contactName,
            photoUrl: a.contactPhotoUrl ?? a.avatarUrl ?? null,
          }
        : null,
      mine: args.viewerMemberId ? r.authorMemberId === args.viewerMemberId : false,
    };
  });
}

export async function countShares(eventSlug: string, onlyFeatured = false): Promise<number> {
  return prisma.summitShare.count({
    where: {
      eventSlug: normalizeEventSlug(eventSlug),
      deletedAt: null,
      ...(onlyFeatured ? { featured: true } : {}),
    },
  });
}

export async function createShare(args: {
  eventSlug: string;
  tenantId: string;
  authorMemberId: string;
  kind: ShareKind;
  body: string;
  imagePaths?: string[];
  link?: { url: string; title: string | null; imageUrl: string | null; siteName: string | null };
}): Promise<string> {
  const row = await prisma.summitShare.create({
    data: {
      tenantId: args.tenantId,
      eventSlug: normalizeEventSlug(args.eventSlug),
      authorMemberId: args.authorMemberId,
      kind: args.kind,
      body: args.body.slice(0, SHARE_BODY_MAX),
      imagePaths: (args.imagePaths ?? []).slice(0, SHARE_IMAGE_MAX),
      linkUrl: args.link?.url ?? null,
      linkTitle: args.link?.title ?? null,
      linkImageUrl: args.link?.imageUrl ?? null,
      linkSiteName: args.link?.siteName ?? null,
      // ⚠️ 既定は非公開。公開は事務局の操作でしか起きない
      featured: false,
    },
    select: { id: true },
  });
  return row.id;
}

/**
 * 自分のものを消す（論理削除）。
 * ⚠️ 事務局が消すときは adminDelete を使う（記録の意味が違うので関数を分ける）。
 */
export async function deleteMyShare(memberId: string, id: string): Promise<boolean> {
  const r = await prisma.summitShare.updateMany({
    where: { id, authorMemberId: memberId, deletedAt: null },
    data: { deletedAt: new Date(), featured: false },
  });
  return r.count > 0;
}

/** 事務局が消す */
export async function adminDeleteShare(tenantId: string, id: string): Promise<boolean> {
  const r = await prisma.summitShare.updateMany({
    where: { id, tenantId, deletedAt: null },
    data: { deletedAt: new Date(), featured: false },
  });
  return r.count > 0;
}

/**
 * 公開ページへ出す／下げる（事務局だけ）。
 * ⚠️⚠️ **写っている方の同意は、事務局が確かめる。** ここは機械的に切り替えるだけ。
 */
export async function setFeatured(tenantId: string, id: string, on: boolean): Promise<boolean> {
  const r = await prisma.summitShare.updateMany({
    where: { id, tenantId, deletedAt: null },
    data: { featured: on, featuredAt: on ? new Date() : null },
  });
  return r.count > 0;
}

/** 配信口（/api/summit-media）が使う。見える範囲の判定は呼ぶ側で行う */
export async function loadShareMedia(
  id: string
): Promise<{ imagePaths: string[]; linkImageUrl: string | null; featured: boolean } | null> {
  const r = await prisma.summitShare.findFirst({
    where: { id, deletedAt: null },
    select: { imagePaths: true, linkImageUrl: true, featured: true },
  });
  return r ?? null;
}
