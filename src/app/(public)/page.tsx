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

  const { articles, projects, projNameMap, gives, wants, giveCount, wantCount, projectCount } =
    await getLandingContent();

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
            <Link href="/pricing">利用料金・共創支援</Link>
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
              食の課題を、<br />全国のNAKAMAと<br />事業に変える。
            </h1>
            <p className="fjn-hero__lead">
              FOOD JAPAN NAKAMAは、生産者、食品メーカー、小売、<br />
              流通、飲食店、自治体、大学、専門家など、<br />
              食に関わる人と企業をつなぐ共創プラットフォームです。
              <br /><br />
              商品・技術・探しているもの・解決したい課題を登録し、<br />
              取引や新しい事業につながる相手と出会えます。
            </p>
            <span className="fjn-hero__tag">FOOD JAPAN SUMMIT</span>
            <div className="fjn-actions">
              {isLoggedIn ? (
                <Link className="fjn-button fjn-button--primary" href="/dashboard">マイページトップへ</Link>
              ) : (
                <Link className="fjn-button fjn-button--primary" href="/signup">無料で登録する</Link>
              )}
              <a className="fjn-button" href="#co-creation-projects">掲載案件を見る</a>
              <Link className="fjn-button" href="/consultation?type=theme">共創テーマを相談する</Link>
            </div>
            <p className="fjn-hero__note">
              登録・掲載・応募は無料です。<br />
              事務局による相手探し、商談調整、実証・事業化支援は個別契約です。
            </p>
          </div>
        </div>

        <div className="fjn-hero__visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-nakama-visual.png" alt="生産者、企業、自治体が食の共創でつながる様子" />
        </div>
      </section>

      <div className="mx-auto flex max-w-[1100px] flex-col gap-14 px-4 py-14">
        {/* 2つの利用導線 */}
        <section>
          <h1 className="font-serif text-[26px] leading-tight text-[var(--ink)] sm:text-[32px]">
            食の課題を、全国のNAKAMAと共創し解決する
          </h1>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col rounded-[12px] border border-[var(--line)] bg-white p-6">
              <h2 className={h2Cls}>できること、探していることを登録する。</h2>
              <p className="mt-2 flex-1 text-[14px] leading-7 text-[var(--ink-2)]">
                売りたい食材や商品、提供できる技術、探している原料やパートナー、共創したいテーマを無料で掲載できます。
              </p>
              <div className="mt-4">
                <Link href="/signup" className={btn("primary")}>無料で登録する</Link>
              </div>
            </div>
            <div className="flex flex-col rounded-[12px] border border-[var(--line)] bg-white p-6">
              <h2 className={h2Cls}>必要な相手を探し、事業化まで伴走する。</h2>
              <p className="mt-2 flex-1 text-[14px] leading-7 text-[var(--ink-2)]">
                課題の整理、募集テーマの設計、候補者の探索・打診、商談、試作・実証計画まで、NAKAMA事務局が個別に支援します。
              </p>
              <div className="mt-4">
                <Link href="/consultation?type=theme" className={btn("secondary")}>共創テーマを相談する</Link>
              </div>
            </div>
          </div>

          {/* 3つの案件区分（公開件数つき） */}
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              { t: "売りたい", n: giveCount, d: "食材、商品、設備、技術、物流など、提供できるものを掲載" },
              { t: "探している", n: wantCount, d: "必要な食材、原料、商品、技術、加工先、販売先、パートナーを募集" },
              { t: "共創したい", n: projectCount, d: "新商品開発、食品ロス、地域課題、新規事業などの協業相手を募集" },
            ].map((it) => (
              <div key={it.t} className="border-t-2 border-[var(--green)] pt-3">
                <h2 className={h2Cls}>
                  {it.t}
                  <span className="ml-2 text-[12px] font-normal text-[var(--muted)]">掲載 {it.n}件</span>
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-[var(--ink-2)]">{it.d}</p>
              </div>
            ))}
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

        {/* 探している */}
        <PreviewSection
          id="buy"
          title="探している商品・原料"
          sub="こんな食材・原料・パートナーを探しています"
          empty="現在「探している」の掲載はありません。"
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

        {/* 学び */}
        <section>
          <SectionHead title="実践者から学ぶ" sub="セミナー・アーカイブ" />
          <div className="flex flex-col items-start gap-3 rounded-[10px] border border-[var(--line)] bg-white p-6 sm:flex-row sm:items-center">
            <p className="flex-1 text-[14px] leading-7 text-[var(--ink-2)]">
              食のトップリーダーや現場の実践者から、商品開発、販路、地域共創、食品ロスなどを学べます。開催予定は順次公開します。
            </p>
            <Link href="/learn" className={btn("secondary")}>学び・セミナーを見る</Link>
          </div>
        </section>

        {/* NAKAMAサービスメニュー（正式サービス表。個別契約型は相談から） */}
        <section>
          <SectionHead
            title="NAKAMAのサービス"
            sub="基本掲載は無料です。必要なところだけ、NAKAMA事務局が販促・販売企画・共創事業化まで伴走します"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "NAKAMA登録", d: "商品・会社・募集情報の掲載。登録・掲載・応募は無料。", price: "無料", href: "/signup", cta: "無料で登録する" },
              { t: "販促プラン", d: "SNS掲載、クーポン配信、アクセス分析。", price: "月額33,000円", href: "/consultation?type=service&service=promotion_plan", cta: "相談する" },
              { t: "販売強化プラン", d: "特集制作、広告運用、販売企画、月次改善。", price: "月額110,000円＋広告費", href: "/consultation?type=service&service=sales_growth", cta: "相談する" },
              { t: "売れる仕組み構築", d: "LP、動画、クラウドファンディング、EC、キャンペーン開発。", price: "100万〜500万円", href: "/consultation?type=service&service=solution_build", cta: "相談する" },
              { t: "販売成果報酬", d: "NAKAMA経由で確認できる売上に応じた報酬。個別契約で条件を確定してから開始。", price: "売上の10〜20％", href: "/consultation?type=service&service=success_fee", cta: "相談する" },
              { t: "共創・商品開発", d: "相手探し、試作、販路、事業化。", price: "300万〜1,000万円", href: "/consultation?type=service&service=co_creation", cta: "相談する" },
            ].map((s) => (
              <div key={s.t} className="flex flex-col rounded-[10px] border border-[var(--line)] bg-white p-5">
                <h3 className="text-[15px] font-bold text-[var(--ink)]">{s.t}</h3>
                <p className="mt-1 flex-1 text-[13px] leading-6 text-[var(--ink-2)]">{s.d}</p>
                <div className="mt-2 text-[13px] font-semibold text-[var(--green-d)]">{s.price}</div>
                <Link href={s.href} className="mt-3 text-[12px] text-[var(--green-d)] underline">{s.cta} →</Link>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[var(--muted)]">
            ※ 価格は税込の提案値です。個別契約が必要なサービスは、相談のうえ要件確認・見積提示を行います（自動決済はしません）。
          </p>
        </section>

        {/* Food Japan Summit との連動 */}
        <section className="rounded-2xl border border-[var(--line)] bg-white px-6 py-10">
          <SectionHead title="オンラインの出会いを、現場の事業へ。" />
          <p className="max-w-[860px] text-[14px] leading-8 text-[var(--ink-2)]">
            NAKAMAで課題や相手を見つけ、Food Japan Summitで対面し、試食、商談、現地視察、試作、実証へ進めます。
            生まれた事業は、次のSummitで成果として共有し、新しい連携につなげます。
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
            {["登録・募集", "候補探索", "商談・試食", "試作・実証", "取引・事業化", "成果発表"].map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                {i > 0 ? <span className="text-[var(--green)]">→</span> : null}
                <span className="rounded-full bg-[var(--green-soft)] px-3 py-1.5 text-[var(--green-d)]">{step}</span>
              </span>
            ))}
          </div>
        </section>

        {/* 最終CTA（3択） */}
        <section className="rounded-2xl border border-[var(--green)] bg-[var(--green-soft)] px-6 py-10">
          <h2 className="text-center font-serif text-[22px] text-[var(--ink)]">目的に合わせて、次の一歩へ</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[10px] bg-white p-5 text-center">
              <p className="text-[13px] text-[var(--ink-2)]">自分で相手を探したい</p>
              <Link href="/signup" className={`${btn("primary")} mt-3 w-full`}>無料で登録する</Link>
            </div>
            <div className="rounded-[10px] bg-white p-5 text-center">
              <p className="text-[13px] text-[var(--ink-2)]">課題解決を事務局へ依頼したい</p>
              <Link href="/consultation?type=theme" className={`${btn("secondary")} mt-3 w-full`}>共創テーマを相談する</Link>
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
