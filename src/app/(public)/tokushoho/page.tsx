import { InfoPage } from "../_components/InfoPage";

export const metadata = { title: "特定商取引法に基づく表記｜FOOD JAPAN NAKAMA" };

const ROWS: [string, React.ReactNode][] = [
  ["販売業者名", "株式会社グラブデザイン"],
  ["代表責任者名", "梅原卓也"],
  ["所在地", "〒102-0073 東京都千代田区九段北1丁目2-1"],
  ["電話番号", "03-6825-3901"],
  ["電話受付時間", "平日10:00〜17:00（土日祝日、GW、年末年始を除く）"],
  ["メールアドレス", "info@grab-design.com"],
  ["ホームページURL", <span key="hp">運営会社：<a href="https://www.grab-design.com/" target="_blank" rel="noreferrer" className="text-[var(--green-d)] underline">https://www.grab-design.com/</a>／本サービス：<a href="https://nakama.food-japan-summit.jp/" className="text-[var(--green-d)] underline">https://nakama.food-japan-summit.jp/</a></span>],
  ["販売価格", "FOOD JAPAN NAKAMA 月額会員：月額22,000円（税込）"],
  ["契約期間", "1か月。ただし、解約手続がない限り1か月ごとに無期限で自動更新されます。"],
  ["商品代金以外の必要料金", "消費税は販売価格に含みます。会員間取引に伴う費用（商品代金・送料・決済手数料・専門家費用等）および通信料はお客様のご負担となります。"],
  ["お支払い方法", "クレジットカード決済（Stripe）"],
  ["お支払い時期・自動更新", "初回は申込日に決済し、直ちにご利用いただけます。以後は1か月ごとの更新日（申込日と同じ暦日。該当する日がない月はその月の末日）に自動決済（自動更新）します。次回の更新日はマイページのお支払い管理からご確認いただけます。"],
  ["提供時期", "お申し込み・決済完了後、直ちにご利用いただけます。"],
  ["解約・返金について", <span key="cancel">次回更新日の前日の午後11時59分（日本時間）までに、<a href="/billing" className="text-[var(--green-d)] underline">マイページの「プラン・お支払い」</a>から解約手続きが可能です。通信障害等によりオンラインで解約できない場合は、同期限までに info@grab-design.com へ解約の意思をご連絡ください。解約された場合、進行中の契約期間の満了をもって有料機能の提供を終了します（満了までは利用できます）。契約期間の途中で解約された場合の日割り返金は行いません（詳細は利用規約 第9条・第10条をご確認ください）。なお、本サービスは通信販売のため、クーリング・オフの適用はありません。</span>],
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
