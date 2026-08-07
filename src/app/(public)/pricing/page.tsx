import Link from "next/link";
import { InfoPage } from "../_components/InfoPage";
import { btn } from "@/lib/ui";

export const metadata = { title: "利用料金｜FOOD JAPAN NAKAMA" };

export default function PricingPage() {
  return (
    <InfoPage eyebrow="PRICING" title="利用料金">
      <div className="rounded-[12px] border border-[var(--green)] bg-white p-6">
        <div className="text-[13px] text-[var(--muted)]">FOOD JAPAN NAKAMA 月額会員</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-serif text-[40px] text-[var(--green-d)]">22,000</span>
          <span className="text-[15px] text-[var(--ink-2)]">円 / 月（税込）</span>
        </div>
        <p className="mt-3 text-[13px] leading-7 text-[var(--ink-2)]">
          初回は<b>申込日に決済</b>し、その場でご利用いただけます。翌月以降は<b>毎月5日</b>に当月分を自動決済（自動更新）します。
          <b>当月末日まで</b>にマイページから解約できます（日割り返金はありません）。お支払いはクレジットカード（Stripe）です。
        </p>
        <div className="mt-5">
          <Link href="/signup" className={btn("primary", "lg")}>月額会員に申し込む</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[10px] border border-[var(--line)] bg-white p-5">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">含まれるもの</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
            <li>・自社プロフィール・案件（売りたい／買いたい）の掲載</li>
            <li>・掲載案件の詳細閲覧</li>
            <li>・会員へのメッセージ・問い合わせ</li>
            <li>・共創プロジェクトの掲載・応募</li>
            <li>・Food Japan Summit の共創ネットワークの活用</li>
          </ul>
        </div>
        <div className="rounded-[10px] border border-[var(--line)] bg-white p-5">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">含まれないもの</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
            <li>・会員間取引に伴う商品代金・送料・決済手数料</li>
            <li>・専門家費用、許認可費用、通信料 など</li>
          </ul>
          <p className="mt-3 text-[12px] text-[var(--muted)]">
            詳細は<Link href="/terms" className="underline">利用規約</Link>・
            <Link href="/tokushoho" className="underline">特定商取引法に基づく表記</Link>をご確認ください。
          </p>
        </div>
      </div>
    </InfoPage>
  );
}
