import { InfoPage } from "../_components/InfoPage";

export const metadata = { title: "特定商取引法に基づく表記｜FOOD JAPAN NAKAMA" };

const ROWS: [string, React.ReactNode][] = [
  ["販売業者名", "株式会社グラブデザイン"],
  ["代表責任者名", "梅原卓也"],
  ["所在地", "〒102-0073 東京都千代田区九段北1丁目2-1"],
  ["電話番号", "03-6825-3901"],
  ["電話受付時間", "平日10:00〜17:00（土日祝日、GW、年末年始を除く）"],
  ["メールアドレス", "info@grab-design.com"],
  ["ホームページURL", <a key="hp" href="https://www.grab-design.com/" target="_blank" rel="noreferrer" className="text-[var(--green-d)] underline">https://www.grab-design.com/</a>],
  ["販売価格", "FOOD JAPAN NAKAMA 月額会員：月額22,000円（税込）"],
  ["商品代金以外の必要料金", "消費税は販売価格に含みます。会員間取引に伴う費用（商品代金・送料・決済手数料・専門家費用等）および通信料はお客様のご負担となります。"],
  ["お支払い方法", "クレジットカード決済（Stripe）"],
  ["お支払い時期・自動更新", "初回は申込日に決済し、直ちにご利用いただけます。翌月以降は毎月5日に当月分を自動決済（自動更新）します。"],
  ["提供時期", "お申し込み・決済完了後、直ちにご利用いただけます。"],
  ["解約・返金について", "当月末日までにマイページから解約手続きが可能です。解約された場合、当月末日をもって有料機能の提供を終了します。月の途中で解約された場合の日割り返金は行いません（詳細は利用規約 第9条・第10条をご確認ください）。"],
  ["動作環境", "最新版の Microsoft Edge／Mozilla Firefox／Google Chrome／Safari。JavaScript・Cookie・SSL を有効にしてご利用ください。動作環境外の場合、一部機能が利用できない、レイアウトが崩れる等が生じる場合があります。"],
];

export default function TokushohoPage() {
  return (
    <InfoPage
      eyebrow="LEGAL"
      title="特定商取引法に基づく表記"
      lead="「特定商取引に関する法律」第11条（通信販売についての広告）に基づき、以下のとおり表示します。"
    >
      <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
        <table className="w-full text-[13px]">
          <tbody>
            {ROWS.map(([k, v]) => (
              <tr key={k} className="border-b border-[#EDF0EA] last:border-0">
                <th className="w-[190px] bg-[var(--green-soft)] px-4 py-3 text-left align-top font-medium text-[var(--ink-2)]">
                  {k}
                </th>
                <td className="px-4 py-3 leading-7 text-[var(--ink)]">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InfoPage>
  );
}
