import Link from "next/link";
import type { Metadata } from "next";
import { InquiryForm } from "./InquiryForm";
import { VENUES, HOST } from "@/lib/sponsor";

// 協賛内容の相談（プラン未定でも送れる短いフォーム）。
// ⚠️ 必須は組織名・担当者名・電話番号・メールアドレスの4つだけにする（ユーザー指示 2026-08-17）。
//    ここを増やすと「まず相談したい人」が離脱するので、項目を足さないこと。

export const metadata: Metadata = {
  title: "協賛内容のご相談｜Food Japan Summit 2026",
  description:
    "Food Japan Summit 2026 の協賛について、プランが決まっていない段階でもご相談いただけます。",
  robots: { index: false, follow: false },
};

export default function SponsorContactPage() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col px-4 py-12">
      <Link href="/sponsor" className="text-[12px] text-[var(--green-d)] underline">
        ← 協賛のご案内に戻る
      </Link>

      <header className="mt-6 flex flex-col gap-1">
        <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--green-d)]">
          FOOD JAPAN SUMMIT 2026
        </p>
        <h1 className="font-serif text-[26px] leading-tight text-[var(--ink)] sm:text-[32px]">
          まずは協賛内容を相談する
        </h1>
      </header>

      <p className="mt-5 text-[14px] leading-8 text-[var(--ink-2)]">
        協賛プランや金額が決まっていない段階でもお送りいただけます。
        ご連絡先をうかがったうえで、事務局から貴社の目的に合わせてご提案します。
      </p>

      <dl className="mt-6 flex flex-col gap-2 border-y border-[var(--line)] py-4">
        {[VENUES.miyazaki, VENUES.nagoya].map((v) => (
          <div key={v.label} className="flex flex-wrap gap-x-3 text-[13px]">
            <dt className="w-[86px] shrink-0 font-bold text-[var(--ink)]">{v.label}</dt>
            <dd className="text-[var(--ink-2)]">{v.dates}／{v.venue}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        <InquiryForm />
      </div>

      <p className="mt-8 rounded-[8px] border border-[var(--line)] px-4 py-3 text-[13px] leading-7 text-[var(--ink-2)]">
        プランを決めてお申し込みになる場合は、
        <Link href="/sponsor/apply" className="text-[var(--green-d)] underline">
          協賛申込フォーム
        </Link>
        をご利用ください。
      </p>

      <footer className="mt-12 border-t border-[var(--line)] pt-5 text-[12px] leading-7 text-[var(--muted)]">
        {HOST}
        <br />
        〒102-0073 東京都千代田区九段北1-2-1／info@grab-design.com／03-6825-3901
      </footer>
    </div>
  );
}
