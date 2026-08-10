import Link from "next/link";
import Image from "next/image";
import { PublicTopBar } from "../_components/PublicTopBar";
import { JsonLd, PRODUCE_JSONLD, faqJsonLd } from "../_components/JsonLd";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "食の商品開発・事業化を伴走支援｜FOOD JAPAN NAKAMA",
  description:
    "地域素材を商品にしたい、製造先が見つからない、販路が広がらない。FOOD JAPAN NAKAMAが、企画、相手探し、試作、ブランド、テスト販売、販路開拓まで実務に入って支援します。",
};

const CTA_HREF = "/consultation?type=produce";

// こんなところで、止まっていませんか？
const STUCK_POINTS = [
  "良い農産物や地域素材はあるが、商品化やマーケティングの方法が分からない",
  "規格外品や売れ残り、食品ロス、未利用資源を新しい商品や事業に変えたい",
  "商品のアイデアはあるが、加工会社やOEM先が見つからない",
  "試作品はできたが、価格・パッケージ・販売方法が決まらない",
  "商品はあるが、小売店や飲食店との商談につながらない",
  "生産者・企業・自治体などの関係者はいるが、事業が前に進まない",
  "補助事業で商品をつくったが、継続して売れる仕組みがない",
];

// 私たちは、助言だけで終わりません。（イラスト付き4ステップ）
const ACTIONS = [
  {
    t: "課題を整理する",
    d: "素材、顧客、現在の課題、実現したいことを聞き、取り組むべきテーマを明確にします。",
    img: "/produce/action-1.jpg",
    alt: "生産者と事務局が野菜を前に課題を整理するイラスト",
  },
  {
    t: "必要な相手を集める",
    d: "生産者、加工会社、料理人、デザイナー、小売、流通、専門家など、実現に必要な相手を探し、打診します。",
    img: "/produce/action-2.jpg",
    alt: "生産者・料理人・企業を引き合わせるイラスト",
  },
  {
    t: "売れる形を設計する",
    d: "誰に、何を、いくらで届けるのかを決め、商品仕様、原価、販売方法、役割分担、実証方法を企画にします。",
    img: "/produce/action-3.jpg",
    alt: "試作品を味見しながら企画書を確認するイラスト",
  },
  {
    t: "実行を前へ進める",
    d: "関係者の合意形成、試作、制作、テスト販売、商談を進行し、途中で生じる課題を一つずつ解決します。",
    img: "/produce/action-4.jpg",
    alt: "完成した商品を販売先へ届けるイラスト",
  },
];

// ご相談後に、まず整理すること
const FIRST_STEPS = [
  "解決したい課題と、活用できる資源",
  "想定する顧客と、届けたい価値",
  "現在決まっていること、決まっていないこと",
  "必要な協力事業者と役割",
  "最初に検証すべきこと",
  "想定する進め方、期間、予算",
];

// 必要なところから支援します
const SUPPORTS = [
  { no: "01", t: "素材や地域資源の可能性を見つける", d: "生産者や事業者へのヒアリング、市場・競合調査を行い、誰にどんな価値を届けられるのかを整理します。" },
  { no: "02", t: "商品と事業の形を決める", d: "ターゲット、利用場面、商品コンセプト、仕様、容量、価格、原価、販売量を設計し、事業として成立する条件を確認します。" },
  { no: "03", t: "試作品をつくり、製造できる状態にする", d: "加工会社、OEM、料理人、専門家と連携し、レシピ、試作、製造ロット、品質管理、食品表示などを整理します。" },
  { no: "04", t: "選ばれるブランドと伝え方をつくる", d: "名称、物語、ロゴ、パッケージ、写真、動画、Web、営業資料、店頭販促物を、一つの戦略に沿って制作します。" },
  { no: "05", t: "小さく売って、確かめる", d: "クラウドファンディング、EC、イベント、店舗などでテスト販売し、購入者、価格、評価、改善点を確認します。" },
  { no: "06", t: "売り先を広げ、続く事業にする", d: "小売、流通、飲食店、商社、ギフト、ECなどへの提案と商談を進め、供給、物流、販促、収支を改善します。" },
];

