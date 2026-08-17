import Link from "next/link";
import type { Metadata } from "next";
import { PublicTopBar } from "../_components/PublicTopBar";
import { OfferingCard } from "@/components/OfferingCard";
import { ProjectCard } from "@/components/ProjectCard";
import { getPublicListings } from "@/lib/public-content";
import { CASES_SORTED } from "@/lib/cases";
import { btn, h1Cls } from "@/lib/ui";

// 公開の案件一覧（未ログインでも見られる）。
// ⚠️ 出す情報の粒度はトップのカードと同じ。会員限定の情報（連絡先・非公開項目）は出さない。
// ⚠️「すべて」タブは作らない＝売りたいと探しているは見る人が逆なので混ぜない（2026-08-11 の決定）。

export const revalidate = 300;

type Tab = { key: "want" | "give" | "coproject"; label: string; sub: string; head: string; lead: string };

const TABS: Tab[] = [
  {
    key: "want",
    label: "探している",
    sub: "仕入れ先・調達先を探している募集",
    head: "探している（調達したい）案件",
    lead: "食品メーカー・飲食店・小売・加工会社などが、必要な食材、原料、商品、技術、加工先を探しています。",
  },
  {
    key: "give",
    label: "売りたい",
    sub: "販路・買い手を探している商品",
    head: "売りたい（提供したい）案件",
    lead: "旬の農産物、業務用原料、加工品、規格外品、余剰品、設備、技術など。販路や買い手を探しています。",
  },
  {
    key: "coproject",
    label: "共創したい",
    sub: "一緒に事業をつくる相手の募集",
    head: "共創パートナー募集",
    lead: "新商品開発、食品ロス、地域課題、新規事業など。一緒に取り組む相手を探しています。",
  },
];

function resolveTab(v: string | undefined): Tab {
  return TABS.find((t) => t.key === v) ?? TABS[0];
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const tab = resolveTab(sp.type);
  return {
    title: `${tab.head}｜FOOD JAPAN NAKAMA`,
    description: tab.lead,
  };
}

export default async function PublicListings({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const tab = resolveTab(sp.type);
  const { offerings, projects, projNameMap, total } = await getPublicListings(tab.key);
  const isEmpty = total === 0;

  return (
    <>
      <PublicTopBar />
      <div className="mx-auto flex max-w-[1100px] flex-col px-4 py-10">
        <Link href="/" className="text-[12px] text-[var(--green-d)] underline">
          ← トップに戻る
        </Link>

        <h1 className={`${h1Cls} mt-6`}>{tab.head}</h1>
        <p className="mt-2 max-w-[720px] text-[14px] leading-8 text-[var(--ink-2)]">{tab.lead}</p>

        {/* 切替は必ず Link（form送信にするとクライアント遷移が効かず「押しても固まる」体感になる） */}
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="案件の種類">
          {TABS.map((t) => {
            const active = t.key === tab.key;
            return (
              <Link
                key={t.key}
                href={`/listings?type=${t.key}`}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-md border border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-bold text-white"
                    : "rounded-md border border-[var(--line)] bg-white px-4 py-2 text-[13px] text-[var(--ink-2)] hover:border-[var(--green)] hover:text-[var(--green-d)]"
                }
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {isEmpty ? (
          <div className="mt-8 border border-[var(--line)] p-6">
            <h2 className="text-[15px] font-bold text-[var(--ink)]">
              この区分の案件は、いま準備中です
            </h2>
            <p className="mt-1.5 text-[13px] leading-7 text-[var(--ink-2)]">
              事務局が順次登録しています。掲載され次第、ここに表示されます。
              <br />
              先に自社の募集を出しておくこともできます。条件の合う相手から連絡が届きます。登録と掲載は無料です。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/signup" className={btn("primary")}>
                無料で登録して掲載する
              </Link>
              <Link href="/consultation" className={btn("secondary")}>
                事務局に代筆を頼む
              </Link>
            </div>
            <p className="mt-4 text-[12px] leading-6 text-[var(--muted)]">
              電話でお話をうかがって、事務局が案件を代わりに書くこともできます（掲載代行）。
              13項目の入力が負担な方はこちらをお使いください。
            </p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-[13px] text-[var(--muted)]">
              {total}件{offerings.length + projects.length < total ? `（新しい順に${offerings.length + projects.length}件を表示）` : ""}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {tab.key === "coproject"
                ? projects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      href={`/preview/projects/${p.id}`}
                      p={{
                        id: p.id,
                        title: p.title,
                        imageUrls: p.imageUrls,
                        memberName: projNameMap.get(p.memberId),
                        budget: p.budget,
                      }}
                    />
                  ))
                : offerings.map((o) => (
                    <OfferingCard
                      key={o.id}
                      href={`/preview/offerings/${o.id}`}
                      o={{ ...o, memberName: o.member.name, memberLogoUrl: o.member.companyLogoUrl }}
                    />
                  ))}
            </div>
            <p className="mt-5 text-[12px] leading-6 text-[var(--muted)]">
              案件の詳細と問い合わせには、無料の登録が必要です。
              <Link href="/signup" className="ml-1 text-[var(--green-d)] underline">
                無料で登録する →
              </Link>
            </p>
          </>
        )}

        {/* 実績。案件が0件でも、ここで「事業になった例」を見せる */}
        <section className="mt-12 border-t border-[var(--line)] pt-8">
          <h2 className="text-[15px] font-bold text-[var(--ink)]">
            出会いを、実装まで進めた事例
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {CASES_SORTED.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/cases/${c.slug}`}
                  className="text-[13px] leading-7 text-[var(--green-d)] underline"
                >
                  {c.summary}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/cases" className="mt-3 inline-block text-[12px] text-[var(--green-d)] underline">
            実績の一覧を見る →
          </Link>
        </section>
      </div>
    </>
  );
}
