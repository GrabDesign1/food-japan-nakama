import { prisma } from "@/lib/db";
import { getPublicTenantId } from "@/lib/public-content";
import { InfoPage } from "../_components/InfoPage";
import { ConsultationForm } from "./ConsultationForm";

export const metadata = {
  title: "個別相談｜FOOD JAPAN NAKAMA",
  description: "共創プロデュース／クラウドファンディング支援に関する個別相談フォームです。",
};

export default async function ConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; project?: string }>;
}) {
  const { type, project: projectId } = await searchParams;

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
      title="個別相談"
      lead="共創プロデュース（企画・実証・事業化の個別支援）、クラウドファンディング支援（Makuake等を活用した販売・市場検証）、共創プロジェクトの伴走のご相談を受け付けます。内容を確認のうえ、担当者よりご連絡します。"
    >
      <ConsultationForm defaultType={type ?? ""} project={project} />
    </InfoPage>
  );
}