// たとえば、こんなご相談です
const CASES = [
  {
    t: "規格外の農産物を、新しい商品にしたい",
    d: "発生量や時期、品質、原価を確認し、加工方法と売り先を検討します。加工会社や料理人と試作し、パッケージと販売方法を整え、小さなテスト販売から始めます。",
  },
  {
    t: "地域素材を使った商品を、企業と共同開発したい",
    d: "企業側の顧客ニーズと産地側の強みを整理し、調達、製造、価格、販売方法、双方の役割を設計します。名ばかりの連携ではなく、双方に利益が残る事業を目指します。",
  },
  {
    t: "つくった商品が売れず、見直したい",
    d: "商品、価格、顧客、売場、伝え方を確認します。必要に応じてコンセプトやパッケージを改め、テスト販売で反応を確かめてから販路へ提案します。",
  },
  {
    t: "地域事業を、補助金終了後も続けたい",
    d: "誰が運営し、誰に販売し、どこで利益を生むのかを整理します。関係者の役割、収支、供給体制を見直し、自走できる形へ組み直します。",
  },
];

// FOOD JAPAN NAKAMAができる理由
const REASONS = [
  {
    t: "食に関わる人を、立場を越えてつなげられる",
    d: "Food Japan Summitを通じて、生産者、食品メーカー、流通、小売、飲食店、自治体、大学、投資家、クリエイターとのつながりを築いてきました。案件に必要な相手を考え、個別に打診します。",
  },
  {
    t: "事業づくりとクリエイティブを分けない",
    d: "商品企画、収支、名称、パッケージ、Web、販促を別々に進めません。「誰に、どんな価値を届けるか」から一貫して設計します。",
  },
  {
    t: "会議ではなく、市場で確かめる",
    d: "最初から大量生産を目指さず、小さくつくり、小さく売ります。実際の購入行動と顧客の声をもとに、商品と事業を改善します。",
  },
  {
    t: "完成ではなく、継続を目指す",
    d: "商品をつくって終わりではありません。販路、供給、物流、販促、収支まで見直し、まじめにつくる人に利益が残る状態を目指します。",
  },
];

// 料金（頼みたいことから選ぶ）
const PRICING = [
  {
    want: "まず課題と進め方を整理したい",
    plan: "共創テーマ設計",
    price: "着手金15万円〜",
    tax: true,
    d: "ヒアリングを行い、課題、資源、顧客、必要な相手、取り組むテーマを整理します。",
    deliverable: "共創テーマシート",
  },
  {
    want: "企画と実証方法まで設計したい",
    plan: "企画・実証設計",
    price: "50万円〜",
    tax: true,
    d: "事業の仕組み、連携先、役割、概算収支、実証方法、判断基準を設計します。",
    deliverable: "共創企画書・実証計画",
  },
  {
    want: "プロジェクトの実行を任せたい",
    plan: "継続プロデュース",
    price: "月額30万円〜",
    tax: true,
    d: "相手探し、打診、面談、交渉、合意形成、進行管理などを担い、事業化まで伴走します。",
    deliverable: null,
  },
  {
    want: "成果に応じた報酬",
    plan: "成功報酬",
    price: "個別設定",
    tax: false,
    d: "売上、契約、資金調達など、双方で合意した成果に対して設定します。",
    deliverable: null,
  },
];

