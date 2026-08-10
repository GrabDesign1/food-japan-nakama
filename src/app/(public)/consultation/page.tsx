import { prisma } from "@/lib/db";
import { getPublicTenantId } from "@/lib/public-content";
import { InfoPage } from "../_components/InfoPage";
import { ConsultationForm } from "./ConsultationForm";

export const metadata = {
  title: "個別相談・共創テーマ相談｜FOOD JAPAN NAKAMA",
  description:
    "共創テーマ設計・パートナー探索、共創プロデュース、クラウドファンディング支援、食品ロスに関する個別相談フォームです。",
};

export default async function ConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; project?: string; service?: string }>;
}) {
  const { type: rawType, project: projectId, service } = await searchParams;
  // マイページ「事務局へ依頼する」からの導線（?type=service&service=promotion_plan 等）
  const type = rawType === "service" && service ? service : rawType;

  // 共創プロジェクト伴走の相談：対象プロジェクトを引き継ぐ（公開ページのため掲載中のみタイトル表示）
  let project: { id: string; title: string | null } | null = null;
  if (type === "project" && projectId) {
    const tenantId = await getPublicTenantId();
    if (tenantId) {
      const p = await prisma.project.findFirst({
        where: { id: projectId, tenantId },
        select: { id: true, title: true, status: true },
      });
      if (p) project = { id: p.id, title: p.status === "published" ? p.title : null };
    }
  }

  return (
    <InfoPage
      eyebrow="CONSULTATION"
      title="個別相談・共創テーマ相談"
      lead="共創テーマの設計・パートナー探索、共創プロデュース（企画・実証・事業化の個別支援）、クラウドファンディング支援、共創プロジェクトの伴走のご相談を受け付けます。内容を確認のうえ、担当者よりご連絡します。"
    >
      <ConsultationForm defaultType={type ?? ""} project={project} />
    </InfoPage>
  );
}
