import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PublicTopBar } from "../_components/PublicTopBar";
import { JsonLd, breadcrumbJsonLd } from "../_components/JsonLd";
import { CASES_SORTED } from "@/lib/cases";
import { h1Cls } from "@/lib/ui";

// 実績の一覧。ニュース一覧の体裁（行を罫線で区切るだけ）で組む。
// 分類タブは件数が増えてから足す（2件で4つのタブを出しても選ぶ意味がない）。

export const metadata: Metadata = {
  title: "実績｜FOOD JAPAN NAKAMA",
  description:
    "FOOD JAPAN SUMMIT で生まれた出会いが、実際の取引・商品になった事例です。全国チェーンへのメニュー採用、老舗和菓子店との共同商品開発など。",
};

export default function CasesIndex() {
  return (
    <>
      <PublicTopBar />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "トップ", path: "/" },
          { name: "実績", path: "/cases" },
        ])}
      />

      <div className="mx-auto flex max-w-[900px] flex-col px-4 py-10">
        <Link href="/" className="text-[12px] text-[var(--green-d)] underline">
          ← トップに戻る
        </Link>

        <h1 className={`${h1Cls} mt-6`}>出会いを、実装まで進めた事例</h1>
        <p className="mt-2 max-w-[640px] text-[14px] leading-8 text-[var(--ink-2)]">
          FOOD JAPAN SUMMIT で生まれた出会いから、実際の取引や商品へ進んだ事例です。
          掲載しているのは、関係各社の承諾を得たものだけです。
        </p>

        <ul className="mt-8 border-t border-[var(--line)]">
          {CASES_SORTED.map((c) => (
            <li key={c.slug} className="border-b border-[var(--line)]">
              <Link
                href={`/cases/${c.slug}`}
                className="group flex flex-col gap-4 py-6 sm:flex-row sm:gap-6"
              >
                <Image
                  src={c.image}
                  alt=""
                  width={c.imageWidth}
                  height={c.imageHeight}
                  sizes="(max-width: 640px) 100vw, 260px"
                  className="h-auto w-full border border-[var(--line)] sm:w-[260px] sm:shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="text-[12px] font-semibold tracking-[0.06em] text-[var(--muted)]">
                      {c.period}
                      {c.periodNote ? ` ${c.periodNote}` : ""}
                    </span>
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-[3px] bg-[var(--green-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--green-d)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-1.5 text-[16px] font-bold leading-7 text-[var(--ink)] group-hover:text-[var(--green-d)] group-hover:underline">
                    {c.title}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-7 text-[var(--ink-2)]">{c.summary}</p>
                  <span className="mt-2 inline-block text-[12px] text-[var(--green-d)]">
                    事例を読む →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-10 border border-[var(--line)] p-6">
          <h2 className="text-[15px] font-bold text-[var(--ink)]">
            自社でも、こうした共創を始めたい
          </h2>
          <p className="mt-1.5 text-[13px] leading-7 text-[var(--ink-2)]">
            課題の整理から相手の探索、商談、事業化まで、NAKAMA事務局が個別に伴走します。
            まずは登録して、いま出ている案件を見るところから始められます。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/signup" className="text-[13px] text-[var(--green-d)] underline">
              無料で登録する →
            </Link>
            <Link href="/consultation" className="text-[13px] text-[var(--green-d)] underline">
              事務局に相談する →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
