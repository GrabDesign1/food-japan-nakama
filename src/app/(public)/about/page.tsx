import Link from "next/link";
import Image from "next/image";
import { PublicTopBar } from "../_components/PublicTopBar";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "FOOD JAPAN NAKAMAとは｜FOOD JAPAN NAKAMA",
  description:
    "食に関わる人が、出会い、学び、共創事業をつくる場所。生産者、食品メーカー、小売、流通、飲食店、自治体が立場を越えてつながる会員制ネットワークです。",
};

// 写真上に重ねる文字用のグラデーション。PC=左→右、スマホ=下→上。
const HERO_SHADE =
  "absolute inset-0 bg-gradient-to-t from-[#141414f5] via-[#14141488] to-[#14141400] sm:bg-gradient-to-r sm:from-[#141414eb] sm:via-[#1414148c] sm:to-[#14141414]";

const CAN_DO = [
  {
    src: "/about/about-meet.jpg",
    alt: "参加者同士が意見を交わす様子",
    no: "01",
    title: "出会う",
    body: "営業先、仕入先、共創相手とつながる。",
  },
  {
    src: "/about/about-learn.jpg",
    alt: "登壇者の話を参加者が聞く様子",
    no: "02",
    title: "学ぶ",
    body: "食の経営者や実践者の話を聞く。",
  },
  {
    src: "/about/about-deal.jpg",
    alt: "登壇者と参加者が近い距離で対話する様子",
    no: "03",
    title: "商売をつくる",
    body: "商談や共創を、新しい取引へ進める。",
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

const STEPS = [
  {
    no: "STEP 01",
    title: "自分たちを伝える",
    body: "会社、商品、できること、探している相手を登録します。",
  },
  {
    no: "STEP 02",
    title: "仲間を探し、学ぶ",
    body: "人や案件を探し、会員向けの学びに参加します。",
  },
  {
    no: "STEP 03",
    title: "話して、商売へ",
    body: "メッセージや商談から、新しい取引を始めます。",
  },
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
          className="object-cover object-[58%_center] sm:object-[center_46%]"
        />
        <div className={HERO_SHADE} />
        <div className="relative mx-auto w-full max-w-[1120px] px-4">
          <div className="max-w-[690px] pb-12 pt-[230px] text-white sm:py-[84px]">
            <p className="text-[11px] tracking-[0.18em] text-white/75">ABOUT FOOD JAPAN NAKAMA</p>
            <h1 className="mt-4 font-serif text-[30px] leading-[1.4] tracking-[0.03em] sm:text-[40px]">
              食に関わる人が、
              <br />
              出会い、学び、
              <br />
              共創事業をつくる場所。
            </h1>
            <p className="mt-6 max-w-[620px] text-[14px] leading-8 text-white/90 sm:text-[15px]">
              生産者、食品メーカー、小売、流通、飲食店、自治体。立場を越えてつながり、次の仕事を生み出す会員制ネットワークです。
            </p>
            <div className="mt-8">
              <a href="#membership" className={btn("primary", "lg")}>NAKAMAに参加する</a>
            </div>
          </div>
        </div>
      </section>

      {/* なぜNAKAMAをつくったのか */}
      <section className="px-4 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[770px] text-center">
          <p className="text-[11px] tracking-[0.18em] text-[var(--green-d)]">WHY NAKAMA?</p>
          <h2 className="mt-4 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            良いものが、届かないままで
            <br className="hidden sm:block" />
            終わらないために。
          </h2>
          <p className="mt-5 text-[14px] leading-8 text-[var(--ink-2)] sm:text-[15px]">
            良い商品や技術があっても、必要な相手と出会えなければ商売にはなりません。FOOD JAPAN
            SUMMITで生まれたつながりを、一日だけで終わらせず、日常の仕事につなげるためにNAKAMAをつくりました。
          </p>
        </div>
      </section>

      {/* 写真付き「出会う／学ぶ／商売をつくる」 */}
      <section className="bg-[#f6f3ec] px-4 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-7">
            <h2 className="font-serif text-[24px] text-[var(--ink)] sm:text-[28px]">NAKAMAでできること</h2>
            <p className="max-w-[500px] text-[13px] leading-6 text-[var(--muted)]">
              人と会い、知恵を得て、実際の仕事へ。必要なつながりが、次の一歩を動かします。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {CAN_DO.map((it) => (
              <article key={it.no} className="relative min-h-[360px] overflow-hidden sm:min-h-[410px]">
                <Image src={it.src} alt={it.alt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-[#141414e0] to-transparent" />
                <div className="absolute inset-x-6 bottom-6 text-white">
                  <span className="text-[12px] text-white/70">{it.no}</span>
                  <h3 className="mt-1 font-serif text-[20px]">{it.title}</h3>
                  <p className="mt-1 text-[13px] leading-6 text-white/85">{it.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 参加する人 */}
      <section className="px-4 py-16 sm:py-[88px]">
        <div className="mx-auto grid max-w-[1120px] items-center gap-9 sm:grid-cols-2 sm:gap-14">
          <div className="grid h-[430px] grid-cols-2 grid-rows-[1.15fr_.85fr] gap-2.5 sm:h-[500px] sm:grid-cols-[1.08fr_.92fr] sm:grid-rows-2">
            <div className="relative col-span-2 overflow-hidden sm:col-span-1 sm:row-span-2">
              <Image src="/about/about-people.jpg" alt="多様な参加者が集う会場" fill sizes="(max-width: 640px) 100vw, 30vw" className="object-cover" />
            </div>
            <div className="relative overflow-hidden">
              <Image src="/about/about-speaker.jpg" alt="経営者が経験を語る様子" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
            </div>
            <div className="relative overflow-hidden">
              <Image src="/about/about-hero.jpg" alt="会場全体で対話する様子" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
            </div>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.18em] text-[var(--green-d)]">WHO JOINS?</p>
            <h2 className="mt-4 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[28px]">
              食の未来を動かしたい人が、
              <br className="hidden sm:block" />
              立場を越えて集まる。
            </h2>
            <p className="mt-5 text-[14px] leading-8 text-[var(--ink-2)]">
              売る側と買う側だけではありません。つくる人、届ける人、伝える人、地域を支える人が、互いの知恵とネットワークを持ち寄ります。
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

      {/* 参加から商売までの3ステップ */}
      <section className="bg-[var(--ink)] px-4 py-16 text-white sm:py-[88px]">
        <div className="mx-auto max-w-[1120px]">
          <h2 className="text-center font-serif text-[24px] sm:text-[28px]">参加から、新しい商売まで。</h2>
          <div className="mt-10 grid sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <article
                key={s.no}
                className={`py-6 sm:px-8 sm:py-2 ${i > 0 ? "border-t border-white/25 sm:border-l sm:border-t-0" : ""}`}
              >
                <span className="text-[12px] text-white/55">{s.no}</span>
                <h3 className="mt-3 font-serif text-[19px]">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-white/75">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 月額料金と申込CTA */}
      <section id="membership" className="bg-[#f6f3ec] px-4 py-16 text-center sm:py-[88px]">
        <div className="mx-auto max-w-[760px]">
          <p className="text-[11px] tracking-[0.18em] text-[var(--green-d)]">MEMBERSHIP</p>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            一人では会えなかった人と、
            <br className="hidden sm:block" />
            次の商売をつくろう。
          </h2>
          <strong className="mt-6 block font-serif text-[30px] font-medium text-[var(--ink)] sm:text-[34px]">
            月額 22,000円（税込）
          </strong>
          <p className="mt-1 text-[13px] text-[var(--muted)]">税抜 20,000円</p>
          <p className="mx-auto mt-6 max-w-[560px] text-[14px] leading-7 text-[var(--ink-2)]">
            プロフィール・商品・案件の掲載、相手探し、問い合わせ、会員向けセミナーをご利用いただけます。
          </p>
          <div className="mt-7">
            <Link href="/signup" className={btn("primary", "lg")}>月額会員に申し込む</Link>
          </div>
        </div>
      </section>
    </>
  );
}
