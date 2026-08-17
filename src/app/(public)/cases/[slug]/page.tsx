import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTopBar } from "../../_components/PublicTopBar";
import { JsonLd, breadcrumbJsonLd } from "../../_components/JsonLd";
import { CASES_SORTED, findCase } from "@/lib/cases";
import { btn, h1Cls } from "@/lib/ui";

// 実績の詳細。プレスリリース／ニュース記事の体裁で組む（1カラム・左揃え・装飾は最小）。
// 帯・カードグリッド・英字ラベルは使わない（読み物として読ませるため）。

export function generateStaticParams() {
  // 非公開の事例はページ自体を作らない
  return CASES_SORTED.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = findCase(slug);
  if (!c) return { title: "実績｜FOOD JAPAN NAKAMA" };
  return {
    title: `${c.title}｜FOOD JAPAN NAKAMA`,
    description: c.summary,
    openGraph: { title: c.title, description: c.summary, images: [c.image] },
  };
}

export default async function CaseDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = findCase(slug);
  if (!c) notFound();

  return (
    <>
      <PublicTopBar />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "トップ", path: "/" },
          { name: "実績", path: "/cases" },
          { name: c.title, path: `/cases/${c.slug}` },
        ])}
      />

      <article className="mx-auto flex max-w-[820px] flex-col px-4 py-10">
        <Link href="/cases" className="text-[12px] text-[var(--green-d)] underline">
          ← 実績一覧に戻る
        </Link>

        {/* 日付と分類（ニュース記事の頭） */}
        <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[13px] font-semibold tracking-[0.06em] text-[var(--muted)]">
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

        <h1 className={`${h1Cls} mt-2 leading-[1.55]`}>{c.title}</h1>

        {/* リード（一次情報の体裁に合わせた枠囲み1行） */}
        <p className="mt-5 border border-[var(--line)] px-4 py-3 text-[13px] leading-7 text-[var(--ink-2)]">
          {c.lead}
        </p>

        <Image
          src={c.image}
          alt={c.imageAlt}
          width={c.imageWidth}
          height={c.imageHeight}
          sizes="(max-width: 820px) 100vw, 820px"
          className="mt-7 h-auto w-full border border-[var(--line)]"
          priority
        />

        {/* 本文 */}
        <div className="mt-9 flex flex-col gap-8">
          {c.sections.map((s, i) => (
            <section key={i}>
              {s.heading ? (
                <h2 className="mb-2.5 border-l-[3px] border-[var(--green)] pl-2.5 text-[15px] font-bold leading-6 text-[var(--ink)]">
                  {s.heading}
                </h2>
              ) : null}
              <div className="flex flex-col gap-4">
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="text-[14px] leading-8 text-[var(--ink-2)]">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* 事実の一覧 */}
        <section className="mt-10">
          <h2 className="mb-3 text-[15px] font-bold text-[var(--ink)]">この事例の概要</h2>
          <dl className="border-t border-[var(--line)]">
            {c.facts.map((f) => (
              <div
                key={f.label}
                className="flex flex-col gap-0.5 border-b border-[var(--line)] py-3 sm:flex-row sm:gap-4"
              >
                <dt className="text-[12px] font-bold text-[var(--ink)] sm:w-[130px] sm:shrink-0">
                  {f.label}
                </dt>
                <dd className="text-[13px] leading-6 text-[var(--ink-2)]">{f.value}</dd>
              </div>
            ))}
          </dl>
          {c.factsNote ? (
            <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">{c.factsNote}</p>
          ) : null}
        </section>

        {/* 出典 */}
        <section className="mt-8">
          <h2 className="mb-2 text-[12px] font-bold text-[var(--ink)]">出典</h2>
          <ul className="flex flex-col gap-1">
            {c.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] leading-6 text-[var(--green-d)] underline"
                >
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
            掲載内容は関係各社の承諾を得たものです。記載の社名・商品名は各社の商標または登録商標です。
          </p>
        </section>

        {/* 関連する支援メニュー（帯にせず、枠だけの静かな作りにする） */}
        <section className="mt-10 border border-[var(--line)] p-6">
          <h2 className="text-[15px] font-bold text-[var(--ink)]">{c.cta.heading}</h2>
          <p className="mt-1.5 text-[13px] leading-7 text-[var(--ink-2)]">{c.cta.body}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={c.cta.href} className={btn("primary")}>
              {c.cta.label}
            </Link>
            <Link href="/consultation" className={btn("secondary")}>
              事務局に相談する
            </Link>
          </div>
        </section>

        <div className="mt-10 border-t border-[var(--line)] pt-6">
          <Link href="/cases" className="text-[12px] text-[var(--green-d)] underline">
            ← 実績一覧に戻る
          </Link>
        </div>
      </article>
    </>
  );
}
