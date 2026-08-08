import { InfoPage } from "../_components/InfoPage";
import { ConsultationForm } from "./ConsultationForm";

export const metadata = {
  title: "個別相談｜FOOD JAPAN NAKAMA",
  description: "共創プロデュース／クラウドファンディング支援に関する個別相談フォームです。",
};

export default async function ConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  return (
    <InfoPage
      eyebrow="CONSULTATION"
      title="個別相談"
      lead="共創プロデュース（企画・実証・事業化の個別支援）や、クラウドファンディング支援（Makuake等を活用した販売・市場検証）のご相談を受け付けます。内容を確認のうえ、担当者よりご連絡します。"
    >
      <ConsultationForm defaultType={type ?? ""} />
    </InfoPage>
  );
}
