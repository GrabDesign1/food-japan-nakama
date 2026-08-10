import Link from "next/link";
import Image from "next/image";
import { PublicTopBar } from "../_components/PublicTopBar";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "FOOD JAPAN NAKAMAとは｜FOOD JAPAN NAKAMA",
  description:
    "食に関わる人が、出会い、学び、共創事業をつくる場所。生産者、食品メーカー、小売、流通、飲食店、自治体、大学、専門家が立場を越えてつながる、無料登録型の共創プラットフォームです。",
};

// 写真上に重ねる文字用のグラデーション。PC=左→右、スマホ=下→上。
const HERO_SHADE =
  "absolute inset-0 bg-gradient-to-t from-[#141414f5] via-[#14141480] to-[#14141400] sm:bg-gradient-to-r sm:from-[#141414eb] sm:via-[#1414147a] sm:to-[#14141414]";

const STORIES = [
  {
    src: "/about/about-meet.jpg",
    alt: "参加者同士が対話する様子",
    no: "01",
    title: "出会う",
    body: "つくる人、届ける人、伝える人がつながる。",
  },
  {
    src: "/about/about-learn.jpg",
    alt: "実践者が取り組みを語る様子",
    no: "02",
    title: "学ぶ",
    body: "現場で動く人の知恵と経験を共有する。",
  },
  {
    src: "/about/about-deal.jpg",
    alt: "地域のいちごを生かしたかき氷の商品例",
    no: "03",
    title: "共創事業をつくる",
    body: "食材とアイデアを、売れる商品や新しい事業へ。",
  },
];

const JOIN_TAGS = [
  "生産者",
  "食品メーカー",
  "小売・流通",
  "飲食店・料理人",
  "自治体・地域団体",
  "専門家・企業",
];

