// 公開トップ（未ログイン）向けのデータ取得。連絡先など非公開情報は返さない。
import { prisma } from "@/lib/db";

const TENANT_SLUG = "food-japan-summit";

export async function getPublicTenantId(): Promise<string | null> {
  const t = await prisma.tenant.findUnique({
    where: { slug: TENANT_SLUG },
    select: { id: true },
  });
  return t?.id ?? null;
}

/** 公開トップに載せるコンテンツ一式（キュレーション記事・お知らせ・プロジェクト・売りたい・買いたい）。 */
export async function getLandingContent() {
  const tenantId = await getPublicTenantId();
  if (!tenantId) {
    return {
      articles: [],
      announcements: [],
      projects: [],
      projNameMap: new Map<string, string>(),
      gives: [],
      wants: [],
      giveCount: 0,
      wantCount: 0,
      projectCount: 0,
    };
  }

  const now = new Date();
  const [articles, announcements, projects, gives, wants, giveCount, wantCount, projectCount] = await Promise.all([
    prisma.curatedArticle.findMany({
      where: {
        tenantId,
        active: true,
        // 掲載期間内のみ（開始・終了は未設定なら制限なし）
        AND: [
          { OR: [{ publishStart: null }, { publishStart: { lte: now } }] },
          { OR: [{ publishEnd: null }, { publishEnd: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.announcement.findMany({
      where: { tenantId },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 4,
    }),
    prisma.project.findMany({
      where: { tenantId, status: "published" },
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
    prisma.offering.findMany({
      where: { isPublic: true, visibility: "public", title: { not: "" }, direction: "GIVE", member: { tenantId, status: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { member: { select: { name: true } } },
    }),
    prisma.offering.findMany({
      where: { isPublic: true, visibility: "public", title: { not: "" }, direction: "WANT", member: { tenantId, status: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { member: { select: { name: true } } },
    }),
    // 件数（トップのティザー表示用）
    prisma.offering.count({
      where: { isPublic: true, visibility: "public", title: { not: "" }, direction: "GIVE", member: { tenantId, status: "APPROVED" } },
    }),
    prisma.offering.count({
      where: { isPublic: true, visibility: "public", title: { not: "" }, direction: "WANT", member: { tenantId, status: "APPROVED" } },
    }),
    prisma.project.count({ where: { tenantId, status: "published" } }),
  ]);

  const projMemberIds = Array.from(new Set(projects.map((p) => p.memberId)));
  const projMembers = projMemberIds.length
    ? await prisma.member.findMany({ where: { id: { in: projMemberIds } }, select: { id: true, name: true } })
    : [];
  const projNameMap = new Map(projMembers.map((m) => [m.id, m.name]));

  // 同じURL/タイトルの記事が重複しないように除外
  const seenArticle = new Set<string>();
  const uniqueArticles = articles.filter((a) => {
    const key = (a.url || a.title).trim().toLowerCase();
    if (seenArticle.has(key)) return false;
    seenArticle.add(key);
    return true;
  });

  return { articles: uniqueArticles, announcements, projects, projNameMap, gives, wants, giveCount, wantCount, projectCount };
}

/** 公開プレビュー用：掲載中プロジェクト1件（Projectにmemberリレーションが無いため名前は別引き）。 */
export async function getPublicProject(id: string) {
  const p = await prisma.project.findFirst({ where: { id, status: "published" } });
  if (!p) return null;
  const member = await prisma.member.findUnique({
    where: { id: p.memberId },
    select: { name: true },
  });
  return { ...p, memberName: member?.name ?? "" };
}

/** 公開プレビュー用：公開中の持ち寄り1件（停止・未承認会員の掲載は出さない）。 */
export async function getPublicOffering(id: string) {
  return prisma.offering.findFirst({
    where: { id, isPublic: true, visibility: "public", title: { not: "" }, member: { status: "APPROVED" } },
    include: { member: { select: { name: true } } },
  });
}
