// お気に入り一覧（企業・売りたい/買いたい・共創プロジェクト）
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { OfferingCard } from "@/components/OfferingCard";
import { ProducerCard } from "@/components/ProducerCard";
import { ProjectCard } from "@/components/ProjectCard";
import { EmptyState } from "@/components/EmptyState";
import { views24hMap } from "@/lib/offering-views";
import { eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";

export default async function FavoritesPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const favorites = await prisma.favorite.findMany({
    where: { memberId: me.id },
    orderBy: { createdAt: "desc" },
  });

  const idsOf = (t: string) => favorites.filter((f) => f.targetType === t).map((f) => f.targetId);
  const memberIds = idsOf("member");
  const offeringIds = idsOf("offering");
  const projectIds = idsOf("project");

  const [members, offerings, projects] = await Promise.all([
    memberIds.length
      ? prisma.member.findMany({
          where: { id: { in: memberIds }, status: "APPROVED" },
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            companyLogoUrl: true,
            imageUrls: true,
            categoryL1: true,
            categoryL2: true,
            prefecture: true,
            city: true,
            productItems: true,
            description: true,
          },
        })
      : Promise.resolve([]),
    offeringIds.length
      ? prisma.offering.findMany({
          where: { id: { in: offeringIds }, isPublic: true },
          include: { member: { select: { name: true } } },
        })
      : Promise.resolve([]),
    projectIds.length
      ? prisma.project.findMany({ where: { id: { in: projectIds }, status: "published" } })
      : Promise.resolve([]),
  ]);

  // 閲覧数マップと掲載者名は互いに独立なので並列で取得
  const projMemberIds = Array.from(new Set(projects.map((p) => p.memberId)));
  const [viewMap, projMembers] = await Promise.all([
    views24hMap(offerings.map((o) => o.id)),
    projMemberIds.length
      ? prisma.member.findMany({ where: { id: { in: projMemberIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  const projNameMap = new Map(projMembers.map((m) => [m.id, m.name]));

  const isEmpty = members.length === 0 && offerings.length === 0 && projects.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className={eyebrowCls}>FAVORITES</p>
        <h1 className={h1Cls}>お気に入り</h1>
        <p className="mt-1 text-[13px] text-[var(--ink-2)]">
          気になる企業・売りたい/探している・共創プロジェクトをここにまとめて見返せます。
        </p>
      </div>

      {isEmpty ? (
        <EmptyState
          title="お気に入りはまだありません"
          description="各詳細ページの「☆ お気に入りに追加」で登録すると、ここに一覧されます。"
          actions={[{ label: "共創パートナーを探す", href: "/search", variant: "primary" }]}
        />
      ) : (
        <>
          {offerings.length > 0 ? (
            <div>
              <h2 className={`${h2Cls} mb-3`}>売りたい・探している</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {offerings.map((o) => (
                  <OfferingCard
                    key={o.id}
                    o={{ ...o, memberName: o.member.name, views24h: viewMap.get(o.id) ?? 0 }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {projects.length > 0 ? (
            <div>
              <h2 className={`${h2Cls} mb-3`}>共創プロジェクト</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    p={{ id: p.id, title: p.title, imageUrls: p.imageUrls, memberName: projNameMap.get(p.memberId), budget: p.budget }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {members.length > 0 ? (
            <div>
              <h2 className={`${h2Cls} mb-3`}>企業</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {members.map((m) => (
                  <ProducerCard key={m.id} p={m} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
