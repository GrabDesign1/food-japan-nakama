import Link from "next/link";
import { InfoPage } from "../_components/InfoPage";

export const metadata = { title: "よくある質問｜FOOD JAPAN NAKAMA" };

const QA: [string, React.ReactNode][] = [
  ["料金はいくらですか？", "月額22,000円（税込）です。初回は申込日に決済し、以後は1か月ごと（毎月、申込日と同じ日）に自動更新・決済されます。"],
  ["解約はできますか？", "はい。次回更新日の前日までにマイページから解約できます。解約後も契約期間の満了までご利用いただけます。契約期間の途中で解約された場合の日割り返金はありません。"],
  ["ログインしなくても見られますか？", "掲載案件（共創プロジェクト・売りたい・買いたい）の概要はどなたでもご覧いただけます。詳細の閲覧・お問い合わせ・自社の掲載は月額会員でご利用いただけます。"],
  ["どんな人が使えますか？", "生産者・食品メーカー・小売・飲食店・流通・物流・サービス・自治体など、食に関わる法人・団体の方にご利用いただけます。"],
  ["取引の当事者は誰になりますか？", "FOOD JAPAN NAKAMAは出会いの場を提供するプラットフォームです。会員間の取引は当事者間の責任で行っていただきます（詳細は利用規約をご確認ください）。"],
  ["支払い方法は？", "クレジットカード決済（Stripe）に対応しています。"],
];

export default function FaqPage() {
  return (
    <InfoPage eyebrow="FAQ" title="よくある質問">
      <div className="flex flex-col gap-3">
        {QA.map(([q, a], i) => (
          <div key={i} className="rounded-[10px] border border-[var(--line)] bg-white p-5">
            <h2 className="text-[14px] font-semibold text-[var(--ink)]">Q. {q}</h2>
            <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">A. {a}</p>
          </div>
        ))}
      </div>
      <p className="text-[13px] text-[var(--ink-2)]">
        解決しない場合は<Link href="/contact" className="text-[var(--green-d)] underline">お問い合わせ</Link>ください。
      </p>
    </InfoPage>
  );
}
