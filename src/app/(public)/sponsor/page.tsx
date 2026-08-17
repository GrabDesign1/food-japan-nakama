import type { Metadata } from "next";
import { SponsorForm } from "./SponsorForm";
import { SUMMIT, COMMON_BENEFITS } from "@/lib/sponsor";

// Food Japan Summit 2026 in MIYAZAKI の協賛申込フォーム。
// ⚠️ NAKAMA の機能ではない。**NAKAMA からリンクは張らず**、URLを直接案内して使う
//    （ユーザー指示 2026-08-17）。sitemap・llms.txt にも入れていない。
// ⚠️ 検索に出さない（noindex）。公開したくなったら robots を外して sitemap に追加する。
// ⚠️ 金額はすべて税別（NAKAMA本体は税込なので取り違えないこと）。

export const metadata: Metadata = {
  title: "協賛申込フォーム｜Food Japan Summit 2026 in MIYAZAKI",
  description:
    "Food Japan Summit 2026 in MIYAZAKI への協賛をご検討・お申し込みいただくためのフォームです。",
  robots: { index: false, follow: false },
};

const STATS: [string, string][] = [
  ["来場予定", "300名"],
  ["参加企業", "50社"],
  ["登壇者・自治体", "25名・20団体"],
  ["商談機会", "100件を目標"],
];

export default function SponsorPage() {
  return (
    <div className="mx-auto flex max-w-[900px] flex-col px-4 py-12">
      {/* このページ専用のヘッダー（NAKAMAのナビは出さない） */}
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--green-d)]">
          FOOD JAPAN SUMMIT 2026 in MIYAZAKI
        </p>
        <h1 className="font-serif text-[26px] leading-tight text-[var(--ink)] sm:text-[32px]">
          協賛申込フォーム
        </h1>
      </header>

      <p className="mt-5 text-[14px] leading-8 text-[var(--ink-2)]">
        Food Japan Summit 2026 in MIYAZAKI への協賛をご検討・お申し込みいただくためのフォームです。
      </p>
      <p className="mt-3 text-[14px] leading-8 text-[var(--ink-2)]">
        Food Japan Summit は、生産者、食品メーカー、小売・流通、飲食、行政、金融、物流、スタートアップなどが集い、
        登壇・試食・商談を通じて、新しい商品、販路、地域連携、食品ロス対策などの共創事業を生み出す場です。
      </p>

      <dl className="mt-6 grid gap-x-6 gap-y-2 border-y border-[var(--line)] py-4 sm:grid-cols-2">
        {([
          ["開催日", SUMMIT.dates],
          ["会場", SUMMIT.venue],
          ["主催", SUMMIT.host],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="flex gap-3 text-[13px]">
            <dt className="w-[64px] shrink-0 font-bold text-[var(--ink)]">{k}</dt>
            <dd className="text-[var(--ink-2)]">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map(([k, v]) => (
          <div key={k} className="rounded-[8px] bg-[var(--green-soft)] px-3 py-3 text-center">
            <div className="text-[11px] text-[var(--ink-2)]">{k}</div>
            <div className="mt-0.5 text-[15px] font-bold text-[var(--green-d)]">{v}</div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[14px] leading-8 text-[var(--ink-2)]">
        協賛企業の皆さまと、イベント当日だけで終わらない共創事業をつくっていきます。
      </p>

      <section className="mt-8 rounded-[10px] border border-[var(--line)] p-5">
        <h2 className="text-[15px] font-bold text-[var(--ink)]">協賛企業共通の提供価値</h2>
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {COMMON_BENEFITS.map((b) => (
            <li key={b} className="text-[13px] leading-7 text-[var(--ink-2)]">・{b}</li>
          ))}
        </ul>
      </section>

      <div className="mt-10">
        <SponsorForm />
      </div>

      <footer className="mt-12 border-t border-[var(--line)] pt-5 text-[12px] leading-7 text-[var(--muted)]">
        フードジャパンサミット実行委員会（株式会社グラブデザイン）
        <br />
        〒102-0073 東京都千代田区九段北1-2-1／info@grab-design.com／03-6825-3901
      </footer>
    </div>
  );
}
