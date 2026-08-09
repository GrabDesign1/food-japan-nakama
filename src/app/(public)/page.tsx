import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getLandingContent } from "@/lib/public-content";
import { OfferingCard } from "@/components/OfferingCard";
import { ProjectCard } from "@/components/ProjectCard";
import { btn, h2Cls } from "@/lib/ui";
import { HeroMobileMenu } from "./_components/HeroMobileMenu";

export default async function PublicHome() {
  // ログイン済みでも公開トップは閲覧可能（ナビは「マイページトップへ」に切り替える）
  const su = await getSessionUser();
  const isLoggedIn = !!su;

  const { articles, projects, projNameMap, gives, wants } = await getLandingContent();

  return (
    <div>
      {/* ヒーロー（提供デザイン food-japan-nakama-hero）。ヘッダーもこの中に含む。 */}
      <section className="fjn-hero" aria-labelledby="fjn-hero-title">
        <header className="fjn-hero__header">
          <HeroMobileMenu />
          <Link className="fjn-brand" href="/" aria-label="FOOD JAPAN NAKAMA トップへ">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="fjn-brand__mark" src="/logo-mark.png" alt="" width={88} height={88} />
            <span>
              <span className="fjn-brand__name">FOOD JAPAN NAKAMA</span>
              <span className="fjn-brand__sub">FOOD JAPAN SUMMIT</span>
            </span>
          </Link>

          <nav className="fjn-nav" aria-label="メインナビゲーション">
            <a href="#co-creation-projects">案件を探す</a>
            <Link href="/about">NAKAMAとは</Link>
            <Link href="/produce">共創プロデュース</Link>
            <Link href="/food-loss">食品ロス支援</Link>
            <Link href="/crowdfunding">クラウドファンディング支援</Link>
            <Link href="/pricing">料金</Link>
            {isLoggedIn ? (
              <Link className="fjn-nav__login" href="/dashboard">マイページトップへ</Link>
            ) : (
              <Link className="fjn-nav__login" href="/login">ログイン</Link>
            )}
          </nav>
        </header>

        <div className="fjn-hero__body">
          <div className="fjn-hero__copy">
            <h1 id="fjn-hero-title">
              食の「譲りたい」<br />「あったらいいな」を<br />共創でつなぐ。
            </h1>
            <p className="fjn-hero__lead">
              FOOD JAPAN NAKAMAは、生産者・食品メーカー・<br />
              小売・飲食店・流通・自治体など、食に関わる人と企業を<br />
              つなぐ共創プラットフォームです。
              <br /><br />
              売りたい食材、探している原料、食品ロス、解決したい課題、<br />
              いっしょに取り組みたいプロジェクトを掲載し、<br />
              新しい取引や事業の仲間と出会えます。
            </p>
            <span className="fjn-hero__tag">FOOD JAPAN SUMMIT</span>
            <div className="fjn-actions">
              {isLoggedIn ? (
                <Link className="fjn-button fjn-button--primary" href="/dashboard">マイページトップへ</Link>
              ) : (
                <Link className="fjn-button fjn-button--primary" href="/signup">NAKAMAに申し込む</Link>
              )}
              <a className="fjn-button" href="#co-creation-projects">掲載案件を見る</a>
            </div>
            <p className="fjn-hero__note">
              掲載案件の概要はどなたでも閲覧できます。<br />
              詳細の閲覧・お問い合わせ・自社の掲載は月額会員でご利用いただけます。
            </p>
          </div>
        </div>

        <div className="fjn-hero__visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-nakama-visual.png" alt="生産者、企業、自治体が食の共創でつながる様子" />
        </div>
      </section>

      <div className="mx-auto flex max-w-[1100px] flex-col gap-14 px-4 py-14">
        {/* サービス説明 */}
        <section>
          <h1 className="font-serif text-[26px] leading-tight text-[var(--ink)] sm:text-[32px]">
            食の課題を、全国のNAKAMAと共創し解決する
          </h1>
          <p className="mt-4 max-w-[860px] text-[15px] leading-8 text-[var(--ink-2)]">
            余っている食材を活かしたい。新しい原料や商品を探したい。地域の食を全国へ届けたい。異業種と新しい事業を始めたい。
            FOOD JAPAN NAKAMAでは、企業や地域が持つ「提供できるもの」と「求めているもの」を公開し、具体的な商談や共創プロジェクトにつなげます。
          </p>
          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            {[
              { t: "売りたい", d: "食材・規格外品・商品・設備・技術・物流などを掲載" },
              { t: "買いたい・探したい", d: "必要な原料・商品・技術・パートナーを募集" },
              { t: "共創したい", d: "新商品開発・地域課題・食品ロスなどの協業相手を募集" },
            ].map((it) => (
              <div key={it.t} className="border-t-2 border-[var(--green)] pt-3">
                <h2 className={h2Cls}>{it.t}</h2>
                <p className="mt-1 text-[13px] leading-6 text-[var(--ink-2)]">{it.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={btn("primary")}>NAKAMAに申し込む（22,000円・税込／月）</Link>
            <Link href="/about" className={btn("secondary")}>NAKAMAとは</Link>
          </div>
        </section>

        {/* 食の注目記事（キュレーション） */}
        {articles.length > 0 ? (
          <section>
            <SectionHead title="食の共創 注目記事" sub="PR TIMES・note・新聞などから、事務局がピックアップ" />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {articles.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--green)] hover:shadow-md"
                >
                  {/* 上段：タイトル（左）＋サムネイル（右） */}
                  <div className="flex gap-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="w-fit rounded bg-[var(--green-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--green-d)]">
                        {a.source}
                      </span>
                      <h3 className="line-clamp-3 text-[16px] font-bold leading-6 text-[var(--ink)] group-hover:text-[var(--green-d)]">
                        {a.title}
                      </h3>
                    </div>
                    <div className="aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-lg bg-[var(--green-soft)] sm:w-44">
                      {a.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.imageUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[28px] opacity-40">📰</div>
                      )}
                    </div>
                  </div>
                  {/* 下段：概要（全幅） */}
                  {a.excerpt ? (
                    <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-[var(--ink-2)]">{a.excerpt}</p>
                  ) : null}
                  <span className="mt-2 text-[11px] text-[var(--green-d)]">記事を読む ↗</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {/* 共創プロジェクト */}
        <PreviewSection
          id="co-creation-projects"
          title="共創プロジェクト"
          sub="いっしょに挑戦したい相手を募集中"
          empty="現在募集中のプロジェクトはありません。"
          hasItems={projects.length > 0}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                href={`/preview/projects/${p.id}`}
                p={{ id: p.id, title: p.title, imageUrls: p.imageUrls, memberName: projNameMap.get(p.memberId), budget: p.budget }}
              />
            ))}
          </div>
        </PreviewSection>

        {/* 売りたい */}
        <PreviewSection
          id="sell"
          title="売りたい（提供できるもの）"
          sub="余っている食材・規格外品・食品ロス・提供できる設備など"
          empty="現在「売りたい」の掲載はありません。"
          hasItems={gives.length > 0}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {gives.map((o) => (
              <OfferingCard
                key={o.id}
                href={`/preview/offerings/${o.id}`}
                o={{ ...o, memberName: o.member.name }}
              />
            ))}
          </div>
        </PreviewSection>

        {/* 買いたい */}
        <PreviewSection
          id="buy"
          title="買いたい（探しているもの）"
          sub="こんな食材・原料・パートナーを探しています"
          empty="現在「買いたい」の掲載はありません。"
          hasItems={wants.length > 0}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {wants.map((o) => (
              <OfferingCard
                key={o.id}
                href={`/preview/offerings/${o.id}`}
                o={{ ...o, memberName: o.member.name }}
              />
            ))}
          </div>
        </PreviewSection>

        {/* 学び（月額の価値） */}
        <section>
          <SectionHead title="実践者から学ぶ" sub="会員向けセミナー・アーカイブ" />
          <div className="flex flex-col items-start gap-3 rounded-[10px] border border-[var(--line)] bg-white p-6 sm:flex-row sm:items-center">
            <p className="flex-1 text-[14px] leading-7 text-[var(--ink-2)]">
              食のトップリーダーや現場の実践者から、商品開発、販路、地域共創、食品ロスなどを学べます。開催予定は順次公開します。
            </p>
            <Link href="/learn" className={btn("secondary")}>学び・セミナーを見る</Link>
          </div>
        </section>

        {/* FOOD JAPAN の3サービス */}
        <section>
          <SectionHead title="FOOD JAPAN NAKAMA の3つのサービス" sub="役割と料金が混ざらないよう、目的で選べます" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { t: "NAKAMAモデル", d: "自分で出会い、自分で学び共創相手を探す月額会員サービス。", price: "月額22,000円（税込）", href: "/about", cta: "詳細はこちら" },
              { t: "共創プロデュース", d: "事務局の人間がコーディネートし、企画・実証・事業化まで一緒に進める個別支援。", price: "", href: "/produce", cta: "詳細はこちら" },
              { t: "クラウドファンディング支援", d: "Makuake等を活用してマーケティングをしましょう！クラファン掲載の代行を行います。", price: "個別見積", href: "/crowdfunding", cta: "詳細はこちら" },
            ].map((s) => (
              <div key={s.t} className="flex flex-col rounded-[10px] border border-[var(--line)] bg-white p-5">
                <h3 className="text-[15px] font-bold text-[var(--ink)]">{s.t}</h3>
                <p className="mt-1 flex-1 text-[13px] leading-6 text-[var(--ink-2)]">{s.d}</p>
                {s.price ? (
                  <div className="mt-2 text-[13px] font-semibold text-[var(--green-d)]">{s.price}</div>
                ) : null}
                <Link href={s.href} className="mt-3 text-[12px] text-[var(--green-d)] underline">{s.cta} →</Link>
              </div>
            ))}
          </div>
        </section>

        {/* 最終CTA（3択） */}
        <section className="rounded-2xl border border-[var(--green)] bg-[var(--green-soft)] px-6 py-10">
          <h2 className="text-center font-serif text-[22px] text-[var(--ink)]">目的に合わせて、次の一歩へ</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[10px] bg-white p-5 text-center">
              <p className="text-[13px] text-[var(--ink-2)]">自分で相手を探したい</p>
              <Link href="/signup" className={`${btn("primary")} mt-3 w-full`}>NAKAMAに申し込む</Link>
            </div>
            <div className="rounded-[10px] bg-white p-5 text-center">
              <p className="text-[13px] text-[var(--ink-2)]">企画から一緒に進めたい</p>
              <Link href="/consultation?type=produce" className={`${btn("secondary")} mt-3 w-full`}>共創プロデュースを相談する</Link>
            </div>
            <div className="rounded-[10px] bg-white p-5 text-center">
              <p className="text-[13px] text-[var(--ink-2)]">商品を販売して反応を試したい</p>
              <Link href="/consultation?type=crowdfunding" className={`${btn("secondary")} mt-3 w-full`}>クラファン支援を相談する</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className={h2Cls}>{title}</h2>
      {sub ? <p className="mt-1 text-[12px] text-[var(--muted)]">{sub}</p> : null}
    </div>
  );
}

function PreviewSection({
  id,
  title,
  sub,
  empty,
  hasItems,
  children,
}: {
  id?: string;
  title: string;
  sub?: string;
  empty: string;
  hasItems: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <SectionHead title={title} sub={sub} />
      {hasItems ? (
        children
      ) : (
        <p className="rounded-md border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
          {empty}
        </p>
      )}
    </section>
  );
}