// よくある質問（FAQPage構造化データと同一内容）
const QA: [string, string][] = [
  [
    "まだアイデアしかありません。相談できますか？",
    "はい。アイデアを事業にするために、何を調べ、誰と組み、何から試すべきかを整理するところからご相談いただけます。",
  ],
  [
    "試作品や製造先が決まっていなくても依頼できますか？",
    "はい。必要な加工方法や製造条件を整理し、案件に合う加工会社、OEM、料理人、専門家などを探すところから支援します。ただし、必ず製造先が見つかることを保証するものではありません。",
  ],
  [
    "パッケージデザインだけを依頼できますか？",
    "はい。ただし、見た目だけを整えるのではなく、顧客、価格、売場、商品の強みを確認したうえで設計します。デザイン制作費は個別見積りです。",
  ],
  [
    "販路を必ず紹介してもらえますか？",
    "商品の特徴、価格、供給量、品質、販売条件を確認したうえで、適切な候補先を探し、提案や商談を支援します。紹介、採用、取引成立を保証するサービスではありません。",
  ],
  [
    "6次産業化とは何ですか？",
    "生産だけでなく、加工や販売まで一体的に取り組み、農林水産物の価値と所得を高める考え方です。FOOD JAPAN NAKAMAでは、商品をつくること自体ではなく、販売後も利益が残り、継続できる事業にすることを重視します。",
  ],
  [
    "NAKAMAの無料利用との違いは何ですか？",
    "NAKAMAの無料利用は、ご自身でプロフィールや案件を登録し、相手を探して問い合わせる範囲です。個別の商品企画、相手への打診、制作、交渉、進行管理など、人が実務に入る支援は共創プロデュースとして別契約になります。",
  ],
  [
    "どのくらいの期間がかかりますか？",
    "テーマ設計だけなら数週間、試作やテスト販売を含む場合は数か月が目安です。原料の収穫時期、製造先、許認可、関係者数によって変わるため、初回相談後に想定スケジュールをご提示します。",
  ],
  [
    "自治体や複数事業者のプロジェクトにも対応できますか？",
    "はい。複数の関係者が参加する案件では、目的、役割、費用、意思決定方法を整理し、合意形成と進行管理を支援します。",
  ],
  [
    "補助金を活用できますか？",
    "活用できる場合があります。ただし、採択を保証するものではありません。申請支援が必要な場合は、対応範囲と専門家費用を個別に確認します。",
  ],
];

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`text-[11px] font-medium tracking-[0.2em] ${light ? "text-[#bcd8ca]" : "text-[var(--green-d)]"}`}>
      {children}
    </p>
  );
}