export default function AboutPage() {
  return (
    <>
      <PublicTopBar />

      {/* 写真全面のファーストビュー */}
      <section className="relative grid min-h-[560px] items-end bg-[var(--green-soft)] sm:min-h-[620px]">
        <Image
          src="/about/about-hero.jpg"
          alt="FOOD JAPAN SUMMITで登壇者と参加者が対話する会場"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[60%_center] sm:object-[center_46%]"
        />
        <div className={HERO_SHADE} />
        <div className="relative mx-auto w-full max-w-[1120px] px-4">
          <div className="max-w-[680px] pb-12 pt-[230px] text-white sm:py-[88px]">
            <p className="text-[11px] tracking-[0.16em] text-white/75">ABOUT FOOD JAPAN NAKAMA</p>
            <h1 className="mt-4 font-serif text-[30px] leading-[1.4] tracking-[0.02em] sm:text-[40px]">
              食に関わる人が、
              <br />
              出会い、学び、
              <br />
              共創事業をつくる場所。
            </h1>
            <p className="mt-6 max-w-[610px] text-[14px] leading-8 text-white/90 sm:text-[15px]">
              生産者、食品メーカー、小売、流通、飲食店、自治体、大学、専門家。立場を越えて情報を持ち寄り、良いものを必要な相手につなぎ、続いていく取引や共創事業へ育てるプラットフォームです。
            </p>
            <div className="mt-8">
              <Link href="/signup" className={btn("primary", "lg")}>無料でNAKAMAに登録する</Link>
            </div>
          </div>
        </div>
      </section>

      {/* NAKAMAをつくった理由 */}
      <section className="px-4 py-16 sm:py-[88px]">
        <div className="mx-auto grid max-w-[1120px] items-center gap-6 sm:grid-cols-[.86fr_1.14fr] sm:gap-[72px]">
          <div>
            <p className="text-[11px] tracking-[0.16em] text-[var(--green-d)]">WHY NAKAMA?</p>
            <h2 className="mt-3 font-serif text-[26px] leading-[1.45] text-[var(--ink)] sm:text-[32px]">
              良いものを、
              <br />
              価値に変える。
            </h2>
          </div>
          <div className="text-[14px] leading-8 text-[var(--ink-2)] sm:text-[15px]">
            <p>地域には、まだ知られていない食材や技術、真面目につくられた商品があります。</p>
            <p className="mt-4">
              NAKAMAは、それらを必要な相手につなぎ、学びと対話を通じて、続いていく共創事業へ育てる場所です。
            </p>
          </div>
        </div>
      </section>

      {/* 出会う／学ぶ／商売をつくる */}
      <section className="bg-[#f6f3ec] px-4 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto mb-9 max-w-[720px] text-center">
            <p className="text-[11px] tracking-[0.16em] text-[var(--green-d)]">WHAT HAPPENS HERE</p>
            <h2 className="mt-3 font-serif text-[24px] text-[var(--ink)] sm:text-[28px]">出会いから、共創事業へ。</h2>
            <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">
              人と知恵がつながり、地域の食が新しい価値に変わっていきます。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {STORIES.map((it) => (
              <article key={it.no} className="relative min-h-[390px] overflow-hidden sm:min-h-[430px]">
                <Image src={it.src} alt={it.alt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-[66%] bg-gradient-to-t from-[#141414eb] to-transparent" />
                <div className="absolute inset-x-6 bottom-6 text-white">
                  <span className="text-[12px] text-white/70">{it.no}</span>
                  <h3 className="mt-1 font-serif text-[20px]">{it.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-6 text-white/85">{it.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 地域・生産者の可能性 */}
      <section className="px-4 py-16 sm:py-[88px]">
        <div className="mx-auto grid max-w-[1120px] items-center gap-9 sm:grid-cols-[1.04fr_.96fr] sm:gap-[58px]">
          <div className="grid h-[430px] grid-cols-2 grid-rows-[1.15fr_.85fr] gap-2.5 sm:h-[520px] sm:grid-cols-[1.2fr_.8fr] sm:grid-rows-2">
            <div className="relative col-span-2 overflow-hidden sm:col-span-1 sm:row-span-2">
              <Image src="/about/about-field-1.jpg" alt="畑で収穫した野菜を持つ生産者たち" fill sizes="(max-width: 640px) 100vw, 30vw" className="object-cover" />
            </div>
            <div className="relative overflow-hidden">
              <Image src="/about/about-field-2.jpg" alt="山あいに広がる田畑" fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover" />
            </div>
            <div className="relative overflow-hidden">
              <Image src="/about/about-field-3.jpg" alt="手のひらに載せたホップ" fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover" />
            </div>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.16em] text-[var(--green-d)]">FROM THE FIELD</p>
            <h2 className="mt-4 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[28px]">
              地域の営みから、
              <br className="hidden sm:block" />
              新しい価値を見つける。
            </h2>
            <p className="mt-5 text-[14px] leading-8 text-[var(--ink-2)]">
              NAKAMAの出発点は、商品だけではありません。その土地で育てる人、受け継がれてきた知恵、まだ用途の決まっていない素材まで。現場にある可能性を、業界を越えた仲間と事業に変えていきます。
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {JOIN_TAGS.map((t) => (
                <span key={t} className="rounded-full border border-[var(--line)] px-3.5 py-2 text-[13px] text-[var(--ink-2)]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 無料でできること／事務局へ依頼できること */}
      <section id="membership" className="bg-[#f6f3ec] px-4 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[900px]">
          <div className="text-center">
            <p className="text-[11px] tracking-[0.16em] text-[var(--green-d)]">HOW TO USE</p>
            <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
              一人では出会えなかった人と、
              <br className="hidden sm:block" />
              次の共創事業をつくろう。
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-[14px] leading-7 text-[var(--ink-2)]">
              登録・掲載・応募は無料です。事務局による相手探し、商談調整、実証・事業化支援は個別契約です。
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[12px] border border-[var(--line)] bg-white p-6 text-left">
              <h3 className="text-[15px] font-bold text-[var(--ink)]">無料でできること</h3>
              <ul className="mt-3 flex flex-col gap-1.5 text-[14px] leading-7 text-[var(--ink-2)]">
                {[
                  "会社・事業プロフィールの登録",
                  "案件（販売・提供できる商品／仕入れ・調達したいもの／共創パートナー募集）の掲載",
                  "公開案件の閲覧・検索",
                  "案件への応募・問い合わせ",
                  "問い合わせの送信・受信と、届いた問い合わせへの返信（何往復でも無料）",
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-px font-bold text-[var(--green)]">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[12px] border border-[var(--line)] bg-white p-6 text-left">
              <h3 className="text-[15px] font-bold text-[var(--ink)]">事務局へ依頼できること（個別契約）</h3>
              <ul className="mt-3 flex flex-col gap-1.5 text-[14px] leading-7 text-[var(--ink-2)]">
                {[
                  "共創テーマ設計（課題整理・募集条件・企画設計）",
                  "パートナー探索（候補探索・個別打診・面談設定）",
                  "商談調整・試作・実証支援",
                  "事業化・年間共創プログラム",
                  "Web・デザイン・動画・クラファン等の制作・販売支援",
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-px font-bold text-[var(--green-d)]">◆</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={btn("primary", "lg")}>無料でNAKAMAに登録する</Link>
            <Link href="/consultation?type=theme" className={btn("secondary", "lg")}>共創テーマを相談する</Link>
          </div>
        </div>
      </section>
    </>
  );
}
