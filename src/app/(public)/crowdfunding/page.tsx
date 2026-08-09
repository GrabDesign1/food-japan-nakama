import Link from "next/link";
import { InfoPage } from "../_components/InfoPage";
import { JsonLd, CROWDFUNDING_JSONLD } from "../_components/JsonLd";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "クラウドファンディング支援｜FOOD JAPAN NAKAMA",
  description:
    "Makuakeなどを活用して販売前に市場の反応を確認し、売上・購入者の声・販売実績を一般販売や小売・流通への提案につなげる支援サービスです。",
};

const SCOPE = [
  "商品・社会的テーマ・顧客の整理", "プラットフォーム選定支援", "掲載申請・進行支援",
  "リターン、価格、目標金額、スケジュール設計", "ページ構成、コピー、写真、動画、デザイン",
  "広報・広告・集客支援", "応援購入の進捗管理", "問い合わせ・販売管理の運用設計",
  "終了後の一般販売・卸・小売への提案",
];

const CONDITIONS = [
  "提供できる商品と供給責任者が明確", "原価・送料を含む収支が成立する",
  "目標達成後に提供できる供給量と日程がある", "食品表示・品質・返品対応の責任分担が明確",
  "取材、撮影、情報公開に協力できる",
];

export default function CrowdfundingPage() {
  return (
    <InfoPage
      eyebrow="クラウドファンディング支援"
      title="予約販売で、需要と次の販路をつくる。"
      lead="Makuakeなどを活用して販売前に市場の反応を確認し、売上・購入者の声・販売実績を、一般販売や小売・流通への提案につなげます。商品を売りながら、市場の可能性を確かめます。"
    >
      <JsonLd data={CROWDFUNDING_JSONLD} />
      <div>
        <Link href="/consultation?type=crowdfunding" className={btn("primary", "lg")}>クラファン支援を相談する</Link>
      </div>

      <section>
        <h2 className="font-serif text-[18px] text-[var(--ink)]">支援範囲</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {SCOPE.map((s) => (
            <li key={s} className="flex gap-2 rounded-[10px] border border-[var(--line)] bg-white px-4 py-3 text-[13px] leading-6 text-[var(--ink-2)]">
              <span className="text-[var(--green-d)]">・</span>{s}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-[18px] text-[var(--ink)]">料金</h2>
        <div className="mt-3 rounded-[10px] border border-[var(--line)] bg-white p-5">
          <p className="text-[14px] font-semibold text-[var(--ink)]">最低着手金＋制作費＋販売成功報酬</p>
          <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
            プロジェクト内容、制作物、広告、運営範囲に応じて個別にお見積りします。
            Makuake側の手数料、決済手数料、広告費、原価、送料、返品・再送等は別項目として収支計画に含めます。
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-[18px] text-[var(--ink)]">採択条件</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {CONDITIONS.map((c) => (
            <li key={c} className="text-[13px] leading-6 text-[var(--ink-2)]">・{c}</li>
          ))}
        </ul>
      </section>

      <p className="rounded-[10px] border border-[var(--line)] bg-white p-4 text-[12px] leading-6 text-[var(--muted)]">
        FOOD JAPANはMakuake等のプラットフォームを活用したプロジェクトを支援します。公式代理店・公式パートナーであるとの表示は、正式な契約確認ができる場合に限ります。
      </p>

      <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-6 text-center">
        <p className="text-[14px] font-semibold text-[var(--ink)]">商品を売りながら、市場の可能性を確かめる。</p>
        <div className="mt-3">
          <Link href="/consultation?type=crowdfunding" className={btn("primary")}>クラファン支援を相談する</Link>
        </div>
      </div>
    </InfoPage>
  );
}
