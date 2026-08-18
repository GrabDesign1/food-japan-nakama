// 公開トップ（未ログイン）向けのデータ取得。連絡先など非公開情報は返さない。
import { prisma } from "@/lib/db";

const TENANT_SLUG = "food-japan-summit";

/**
 * 公開トップに案件セクションを出し始める件数。
 * これに満たないうちはセクションごと出さない＝「現在ありません」を並べない。
 * 判定は売りたい／探している／共創プロジェクトで**別々**に行う。
 *
 * ⚠️ **2026-08-18 に 4 → 1 へ変更**（ユーザー指示）。折兼の「バガス容器」が
 *    掲載されたので、1件でもトップに出す方針に切り替えた。
 *    4件にしていたのは lg:grid-cols-4 で1行が埋まる数だったから（2026-08-17 の決定）で、
 *    1件だと横に空きが出る。**0件のセクションは従来どおり丸ごと消える**ので、
 *    「現在ありません」が並ぶことはない。
 */
export const MIN_LISTINGS_TO_SHOW = 1;

export async function getPublicTenantId(): Promise<string | null> {
  const t = await prisma.tenant.findUnique({
    where: { slug: TENANT_SLUG },
    select: { id: true },
  });
  return t?.id ?? null;
}

/** 公開トップに載せるコンテンツ一式（キュレーション記事・お知らせ・プロジェクト・売りたい（提供したい）・買いたい）。 */
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
      include: { member: { select: { name: true, companyLogoUrl: true } } },
    }),
    prisma.offering.findMany({
      where: { isPublic: true, visibility: "public", title: { not: "" }, direction: "WANT", member: { tenantId, status: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { member: { select: { name: true, companyLogoUrl: true } } },
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

/**
 * 公開の案件一覧（/listings）用。
 * ⚠️ 公開する情報の粒度はトップのカードと同じにすること（member は name と companyLogoUrl だけ）。
 * ここに連絡先や非公開項目を足すと、未ログインに会員限定情報が出る。
 */
export async function getPublicListings(type: "give" | "want" | "coproject", take = 48) {
  const tenantId = await getPublicTenantId();
  if (!tenantId) return { offerings: [], projects: [], projNameMap: new Map<string, string>(), total: 0 };

  if (type === "coproject") {
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { tenantId, status: "published" },
        orderBy: { publishedAt: "desc" },
        take,
      }),
      prisma.project.count({ where: { tenantId, status: "published" } }),
    ]);
    const ids = Array.from(new Set(projects.map((p) => p.memberId)));
    const members = ids.length
      ? await prisma.member.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      : [];
    return {
      offerings: [],
      projects,
      projNameMap: new Map(members.map((m) => [m.id, m.name])),
      total,
    };
  }

  const where = {
    isPublic: true,
    visibility: "public",
    title: { not: "" },
    direction: type === "give" ? "GIVE" : "WANT",
    member: { tenantId, status: "APPROVED" },
  } as const;

  const [offerings, total] = await Promise.all([
    prisma.offering.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: { member: { select: { name: true, companyLogoUrl: true } } },
    }),
    prisma.offering.count({ where }),
  ]);
  return { offerings, projects: [], projNameMap: new Map<string, string>(), total };
}

/** 公開プレビュー用：公開中の持ち寄り1件（停止・未承認会員の掲載は出さない）。 */
export async function getPublicOffering(id: string) {
  return prisma.offering.findFirst({
    where: { id, isPublic: true, visibility: "public", title: { not: "" }, member: { status: "APPROVED" } },
    include: { member: { select: { name: true, companyLogoUrl: true } } },
  });
}
