import Link from "next/link";
import type { Metadata } from "next";
import { SUMMIT_TITLE, VENUES, HOST, COMMON_BENEFITS, PLAN_SUMMARY, PLAN_HIGHLIGHTS } from "@/lib/sponsor";
import { btn } from "@/lib/ui";

// Food Japan Summit 協賛の案内ページ。ここから2つに分岐させる。
//   ・協賛を申し込む       → /sponsor/apply（プラン選択を含む本申込）
//   ・まずは相談する       → /sponsor/contact（連絡先だけの短いフォーム）
// ⚠️ プランや金額を決めていない人が行き止まりにならないように、この2択にしている
//    （ユーザー指示 2026-08-17「金額・プランを決めてからでないと押せない状態をなくす」）。
// ⚠️ NAKAMA の機能ではないので noindex。URLを直接案内して使う。

export const metadata: Metadata = {
  title: "協賛のご案内｜Food Japan Summit 2026",
  description:
    "Food Japan Summit 2026（宮崎開催・名古屋開催）の協賛のご案内です。協賛のお申し込み、内容のご相談を承ります。",
  robots: { index: false, follow: false },
};

const THEMES = [
  "地域の素材を生かした商品をつくりたい",
  "新しい販路や取引先を見つけたい",
  "生産者や自治体と連携したい",
  "食品ロスや人材、物流などの課題を事業に変えたい",
];

