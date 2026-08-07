import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getLandingContent } from "@/lib/public-content";
import { OfferingCard } from "@/components/OfferingCard";
import { ProjectCard } from "@/components/ProjectCard";
import { btn, h2Cls } from "@/lib/ui";

export default async function PublicHome() {
  // ログイン済みは既存アプリ（ダッシュボード）へ
  const su = await getSessionUser();
  if (su) redirect("/dashboard");

  const { articles, projects, projNameMap, gives, wants } = await getLandingContent();

  return (
    <div>
      {/* ヒーロー（提供デザイン food-japan-nakama-hero）。ヘッダーもこの中に含む。 */}
      <section className="fjn-hero" aria-labelledby="fjn-hero-title">
        <header className="fjn-hero__header">
          <Link className="fjn-brand" href="/" aria-label="FOOD JAPAN NAKAMA トップへ">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="fjn-brand__mark" src="/logo-mark.png" alt="" width={88} height={88} />
            <span>
              <span className="fjn-brand__name">FOOD JAPAN NAKAMA</span>
              <span className="fjn-brand__sub">FOOD JAPAN SUMMIT</span>
            </span>
          </Link>

          <nav className="fjn-nav" aria-label="メインナビゲーション">
            <a href="#co-creation-projects">共創プロジェクト</a>
            <a href="#sell">売りたい</a>
            <a href="#buy">買いたい</a>
            <Link className="fjn-nav__login" href="/login">ログイン</Link>
          </nav>
        </header>

        <div className="fjn-hero__body">
          <div className="fjn-hero__copy">
            <h1 id="fjn-hero-title">
              食の「譲りたい」<br />「あったらいいな」を、<br />共創でつなぐ。
            </h1>
            <p className="fjn-hero__lead">
              生産者・食品メーカー・小売・飲食店・流通・物流・サービスをつなぐ共創CRM。余っている食材や規格外品、探している原料、いっしょに挑戦したい共創プロジェクトが集まります。
            </p>
            <span className="fjn-hero__tag">FOOD JAPAN SUMMIT 2026</span>
            <div className="fjn-actions">
              <Link className="fjn-button fjn-button--primary" href="/signup">無料ではじめる</Link>
              <Link className="fjn-button" href="/login">ログイン</Link>
            </div>
            <p className="fjn-hero__note">
              プロジェクトや募集の概要はどなたでも閲覧できます。詳細・連絡は無料登録でご覧いただけます。
            </p>
          </div>
        </div>

        <div className="fjn-hero__visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-nakama-visual.png" alt="生産者、企業、自治体が食の共創でつながる様子" />
        </div>
      </section>

      <div className="mx-auto flex max-w-[1100px] flex-col gap-14 px-4 py-14">
        {/* 食の注目記事（キュレーション） */}
        {articles.length > 0 ? (
          <section>
            <SectionHead title="食の注目記事" sub="PR TIMES・note・新聞などから、事務局がピックアップ" />
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
          sub="余っている食材・規格外品・提供できる設備など"
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

        {/* 下部CTA */}
        <section className="rounded-2xl border border-[var(--green)] bg-[var(--green-soft)] px-6 py-10 text-center">
          <h2 className="font-serif text-[22px] text-[var(--ink)]">気になる相手が見つかったら</h2>
          <p className="mt-2 text-[13px] text-[var(--ink-2)]">
            無料登録すると、詳細の閲覧・メッセージでの問い合わせ・自社の掲載ができます。
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={btn("primary", "lg")}>無料会員登録</Link>
            <Link href="/login" className={btn("secondary", "lg")}>ログイン</Link>
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
