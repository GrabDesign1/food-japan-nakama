// 仲間のキュレーションメディア（2026-11-25 ユーザー指示「仲間のキュレーションメディアを作って」）。
//
// 何を集めるか：
//   ① 事務局がピックした記事（CuratedArticle）＝公開トップに出ているもの
//   ② 仲間が共有した外部記事（Post のうち linkUrl があるもの）
//
// ⚠️⚠️ **公開範囲の決まりは絶対に崩さない。**
//    投稿が読めるのは「自分＋名刺を交換した相手」だけ（feed.ts の visibleAuthorIds）。
//    ここでも必ず同じ関数で絞る。ここを広げると、つながっていない人の投稿が漏れる。
// ⚠️ 外部URLは http/https だけ（safeUrl）。画面の a には rel="noreferrer" を付ける。
// ⚠️ 記事画像は外部URLをそのまま出さない。投稿の画像は /api/link-image/[postId] 経由
//    （CSP img-src 'self' を崩さないため。next.config.ts の方針に合わせる）。
import { prisma } from "@/lib/db";
import { visibleAuthorIds } from "@/lib/feed";
import { safeUrl } from "@/lib/member-links";

export const CURATION_PAGE_SIZE = 30;

export type CurationItem = {
  id: string;
  kind: "office" | "member";
  title: string;
  url: string;
  host: string;
  source: string | null;
  excerpt: string | null;
  imageSrc: string | null;  // 画面にそのまま出せる src（事務局ピックは外部URL、投稿は自サイト経由）
  byName: string | null;    // 共有した仲間の名前（事務局ピックは null）
  byMemberId: string | null;
  at: Date;
  fromSummit: boolean;
};

function hostOf(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}

/**
 * キュレーション一覧。
 * @param memberId 自分の会員id（未設定なら仲間ぶんは出さない）
 */
export async function listCuration(
  tenantId: string,
  memberId: string | null,
  take = CURATION_PAGE_SIZE,
): Promise<CurationItem[]> {
  const now = new Date();
  const authorIds = memberId ? await visibleAuthorIds(memberId) : [];

  const [office, posts] = await Promise.all([
    prisma.curatedArticle.findMany({
      where: {
        tenantId,
        active: true,
        AND: [
          { OR: [{ publishStart: null }, { publishStart: { lte: now } }] },
          { OR: [{ publishEnd: null }, { publishEnd: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take,
    }),
    authorIds.length
      ? prisma.post.findMany({
          where: {
            tenantId,
            authorMemberId: { in: authorIds },
            deletedAt: null,
            linkUrl: { not: null },
          },
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true, linkUrl: true, linkTitle: true, linkSiteName: true,
            linkImageUrl: true, body: true, createdAt: true, authorMemberId: true,
          },
        })
      : Promise.resolve([]),
  ]);

  // 共有した方の名前をまとめて引く（1件ずつ引かない）
  const ids = [...new Set(posts.map((p) => p.authorMemberId))];
  const names = ids.length
    ? await prisma.member.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, contactName: true },
      })
    : [];
  const nameMap = new Map(names.map((m) => [m.id, m.contactName?.trim() || m.name]));

  const items: CurationItem[] = [];

  for (const a of office) {
    const url = safeUrl(a.url);
    if (!url) continue;
    items.push({
      id: `office:${a.id}`, kind: "office", title: a.title, url, host: hostOf(url),
      source: a.source, excerpt: a.excerpt, imageSrc: safeUrl(a.imageUrl),
      byName: null, byMemberId: null, at: a.createdAt, fromSummit: a.fromSummit,
    });
  }

  for (const p of posts) {
    const url = safeUrl(p.linkUrl);
    if (!url) continue;
    items.push({
      id: `post:${p.id}`, kind: "member",
      title: (p.linkTitle ?? "").trim() || hostOf(url),
      url, host: hostOf(url),
      source: p.linkSiteName,
      excerpt: (p.body ?? "").trim().slice(0, 140) || null,
      // ⚠️ 外部の画像URLを直に出さない。自サイト経由で配る
      imageSrc: p.linkImageUrl ? `/api/link-image/${p.id}` : null,
      byName: nameMap.get(p.authorMemberId) ?? null,
      byMemberId: p.authorMemberId,
      at: p.createdAt, fromSummit: false,
    });
  }

  // 新しい順。事務局ピックは並び順を持つが、ここでは時系列で混ぜる
  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items.slice(0, take);
}