export default function ProducePage() {
  return (
    <>
      <PublicTopBar />
      <JsonLd data={PRODUCE_JSONLD} />
      <JsonLd data={faqJsonLd(QA)} />

      {/* ファーストビュー */}
      <section className="relative grid min-h-[560px] items-center bg-[var(--ink)] px-5 py-16 sm:min-h-[620px] sm:py-[88px]">
        <Image
          src="/produce/produce-hero.jpg"
          alt="食の事業化について意見を交わす参加者"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[30%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414d9] via-[#14141480] to-[#14141433] sm:bg-gradient-to-r sm:from-[#141414cc] sm:via-[#14141466] sm:to-transparent" />
        <div className="relative mx-auto w-full max-w-[1080px]">
          <div className="max-w-[640px]">
            <p className="text-[11px] font-medium tracking-[0.2em] text-white/70">FOOD BUSINESS PRODUCE｜食の共創プロデュース</p>
            <h1 className="mt-4 font-serif text-[30px] leading-[1.45] tracking-[0.02em] text-white sm:text-[40px]">
              食の商品づくりを、
              <br />
              企画から販売まで支援します。
            </h1>
            <p className="mt-5 text-[15px] font-semibold leading-8 text-white sm:text-[16px]">
              地域の農産物を商品にしたい。
              <br />
              規格外品や食品ロスを、新しい事業に活用したい。
              <br />
              つくった商品を、継続して売れるようにしたい。
            </p>
            <p className="mt-4 max-w-[610px] text-[14px] leading-7 text-white/90">
              FOOD JAPAN NAKAMAの「共創プロデュース」は、食に関する商品・事業づくりを個別に支援するサービスです。
            </p>
            <p className="mt-3 max-w-[610px] text-[14px] leading-7 text-white/90">
              課題を整理し、必要な企業や専門家をつなぎながら、商品企画、加工会社・OEM先探し、試作、パッケージ、テスト販売、販路開拓まで一緒に進めます。
            </p>
            <p className="mt-3 max-w-[610px] text-[14px] leading-7 text-white/90">
              アイデアで終わらせず、実際に売れる商品と、継続できる事業をつくります。
            </p>
            <div className="mt-7">
              <Link href={CTA_HREF} className={btn("primary", "lg")}>今の課題を相談する</Link>
            </div>
            <p className="mt-4 text-[12px] leading-6 text-white/80">
              まだ計画が固まっていなくても構いません。初回相談で、現状と次に進めるべきことを整理します。
            </p>
            <p className="mt-1 text-[11px] leading-6 text-white/60">※NAKAMAの無料利用とは別の、個別契約サービスです。</p>
          </div>
        </div>
      </section>

      {/* こんなところで、止まっていませんか？ */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[820px]">
          <Eyebrow>ARE YOU STUCK?</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            こんな課題で、止まっていませんか？
          </h2>
          <ul className="mt-7 flex flex-col gap-2.5">
            {STUCK_POINTS.map((s) => (
              <li key={s} className="flex items-start gap-2.5 border border-[var(--line)] bg-white px-4 py-3 text-[14px] font-bold leading-7 text-[var(--ink)]">
                <span aria-hidden className="mt-0.5 font-bold text-[var(--green)]">✓</span>
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[14px] leading-8 text-[var(--ink-2)]">
            一つでも当てはまるなら、ご相談ください。すべてを決めてから依頼する必要はありません。今どこで止まっているのかを整理し、必要な支援だけを組み立てます。
          </p>
          <div className="mt-6">
            <Link href={CTA_HREF} className={btn("primary")}>この状態から相談する</Link>
          </div>
        </div>
      </section>

      {/* 私たちは、助言だけで終わりません。 */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>HANDS-ON SUPPORT</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            私たちは、助言だけで終わりません。
          </h2>
          <p className="mt-4 max-w-[780px] text-[14px] leading-8 text-[var(--ink-2)]">
            一般的なアドバイスや事業者の紹介だけでは、プロジェクトは動きません。FOOD JAPAN
            NAKAMAは、事務局の人間がプロジェクトに入り、関係者への打診、面談の設定、企画書の作成、役割と費用の整理、試作や販売の進行管理まで担います。
          </p>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ACTIONS.map((a) => (
              <div key={a.t} className="overflow-hidden border-t-[3px] border-[var(--green)] bg-white">
                <div className="relative aspect-[9/10] overflow-hidden">
                  <Image src={a.img} alt={a.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover" />
                </div>
                <div className="px-5 py-5">
                  <h3 className="text-[15px] font-bold text-[var(--ink)]">{a.t}</h3>
                  <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">{a.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ご相談後に、まず整理すること */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[820px]">
          <Eyebrow>FIRST CONSULTATION</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            ご相談後に、まず整理すること
          </h2>
          <p className="mt-4 text-[14px] leading-8 text-[var(--ink-2)]">
            初回相談の段階で、いきなり大きな契約をお願いすることはありません。お話を伺い、次の内容を整理します。
          </p>
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {FIRST_STEPS.map((s) => (
              <li key={s} className="flex items-start gap-2.5 border border-[var(--line)] bg-white px-4 py-3 text-[13px] leading-6 text-[var(--ink-2)]">
                <span aria-hidden className="mt-0.5 font-bold text-[var(--green)]">・</span>
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[14px] leading-8 text-[var(--ink-2)]">
            そのうえで、支援が必要な場合のみ、範囲、成果物、スケジュール、費用を記載した企画書・見積書をご提示します。
          </p>
        </div>
      </section>

      {/* 必要なところから支援します */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>SERVICES</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            必要なところから支援します
          </h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORTS.map((s) => (
              <div key={s.no} className="border border-[var(--line)] bg-white p-6">
                <span className="font-serif text-[12px] text-[var(--orange)]">{s.no}</span>
                <h3 className="mt-1.5 text-[15px] font-bold text-[var(--ink)]">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">{s.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[12px] leading-6 text-[var(--muted)]">
            ※すべてを一律に行うのではなく、現在地に合わせて必要な支援だけを組み合わせます。
          </p>
        </div>
      </section>

      {/* たとえば、こんなご相談です */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>EXAMPLES</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            たとえば、こんなご相談です
          </h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {CASES.map((c) => (
              <div key={c.t} className="border border-[var(--line)] bg-white p-6">
                <h3 className="text-[15px] font-bold text-[var(--green-d)]">{c.t}</h3>
                <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOD JAPAN NAKAMAができる理由 */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>WHY US</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            FOOD JAPAN NAKAMAができる理由
          </h2>
          <div className="mt-9 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {REASONS.map((r) => (
              <div key={r.t} className="border-t-2 border-[var(--green)] pt-4">
                <h3 className="font-serif text-[17px] text-[var(--ink)]">{r.t}</h3>
                <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 料金 */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>FEE</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            料金
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING.map((p) => (
              <div key={p.plan} className="flex flex-col border border-[var(--line)] bg-white p-6">
                <p className="text-[12px] font-semibold text-[var(--green-d)]">{p.want}</p>
                <h3 className="mt-2 text-[15px] font-bold text-[var(--ink)]">{p.plan}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-6 text-[var(--ink-2)]">{p.d}</p>
                {p.deliverable ? (
                  <p className="mt-3 text-[12px] text-[var(--muted)]">成果物:{p.deliverable}</p>
                ) : null}
                <p className="mt-3 border-t border-[var(--line)] pt-3 text-[17px] font-bold text-[var(--green-d)]">
                  {p.price}
                  {p.tax ? <span className="ml-1 text-[11px] font-normal text-[var(--muted)]">（税抜）</span> : null}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] leading-7 text-[var(--ink-2)]">
            商品開発、試作、製造、デザイン、撮影、Web制作、広告、出張、専門家、物流などの費用は、内容に応じて別途お見積りします。
          </p>
          <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
            ※本サービスはNAKAMAの無料利用の範囲には含まれません（個別契約）。
            <br />
            ※売上、利益、販売額、契約成立、資金調達などを保証するものではありません。
          </p>
          <div className="mt-6 border border-[var(--line)] bg-white p-5">
            <p className="text-[13px] font-bold text-[var(--ink)]">契約形態について（準委任契約）</p>
            <p className="mt-1 text-[12px] leading-6 text-[var(--ink-2)]">
              本サービスは、法律上「準委任契約」にあたります。安心してご依頼いただくために、契約の性質をあらかじめご案内いたします。
            </p>
            <ul className="mt-2 list-disc pl-5 text-[12px] leading-6 text-[var(--ink-2)]">
              <li>本契約は、売上や成果の達成をお約束するものではなく、専門家として業務を誠実に遂行すること（プロセス）を目的としています。</li>
              <li>そのため、成果物の完成や納品を義務とする契約（請負契約）とは異なり、完成責任や契約不適合責任は負いかねます。</li>
              <li>一方で、当事務局は、善良な管理者の注意をもって業務にあたる「善管注意義務」を負い、責任を持ってプロジェクトを進めます。</li>
            </ul>
          </div>

          <div className="mt-7">
            <Link href={CTA_HREF} className={btn("primary", "lg")}>費用も含めて相談する</Link>
          </div>
        </div>
      </section>

      {/* よくある質問 */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[820px]">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            よくある質問
          </h2>
          <div className="mt-6">
            {QA.map(([q, a], i) => (
              <details key={q} open={i === 0} className="group border-t border-[var(--line)] py-5">
                <summary className="cursor-pointer text-[14px] font-medium leading-6 text-[var(--ink)]">{q}</summary>
                <p className="mt-3 text-[13px] leading-7 text-[var(--muted)]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 最終CTA */}
      <section className="bg-[var(--green-d)] px-5 py-16 text-center text-white sm:py-[88px]">
        <div className="mx-auto max-w-[760px]">
          <Eyebrow light>START A PROJECT</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.55] sm:text-[30px]">
            地域の可能性を、
            <br />
            動くプロジェクトにしませんか。
          </h2>
          <p className="mt-5 text-[15px] font-semibold leading-8 text-white">
            「相談するには、まだ早い」と思う段階でも構いません。
          </p>
          <p className="mx-auto mt-3 max-w-[620px] text-[14px] leading-8 text-[#dce8e2]">
            地域素材、現在困っていること、実現したいことをお聞かせください。できることと、今は難しいことを率直にお伝えし、次に進む方法を一緒に考えます。
          </p>
          <div className="mt-8">
            <Link
              href={CTA_HREF}
              className="inline-block rounded-lg bg-[var(--orange)] px-10 py-4 text-[16px] font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              今の課題を相談する
            </Link>
          </div>
          <p className="mt-6 text-[12px] leading-6 text-[#bcd8ca]">
            相談時に分かる範囲でお聞かせください：地域・素材／現在の課題／実現したいこと／希望時期／想定予算／現在の協力事業者
          </p>
        </div>
      </section>
    </>
  );
}
