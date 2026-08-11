import { InfoPage } from "../_components/InfoPage";

export const metadata = { title: "運営会社｜FOOD JAPAN NAKAMA" };

const ROWS: [string, React.ReactNode][] = [
  ["会社名", "株式会社グラブデザイン"],
  ["代表者", "梅原卓也"],
  ["所在地", "〒102-0073 東京都千代田区九段北1丁目2-1"],
  ["電話番号", "03-6825-3901（平日10:00〜17:00／土日祝日、GW、年末年始を除く）"],
  ["メールアドレス", "info@grab-design.com"],
  ["ホームページ", <a key="u" href="https://www.grab-design.com/" target="_blank" rel="noreferrer" className="text-[var(--green-d)] underline">https://www.grab-design.com/</a>],
  ["事業内容", "FOOD JAPAN NAKAMA の企画・開発・運営、クリエイティブ・デジタル支援事業"],
];

export default function CompanyPage() {
  return (
    <InfoPage eyebrow="COMPANY" title="運営会社">
      <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
        <table className="w-full text-[13px]">
          <tbody>
            {ROWS.map(([k, v]) => (
              <tr key={k} className="border-b border-[var(--line-soft)] last:border-0">
                <th className="w-[150px] bg-[var(--green-soft)] px-4 py-3 text-left align-top font-medium text-[var(--ink-2)]">{k}</th>
                <td className="px-4 py-3 leading-7 text-[var(--ink)]">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InfoPage>
  );
}
