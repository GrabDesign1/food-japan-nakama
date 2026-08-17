import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth";
import { getLandingContent, MIN_LISTINGS_TO_SHOW } from "@/lib/public-content";
import { CASES_SORTED } from "@/lib/cases";
import { OfferingCard } from "@/components/OfferingCard";
import { ProjectCard } from "@/components/ProjectCard";
import { btn, h2Cls } from "@/lib/ui";
import { SERVICE_MENU, consultationHref, FJS_URL } from "@/lib/services";
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
            {/* 掲載0件のときトップの案件セクションは出さないので、一覧ページへ送る（アンカーだと行き先が消える） */}
            <Link href="/listings?type=want">探している案件を見る</Link>
            <Link href="/about">NAKAMAとは</Link>
            <Link href="/hanro">販路開拓支援</Link>
            <Link href="/produce">共創プロデュース</Link>
            <Link href="/food-loss">食品ロス支援</Link>
            <Link href="/crowdfunding">クラウドファンディング支援</Link>
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
              食の「売りたい」「探している」「あったらいいな」を共創でつなぐ
            </h1>
            <p className="fjn-hero__lead">
              全国の食品メーカー・飲食店・卸・小売と、新しい取引や共創のきっかけをつくる。
              あなたの食材・原料・商品・サービスを求めている方と出会い、直接提案できます。
            </p>
            <a
              className="fjn-hero__tag"
              href={FJS_URL}
              target="_blank"
              rel="noreferrer"
            >
              FOOD JAPAN SUMMIT
            </a>
            <div className="fjn-actions">
              <Link className="fjn-button fjn-button--primary" href="/listings?type=want">仕入れたい企業を見る</Link>
              {isLoggedIn ? (
                <Link className="fjn-button" href="/ledger">商品を無料で掲載する</Link>
              ) : (
                <Link className="fjn-button" href="/signup">商品を無料で掲載する</Link>
              )}
            </div>
            {/* 料金の要点。無料の面だけでなく**有料になる一点も先に開示する**。
                ⚠️「初回のやり取りに売り手側にクレジットがかかります」では
                「誰が・どの操作で払うのか」が一読で分からない、という指摘を受けて具体化した（2026-08-17）。
                **課金される操作を名指しする**こと。下の3ステップ03と同じ整理で書く。
                開封のほうは 2026-08-26 施行（lead-unlock-core.ts）。 */}
            <p className="fjn-hero__note">
              商品の掲載と案件の閲覧は無料です。<br />
              「探している」案件への提案、または「売りたい」案件に届いた問い合わせの初回開封に、紹介クレジットを使用します。初回やり取りが始まったあとは、何往復でも無料です。
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
        {/* 目的別の入口。
            写真素材が未提供なので、既存の「罫線＋見出し」の体裁をそのまま使ってリンクにしている
            （素材が届いたらカード上部に写真を足す）。 */}
        <section>
          <h2 className="font-serif text-[26px] leading-tight text-[var(--ink)] sm:text-[32px]">
            いま、何を探していますか。
          </h2>
          <p className="mt-2 text-[14px] leading-7 text-[var(--ink-2)]">
            目的から、相手と案件を探せます。
          </p>

          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            {[
              { t: "売りたい", n: giveCount, href: "/listings?type=give", icon: "/purpose/purpose-give.png", d: "旬の農産物、業務用原料、加工品、規格外品、余剰品、設備、技術など。販路・買い手を探す" },
              { t: "探している", n: wantCount, href: "/listings?type=want", icon: "/purpose/purpose-want.png", d: "必要な食材、原料、商品、技術、加工先、販売先。仕入れ先・調達先を探す" },
              { t: "共創したい", n: projectCount, href: "/listings?type=coproject", icon: "/purpose/purpose-coproject.png", d: "新商品開発、食品ロス、地域課題、新規事業。商品・事業をつくる相手を探す" },
            ].map((it) => (
              <Link key={it.href} href={it.href} className="group border-t-2 border-[var(--green)] pt-3">
                {/* 意味は見出しの文字で持たせているので alt は空にする */}
                <Image
                  src={it.icon}
                  alt=""
                  width={256}
                  height={256}
                  sizes="64px"
                  className="mb-2 h-14 w-14"
                />
                <h3 className={`${h2Cls} group-hover:text-[var(--green-d)] group-hover:underline`}>
                  {it.t}
                  {/* 実数がある場合だけ表示する（0件を大きく見せない） */}
                  {it.n > 0 ? (
                    <span className="ml-2 text-[12px] font-normal text-[var(--muted)]">掲載 {it.n}件</span>
                  ) : null}
                </h3>
                <p className="mt-1 text-[13px] leading-6 text-[var(--ink-2)]">{it.d}</p>
                <span className="mt-2 inline-block text-[12px] text-[var(--green-d)]">案件を見る →</span>
              </Link>
            ))}
          </div>

          {/* 掲載の導線。案件セクションは0件のうち出さないので、掲載を促す文はここに常設する。
              地は既存の「CTAブロック」の作法（緑枠＋薄緑）に合わせ、ボタンは中央・大サイズで揃える。 */}
          <div className="mt-7 rounded-[12px] border border-[var(--green)] bg-[var(--green-soft)] px-5 py-7 text-center sm:px-8 sm:py-9">
            <p className="text-[17px] font-bold leading-9 text-[var(--ink)] sm:text-[20px]">
              売りたい・探している・共創したい<br className="sm:hidden" />
              に参加することができます！
            </p>
            {/* ⚠️「連絡が届きます」とは書かない＝届く保証はない。事実は「見つけてもらいやすくなる」まで */}
            <p className="mx-auto mt-2.5 max-w-[620px] text-[13px] leading-7 text-[var(--ink-2)]">
              売りたいもの、探しているもの、一緒につくりたいことを登録すると、条件の合う相手に見つけてもらいやすくなります。
            </p>
            {/* ⚠️ここは事務局の約束。掲載者を Summit のネットワークへ実際に紹介する運用が前提
                （やらないと景表法上まずい表示になる）。運用を変えるならこの一文も直すこと。 */}
            <p className="mx-auto mt-3 max-w-[620px] border-t border-[var(--green)] pt-3 text-[13px] font-bold leading-7 text-[var(--green-d)]">
              いま掲載すると、
              <a
                href={FJS_URL}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:no-underline"
              >
                Food Japan Summit
              </a>
              {" "}のネットワークへ先行して紹介されます。
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href={isLoggedIn ? "/ledger" : "/signup"}
                /* secondary だけ枠線があり2px高くなるので、透明の枠線で高さを揃える（ui.ts は触らない） */
                className={`${btn("primary", "lg")} w-full max-w-[340px] border border-transparent text-[16px] sm:w-auto sm:min-w-[260px]`}
              >
                案件を登録する
              </Link>
              <Link
                href="/consultation"
                className={`${btn("secondary", "lg")} w-full max-w-[340px] text-[16px] sm:w-auto sm:min-w-[260px]`}
              >
                事務局に代筆を申し込む
              </Link>
            </div>
          </div>
        </section>

        {/* 今、企業が探しているもの（トップの主役）。掲載が閾値に満たないうちは出さない */}
        <PreviewSection
          id="buyer-listings"
          title="今、企業が探している食材・商品"
          sub="食品メーカー・飲食店・小売・加工会社などから寄せられた探しているの募集です"
          hasItems={wantCount >= MIN_LISTINGS_TO_SHOW}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {wants.map((o) => (
              <OfferingCard
                key={o.id}
                href={`/preview/offerings/${o.id}`}
                o={{ ...o, memberName: o.member.name, memberLogoUrl: o.member.companyLogoUrl }}
              />
            ))}
          </div>
          <Link href="/listings?type=want" className="mt-4 inline-block text-[12px] text-[var(--green-d)] underline">
            探している案件をすべて見る（{wantCount}件） →
          </Link>
        </PreviewSection>

        {/* 売りたい（提供したい） */}
        <PreviewSection
          id="sell"
          title="売りたい（提供したい）"
          sub="旬の農産物、こだわりの食材、業務用原料、加工品、規格外品、余剰品、設備、技術など"
          hasItems={giveCount >= MIN_LISTINGS_TO_SHOW}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {gives.map((o) => (
              <OfferingCard
                key={o.id}
                href={`/preview/offerings/${o.id}`}
                o={{ ...o, memberName: o.member.name, memberLogoUrl: o.member.companyLogoUrl }}
              />
            ))}
          </div>
          <Link href="/listings?type=give" className="mt-4 inline-block text-[12px] text-[var(--green-d)] underline">
            売りたい案件をすべて見る（{giveCount}件） →
          </Link>
        </PreviewSection>

        {/* 共創プロジェクト */}
        <PreviewSection
          id="co-creation-projects"
          title="共創プロジェクト"
          sub="いっしょに挑戦したい相手を募集中"
          hasItems={projectCount >= MIN_LISTINGS_TO_SHOW}
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
          <Link href="/listings?type=coproject" className="mt-4 inline-block text-[12px] text-[var(--green-d)] underline">
            共創プロジェクトをすべて見る（{projectCount}件） →
          </Link>
        </PreviewSection>

        {/* 実績。案件の有無にかかわらず常設する（案件が増えたら上の案件セクションが先に出る） */}
        <section id="cases">
          <SectionHead
            title="出会いを、実装まで進めた事例"
            sub="Food Japan Summit で生まれた出会いから、実際の取引や商品へ進んだ事例です"
          />
          {/* 1件のときに2列にすると右半分が空くので、件数で列数を変える */}
          <div className={CASES_SORTED.length > 1 ? "grid gap-6 sm:grid-cols-2" : "grid max-w-[560px] gap-6"}>
            {CASES_SORTED.map((c) => (
              <Link key={c.slug} href={`/cases/${c.slug}`} className="group flex flex-col">
                <Image
                  src={c.image}
                  alt=""
                  width={c.imageWidth}
                  height={c.imageHeight}
                  sizes="(max-width: 640px) 100vw, 520px"
                  className="h-auto w-full border border-[var(--line)]"
                />
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
                <h3 className="mt-1.5 text-[15px] font-bold leading-7 text-[var(--ink)] group-hover:text-[var(--green-d)] group-hover:underline">
                  {c.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-7 text-[var(--ink-2)]">{c.summary}</p>
                <span className="mt-2 text-[12px] text-[var(--green-d)]">事例を読む →</span>
              </Link>
            ))}
          </div>
          <Link href="/cases" className="mt-5 inline-block text-[12px] text-[var(--green-d)] underline">
            実績の一覧を見る →
          </Link>
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

        {/* 登録後に最初にすること。番号＋1文だけにして、カードや装飾は付けない */}
        <section>
          <SectionHead
            title="登録後、最初にすること"
            sub="この3つが済むと、相手に見つけてもらいやすくなります"
          />
          <ol className="border-t border-[var(--line)]">
            {[
              {
                t: "プロフィールを整える",
                d: "会社・商品・強み・探している相手を登録します。記入率が50%に満たないと、事業者の一覧に表示されません。",
                icon: "/steps/step-profile.png",
              },
              {
                t: "案件を1件掲載する",
                /* 「掲載は無料」は下の※行に集約した（無料表記を繰り返すと逆に疑わせるため） */
                d: "売りたいもの、探しているもの、一緒につくりたいことを、具体的に載せます。",
                icon: "/steps/step-listing.png",
              },
              {
                t: "気になる案件に連絡する",
                /* ヒーローの注記と同じ整理にする＝有料は「売り手側の初回のやり取り」2つだけ。
                   片方（開封）だけ書き漏らすと、ヒーローと食い違う。 */
                d: "問い合わせを送るのは無料です。売り手側は、初回のやり取り（「探している」案件への提案、届いた問い合わせの開封）に紹介クレジットを使います。",
                icon: "/steps/step-contact.png",
              },
            ].map((s, i) => (
              <li key={s.t} className="flex items-start gap-4 border-b border-[var(--line)] py-4">
                <span className="shrink-0 pt-0.5 text-[13px] font-bold tracking-[0.06em] text-[var(--green-d)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* アイコンは意味を文字で持たせているので alt は空にする（読み上げで見出しと二重に読まれないように） */}
                <Image
                  src={s.icon}
                  alt=""
                  width={192}
                  height={192}
                  sizes="48px"
                  className="mt-0.5 h-10 w-10 shrink-0 sm:h-12 sm:w-12"
                />
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-[var(--ink)]">{s.t}</h3>
                  <p className="mt-1 text-[13px] leading-7 text-[var(--ink-2)]">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            {isLoggedIn ? (
              <Link href="/dashboard" className={btn("primary", "lg")}>マイページトップへ</Link>
            ) : (
              <Link href="/signup" className={btn("primary", "lg")}>無料で登録する</Link>
            )}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
            {/* 「どこまでが無料か」はサイト全体でここ1文に集約する。他所で繰り返さないこと
                （繰り返すと安心ではなく「後から請求されるのでは」という疑いを生む） */}
            ※ 無料でできるのは、登録・掲載・閲覧・検索・問い合わせの送信と、連絡が始まったあとのやり取り（何往復でも）です。
          </p>
        </section>

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
            /* 「基本掲載は無料です」は、すぐ下のNAKAMA登録カードに価格として出ているので重ねない */
            sub="必要なところだけ、NAKAMA事務局が販促・販売企画・共創事業化まで伴走します"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col rounded-[10px] border border-[var(--line)] bg-white p-5">
              <div className="text-[11px] text-[var(--muted)]">まずは無料で始めたい</div>
              <h3 className="text-[15px] font-bold text-[var(--ink)]">NAKAMA登録</h3>
              <p className="mt-1 flex-1 text-[13px] leading-6 text-[var(--ink-2)]">
                {/* 価格は下の行に「無料」と出るので、説明文では繰り返さない */}
                商品・会社・募集情報の掲載、案件への応募・問い合わせ。
              </p>
              <div className="mt-2 text-[13px] font-semibold text-[var(--green-d)]">無料</div>
              <Link href="/signup" className="mt-3 text-[12px] text-[var(--green-d)] underline">無料で登録する →</Link>
            </div>
            {SERVICE_MENU.map((s) => (
              <div key={s.type} className="flex flex-col rounded-[10px] border border-[var(--line)] bg-white p-5">
                <div className="text-[11px] text-[var(--muted)]">{s.problem}</div>
                <h3 className="text-[15px] font-bold text-[var(--ink)]">{s.name}</h3>
                <p className="mt-1 flex-1 text-[13px] leading-6 text-[var(--ink-2)]">{s.deliverable}</p>
                <div className="mt-2 text-[11px] text-[var(--muted)]">期間：{s.period}</div>
                <div className="text-[13px] font-semibold text-[var(--green-d)]">{s.price}</div>
                <Link
                  href={s.href ?? consultationHref(s.type)}
                  className="mt-3 text-[12px] text-[var(--green-d)] underline"
                >
                  {s.href ? "詳しく見る" : "相談する"} →
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[var(--muted)]">
            ※ 価格は税込の提案値です。個別契約が必要なサービスは、相談のうえ要件確認・見積提示を行います（自動決済はしません）。
            販路開拓の入口2サービスの詳細は<Link href="/hanro" className="underline">販路開拓支援</Link>ページをご覧ください。
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
          <h2 className="text-center font-serif text-[22px] text-[var(--ink)]">目的に合わせてお選びいただけます。</h2>
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

/**
 * 案件のプレビュー枠。
 * ⚠️ 掲載が MIN_LISTINGS_TO_SHOW 件に満たないうちは**セクションごと出さない**（hasItems=false → null）。
 * 「現在ありません」が3つ並ぶと、誰もいないサービスに見えるため（2026-08-17 ユーザー決定）。
 * 掲載を促す文は、目的別入口の下に常設したブロックが受け持つ。
 */
function PreviewSection({
  id,
  title,
  sub,
  hasItems,
  children,
}: {
  id?: string;
  title: string;
  sub?: string;
  hasItems: boolean;
  children: React.ReactNode;
}) {
  if (!hasItems) return null;
  return (
    <section id={id} className="scroll-mt-6">
      <SectionHead title={title} sub={sub} />
      {children}
    </section>
  );
}
