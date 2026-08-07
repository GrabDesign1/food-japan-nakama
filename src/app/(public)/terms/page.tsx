import { InfoPage, LegalBody } from "../_components/InfoPage";
import { TERMS_TEXT } from "@/lib/legal";

export const metadata = { title: "利用規約｜FOOD JAPAN NAKAMA" };

export default function TermsPage() {
  return (
    <InfoPage eyebrow="TERMS" title="利用規約">
      <LegalBody text={TERMS_TEXT} />
    </InfoPage>
  );
}