export default function SponsorLandingPage() {
  return (
    <div className="mx-auto flex max-w-[900px] flex-col px-4 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--green-d)]">
          FOOD JAPAN SUMMIT 2026
        </p>
        <h1 className="font-serif text-[26px] leading-tight text-[var(--ink)] sm:text-[32px]">
          協賛ではなく、共創へ。
        </h1>
      </header>

      <div className="mt-6 flex flex-col gap-4 text-[14px] leading-8 text-[var(--ink-2)]">
        <p>Food Japan Summitは、企業名を掲出するだけのイベントではありません。</p>
        <p>
          生産者、食品メーカー、小売・流通、飲食、行政、金融、物流など、食の現場を動かす人たちと出会い、
          試食、対話、商談を通じて、新しい事業を生み出す場です。
        </p>
      </div>

      <ul className="mt-5 flex flex-col gap-2 border-l-[3px] border-[var(--green)] pl-4">
        {THEMES.map((t) => (
          <li key={t} className="text-[14px] leading-7 text-[var(--ink)]">
            「{t}」
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-col gap-4 text-[14px] leading-8 text-[var(--ink-2)]">
        <p>
          そんなテーマをお持ちの企業に、Food Japan Summitは具体的な出会いと、次の一歩をつくる機会を提供します。
        </p>
        <p>
          協賛企業には、開催前から当日、開催後まで、事業者との接点を設計します。
          登壇、試食・試飲、展示、商談候補者の紹介・面談調整、FOOD JAPAN NAKAMAへの掲載を通じて、
          貴社の挑戦を共創事業へつなげます。
        </p>
        <p>
          まずは、貴社が実現したいことをお聞かせください。
          <b className="text-[var(--ink)]">協賛プランが決まっていない場合も、事務局が目的に合わせてご相談を承ります。</b>
        </p>
      </div>

      {/* 「露出だけではない」＝申込の後押し。共créの説明の直後、ボタンの前に置く（ユーザー指示 2026-08-17） */}
      <section className="mt-9 rounded-[12px] border border-[var(--line)] bg-[var(--cream,#FAFAF7)] p-6">
        <h2 className="text-[16px] font-bold leading-8 text-[var(--ink)]">
          協賛で得られるのは、露出だけではありません。
        </h2>
        <div className="mt-2.5 flex flex-col gap-3 text-[14px] leading-8 text-[var(--ink-2)]">
          <p>
            貴社の事業テーマに応じて、生産者、食品メーカー、小売・流通、飲食、行政などとの接点を設計します。
          </p>
          <p>
            商品開発、販路開拓、地域連携、食品ロス、人材、物流など、解決したいテーマが明確でなくても構いません。
            まずは「何を実現したいか」をお聞かせください。
          </p>
          <p>
            <b className="text-[var(--ink)]">協賛プランは15万円から。</b>
            宮崎開催、名古屋開催、両開催からお選びいただけます。プランや金額が未確定の場合も、事務局がご相談を承ります。
          </p>
        </div>
      </section>

      {/* 申込へ進む前に押さえておきたい3点 */}
      <ul className="mt-6 flex flex-col gap-2">
        {PLAN_HIGHLIGHTS.map((h) => (
          <li key={h} className="flex items-start gap-2 text-[14px] leading-7 text-[var(--ink)]">
            <span className="mt-1 text-[12px] text-[var(--green-d)]">●</span>
            {h}
          </li>
        ))}
      </ul>

      {/* プラン早見表。中身は sponsor.ts のプラン定義から導出しているので手で直さない */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-[13px]">
          <thead>
            <tr>
              {["プラン", "単独開催", "両開催", "登壇", "展示・試食", "商談の紹介", "NAKAMA掲載"].map((h) => (
                <th
                  key={h}
                  className="border border-[var(--line)] bg-[var(--green-soft)] px-2.5 py-2 text-left text-[12px] font-bold text-[var(--ink)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_SUMMARY.map((r) => (
              <tr key={r.name}>
                <th className="border border-[var(--line)] px-2.5 py-2 text-left font-bold tracking-[0.03em] text-[var(--ink)]">
                  {r.name}
                </th>
                <td className="border border-[var(--line)] px-2.5 py-2 text-[var(--ink-2)]">{r.single}</td>
                <td className="border border-[var(--line)] px-2.5 py-2 text-[var(--ink-2)]">{r.both}</td>
                <td className="border border-[var(--line)] px-2.5 py-2 text-[var(--ink-2)]">
                  {r.presentation ?? "—"}
                </td>
                <td className="border border-[var(--line)] px-2.5 py-2 text-center text-[var(--ink-2)]">
                  {r.exhibit ? "○" : "—"}
                </td>
                <td className="border border-[var(--line)] px-2.5 py-2 text-center text-[var(--ink-2)]">
                  {r.matching ? "○" : "—"}
                </td>
                <td className="border border-[var(--line)] px-2.5 py-2 text-center text-[var(--ink-2)]">
                  {r.nakama ? "○" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
        金額はすべて税別です。宮崎県内に本店または主たる事業所を置く法人は、宮崎開催に限り特別割価格（PRESENTER 40万円／STRATEGIC 70万円／DIAMOND PARTNER 200万円）でお申し込みいただけます。各プランの詳しい特典は申込フォームでご確認いただけます。
      </p>

      {/* 2つの入口 */}
      <div className="mt-9 flex flex-col items-stretch gap-3 rounded-[12px] border border-[var(--green)] bg-[var(--green-soft)] p-6 sm:flex-row sm:justify-center">
        <Link
          href="/sponsor/apply"
          className={`${btn("primary", "lg")} border border-transparent text-[16px] sm:min-w-[280px]`}
        >
          {SUMMIT_TITLE} 協賛を申し込む
        </Link>
        <Link
          href="/sponsor/contact"
          className={`${btn("secondary", "lg")} text-[16px] sm:min-w-[280px]`}
        >
          まずは協賛内容を相談する
        </Link>
      </div>
      <p className="mt-2.5 text-center text-[11px] leading-5 text-[var(--muted)]">
        「相談する」は、ご連絡先だけの短いフォームです。プランや金額が決まっていなくてもお送りいただけます。
      </p>

      <dl className="mt-10 flex flex-col gap-2 border-y border-[var(--line)] py-4">
        {[VENUES.miyazaki, VENUES.nagoya].map((v) => (
          <div key={v.label} className="flex flex-wrap gap-x-3 text-[13px]">
            <dt className="w-[86px] shrink-0 font-bold text-[var(--ink)]">{v.label}</dt>
            <dd className="text-[var(--ink-2)]">{v.dates}／{v.venue}</dd>
          </div>
        ))}
        <div className="flex flex-wrap gap-x-3 text-[13px]">
          <dt className="w-[86px] shrink-0 font-bold text-[var(--ink)]">主催</dt>
          <dd className="text-[var(--ink-2)]">{HOST}</dd>
        </div>
      </dl>

      <section className="mt-8 rounded-[10px] border border-[var(--line)] p-5">
        <h2 className="text-[15px] font-bold text-[var(--ink)]">協賛企業共通の提供価値</h2>
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {COMMON_BENEFITS.map((b) => (
            <li key={b} className="text-[13px] leading-7 text-[var(--ink-2)]">・{b}</li>
          ))}
        </ul>
      </section>

      <footer className="mt-12 border-t border-[var(--line)] pt-5 text-[12px] leading-7 text-[var(--muted)]">
        {HOST}
        <br />
        〒102-0073 東京都千代田区九段北1-2-1／info@grab-design.com／03-6825-3901
      </footer>
    </div>
  );
}
