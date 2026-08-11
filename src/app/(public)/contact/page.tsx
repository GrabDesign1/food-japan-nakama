import { InfoPage } from "../_components/InfoPage";

export const metadata = { title: "お問い合わせ｜FOOD JAPAN NAKAMA" };

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="CONTACT"
      title="お問い合わせ"
      lead="FOOD JAPAN NAKAMA の運営（株式会社グラブデザイン）へのお問い合わせは、以下よりお願いいたします。"
    >
      <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
        <table className="w-full text-[13px]">
          <tbody>
            <tr className="border-b border-[var(--line-soft)]">
              <th className="w-[150px] bg-[var(--green-soft)] px-4 py-3 text-left font-medium text-[var(--ink-2)]">メール</th>
              <td className="px-4 py-3 text-[var(--ink)]">
                <a href="mailto:info@grab-design.com" className="text-[var(--green-d)] underline">info@grab-design.com</a>
              </td>
            </tr>
            <tr className="border-b border-[var(--line-soft)]">
              <th className="bg-[var(--green-soft)] px-4 py-3 text-left font-medium text-[var(--ink-2)]">電話</th>
              <td className="px-4 py-3 text-[var(--ink)]">03-6825-3901</td>
            </tr>
            <tr>
              <th className="bg-[var(--green-soft)] px-4 py-3 text-left font-medium text-[var(--ink-2)]">受付時間</th>
              <td className="px-4 py-3 text-[var(--ink)]">平日10:00〜17:00（土日祝日、GW、年末年始を除く）</td>
            </tr>
          </tbody>
        </table>
      </div>
    </InfoPage>
  );
}
