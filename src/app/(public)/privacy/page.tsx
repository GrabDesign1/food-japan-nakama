import { InfoPage, LegalBody } from "../_components/InfoPage";
import { PRIVACY_TEXT } from "@/lib/legal";

export const metadata = { title: "プライバシーポリシー｜FOOD JAPAN NAKAMA" };

export default function PrivacyPage() {
  return (
    <InfoPage eyebrow="PRIVACY" title="プライバシーポリシー">
      <LegalBody text={PRIVACY_TEXT} />
    </InfoPage>
  );
}
