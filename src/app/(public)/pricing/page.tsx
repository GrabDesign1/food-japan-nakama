import Link from "next/link";
import { InfoPage } from "../_components/InfoPage";
import { JsonLd, MEMBERSHIP_JSONLD } from "../_components/JsonLd";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "料金｜FOOD JAPAN NAKAMA",
  description: "NAKAMA（月額会員）、共創プロデュース、クラウドファンディング支援の3サービスの料金と、含む／含まないを比較します。",
};

export default function PricingPage() {
  return (
    <InfoPage
      eyebrow="PRICING"
      title="料金"
      lead="FOOD JAPANのサービスは3つです。役割と料金が混ざらないよう、比較して選べます。"
    >
      <JsonLd data={MEMBERSHIP_JSONLD} />
      {/* 3サービス比較 */}
      <div className="overflow-x-auto rounded-[10px] border border-[var(--line)] bg-white">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--green-soft)] text-left text-[12px] text-[var(--ink-2)]">
              <th className="px-4 py-3 font-medium"> </th>
              <th className="px-4 py-3 font-medium">NAKAMA</th>
              <th className="px-4 py-3 font-medium">共創プロデュース</th>
              <th className="px-4 py-3 font-medium">クラファン支援</th>
            </tr>
          </thead>
          <tbody className="text-[var(--ink-2)]">
            <tr className="border-b border-[#EDF0EA]">
              <th className="px-4 py-3 text-left font-medium text-[var(--ink)]">目的</th>
              <td className="px-4 py-3">自分で出会い、学ぶ</td>
              <td className="px-4 py-3">人と一緒に企画・事業化</td>
              <td className="px-4 py-3">販売して市場を検証</td>
            </tr>
            <tr className="border-b border-[#EDF0EA]">
              <th className="px-4 py-3 text-left font-medium text-[var(--ink)]">FOOD JAPANの関与</th>
              <td className="px-4 py-3">場と機会を提供</td>
              <td className="px-4 py-3">担当者・専門家が介在</td>
              <td className="px-4 py-3">企画・ページ・販売進行を支援</td>
            </tr>
            <tr className="border-b border-[#EDF0EA]">
              <th className="px-4 py-3 text-left font-medium text-[var(--ink)]">料金</th>
              <td className="px-4 py-3 font-semibold text-[var(--green-d)]">月額22,000円（税込）</td>
              <td className="px-4 py-3">15万円（税抜）〜</td>
              <td className="px-4 py-3">個別見積</td>
            </tr>
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--ink)]"> </th>
              <td className="px-4 py-3"><Link href="/signup" className="text-[var(--green-d)] underline">会員に申し込む</Link></td>
              <td className="px-4 py-3"><Link href="/produce" className="text-[var(--green-d)] underline">詳細・相談</Link></td>
              <td className="px-4 py-3"><Link href="/crowdfunding" className="text-[var(--green-d)] underline">詳細・相談</Link></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* NAKAMA 詳細 */}
      <section className="rounded-[12px] border border-[var(--green)] bg-white p-6">
        <div className="text-[13px] text-[var(--muted)]">NAKAMA 月額会員</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-serif text-[38px] text-[var(--green-d)]">22,000</span>
          <span className="text-[14px] text-[var(--ink-2)]">円 / 月（税込）</span>
        </div>
        <p className="mt-3 text-[13px] leading-7 text-[var(--ink-2)]">
          初回は<b>申込日に決済</b>し、以後は<b>1か月ごと（毎月、申込日と同じ日）</b>に自動決済（自動更新）します。<b>次回更新日の前日まで</b>に解約できます（日割り返金なし）。お支払いはクレジットカード（Stripe）。
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--ink)]">含まれるもの</h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
              <li>・自社プロフィール掲載</li>
              <li>・売りたい・買いたい・共創案件の掲載</li>
              <li>・案件詳細の閲覧</li>
              <li>・会員への問い合わせ・メッセージ</li>
              <li>・会員向けセミナーへの参加</li>
              <li>・Food Japan Summit ネットワークとの接点</li>
            </ul>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--ink)]">含まれないもの</h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
              <li>・FOOD JAPANによる候補企業の個別選定・打診・紹介保証</li>
              <li>・営業代行、面談同席、交渉、企画書作成</li>
              <li>・共創プロデュース／クラウドファンディング支援</li>
              <li>・商品代金、送料、決済、許認可、専門家、制作等の費用</li>
            </ul>
          </div>
        </div>

        {/* CTA（グリッド外で全幅に整列）*/}
        <div className="mt-6">
          <Link href="/signup" className={btn("primary", "lg")}>NAKAMAに申し込む</Link>
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--green-soft)] p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-[12px] leading-6 text-[var(--ink-2)]">
            企画・実証・事業化まで当事務局を入れて進めたい場合は、共創プロデュース（別料金）をご利用ください。
          </p>
          <Link href="/consultation?type=produce" className={`${btn("secondary", "sm")} shrink-0`}>
            共創プロデュースを問い合わせる
          </Link>
        </div>
      </section>

      <p className="text-[12px] leading-6 text-[var(--muted)]">
        共創プロデュースの料金は<Link href="/produce" className="underline">共創プロデュース</Link>ページ、
        クラウドファンディング支援は<Link href="/crowdfunding" className="underline">クラファン支援</Link>ページ（個別見積）をご覧ください。
        金額は税抜・税込を明記しています。詳細は<Link href="/terms" className="underline">利用規約</Link>・
        <Link href="/tokushoho" className="underline">特定商取引法に基づく表記</Link>をご確認ください。
      </p>
    </InfoPage>
  );
}
