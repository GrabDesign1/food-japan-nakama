import Link from "next/link";
import Image from "next/image";
import { PublicTopBar } from "../_components/PublicTopBar";
import { JsonLd, PRODUCE_JSONLD, faqJsonLd } from "../_components/JsonLd";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "食の共創プロデュース｜FOOD JAPAN NAKAMA",
  description:
    "食の資源と課題を、動く事業へ。FOOD JAPAN NAKAMAが、新商品、ブランド、販路、地域事業を構想で終わらせず、適切な相手とつなぎ、企画、実証、事業化まで個別に支援します。",
};

const CTA_HREF = "/consultation?type=produce";

// 4. 共創プロデュースで行うこと
const ACTIONS = [
  { no: "01", t: "共創テーマを設計する", d: "資源、課題、顧客、実現したい未来を整理し、「誰と、何に取り組むのか」を明確にします。" },
  { no: "02", t: "共創相手を見つける", d: "必要な技術、販路、知見、資源を持つ企業や専門家を探し、打診と面談を進めます。" },
  { no: "03", t: "企画と実証を設計する", d: "事業の仕組み、役割分担、概算収支、実証方法、判断基準を整理し、共創企画書と実証計画にします。" },
  { no: "04", t: "事業化まで推進する", d: "関係者の合意、交渉、進行管理、課題解決を担い、実証から契約、販売、資金調達など、合意した成果に向けて動きます。" },
];

// 5. 支援内容（6領域）
const DOMAINS = [
  {
    t: "地域資源・事業機会の発掘",
    items: ["生産者、事業者、地域へのヒアリング", "素材、技術、文化、未利用資源の棚卸し", "顧客課題、市場、競合商品の調査", "商品化・事業化の可能性評価"],
  },
  {
    t: "商品企画・事業設計",
    items: ["ターゲットと利用場面の設計", "商品コンセプト、仕様、容量、価格の設計", "原価、手数料、物流費を含む収支計画", "生産量、販売量、実施スケジュールの設計"],
  },
  {
    t: "試作・製造体制づくり",
    items: ["加工会社、OEM、料理人、専門家との連携", "レシピ開発、試作、評価、改良", "原料調達、製造ロット、品質管理の整理", "食品表示、許認可、検査などの確認支援"],
  },
  {
    t: "ブランド・クリエイティブ",
    items: ["ブランドコンセプト、名称、物語の設計", "ロゴ、パッケージ、ラベルのデザイン", "商品写真、動画、Webページ、営業資料の制作", "POP、レシピ、店頭販促物の制作"],
  },
  {
    t: "テストマーケティング",
    items: ["クラウドファンディングの企画・制作・運用", "EC、イベント、店舗でのテスト販売", "顧客アンケート、購買データ、反応の分析", "商品、価格、訴求、販売方法の改善"],
  },
  {
    t: "販路開拓・事業拡大",
    items: ["小売、流通、飲食店、商社、ギフト、EC等への提案", "バイヤー向け商談資料と販売条件の整備", "商談、試食、導入テストの調整", "継続取引に向けた供給・物流・販促体制の改善"],
  },
];

// 6. プロジェクトの流れ（7段階）
const FLOW = [
  { no: "01", t: "NAKAMAで出会い、相談する", d: "課題、地域資源、実現したいことを共有します。" },
  { no: "02", t: "共創テーマを見つける", d: "地域資源と市場のニーズを重ね、新しい商品や事業の可能性を探ります。" },
  { no: "03", t: "共創相手を見つける", d: "必要な技術、製造機能、販路、知見を持つ企業や専門家とつながります。" },
  { no: "04", t: "個別プロジェクトを組成する", d: "目的、成果、役割、予算、収益構造、スケジュールを整理し、実行チームをつくります。" },
  { no: "05", t: "6次産業化・商品開発を実行する", d: "商品企画、試作、ブランド設計、製造・品質・物流体制を具体化します。" },
  { no: "06", t: "テスト販売で市場性を検証する", d: "実際の購入行動から、需要、価格、顧客層、評価、改善点を確かめます。" },
  { no: "07", t: "販路を開拓し、継続事業へ育てる", d: "小売、流通、飲食店、ECなどへの販路を広げ、持続的に利益を生む事業へ育てます。" },
];

// 7. こんな課題に対応します
const AUDIENCES = [
  {
    t: "生産者・産地の方",
    items: [
      "良い農林水産物をつくっているが、価格だけで比較されてしまう",
      "規格外品や未利用資源を、新しい商品に変えたい",
      "加工品をつくりたいが、製造先や進め方が分からない",
      "自分たちの価値を伝えるブランドやパッケージがない",
    ],
  },
  {
    t: "食品メーカー・事業者の方",
    items: [
      "地域素材を使った新商品を開発したい",
      "新しい商品を、いきなり大量生産せず市場で検証したい",
      "商品はあるが、販売戦略や販路が弱い",
      "生産者、自治体、小売などと共創プロジェクトを立ち上げたい",
    ],
  },
  {
    t: "自治体・地域支援機関の方",
    items: [
      "地域資源を活用した新しい産業や雇用をつくりたい",
      "単発の特産品開発で終わらせず、継続する事業にしたい",
      "生産者、加工事業者、販売先をつなぐ推進役が必要",
      "補助事業終了後も自走できる仕組みをつくりたい",
    ],
  },
  {
    t: "小売・流通・飲食・企業の方",
    items: [
      "顧客に新しい価値を提供できる地域商品を探している",
      "自社のニーズに合う生産者や産地と商品を共につくりたい",
      "オリジナル商品、ギフト、フェア、地域連携企画を開発したい",
      "必要な量・品質・価格を継続して供給できる体制をつくりたい",
    ],
  },
];

// 8. 特徴
const FEATURES = [
  {
    t: "食の多様な担い手をつなぐ",
    d: "生産者、メーカー、流通、小売、飲食店、自治体、大学、投資家、クリエイターなど、Food Japan Summitで培ったつながりを生かし、課題に必要な相手とチームをつくります。",
  },
  {
    t: "事業とクリエイティブを一体で考える",
    d: "事業計画と、名称、パッケージ、Web、販促物を別々に考えません。誰に何を届けるかという一つの戦略から、商品と伝え方を設計します。",
  },
  {
    t: "市場へ出して、購入行動から学ぶ",
    d: "会議だけで答えを出さず、小さく販売し、実際の需要と顧客の声を確認します。思い込みではなく、購入データをもとに商品と事業を改善します。",
  },
  {
    t: "売った後まで伴走する",
    d: "商品完成や初回販売で終わらず、販路、供給、物流、販促、収支を見直し、継続して売れる状態を目指します。",
  },
];

// 9. プロジェクト例（モデル例）
const EXAMPLES = [
  {
    t: "例1　規格外農産物を新商品へ",
    d: "規格外品や余剰品の発生状況を調査し、加工会社、料理人、デザイナー、販売先とチームを組成。商品企画、試作、パッケージ、テスト販売を経て、継続的な販路につなげます。",
  },
  {
    t: "例2　地域素材を使った企業との共同開発",
    d: "企業の顧客ニーズと産地の強みを整理し、共同商品のコンセプト、調達、製造、価格、販売方法を設計。双方に利益が残る共創事業をつくります。",
  },
  {
    t: "例3　地域ブランドの再構築",
    d: "商品だけでなく、生産者や地域の価値を再整理。ブランドコンセプト、名称、パッケージ、POP、レシピ、Webを一貫して設計し、価値を理解して選んでもらえる売場をつくります。",
  },
  {
    t: "例4　クラウドファンディングで市場検証",
    d: "新商品を大量生産する前に、購入型クラウドファンディングで需要、価格、顧客層を検証。支援実績と顧客の声を、小売・流通への提案材料として活用します。",
  },
];

// 10. 料金
const PRICING = [
  { plan: "共創テーマ設計", content: "ヒアリング、課題・資源・顧客・相手像の整理", deliverable: "共創テーマシート", price: "着手金15万円〜" },
  { plan: "企画・実証設計", content: "事業企画、連携先、実証方法、概算収支の設計", deliverable: "共創企画書・実証計画", price: "50万円〜" },
  { plan: "継続プロデュース", content: "相手探し、打診、面談、交渉、進行管理、事業化支援", deliverable: "月次進捗・合意事項・実行管理", price: "月額30万円〜" },
  { plan: "成功報酬", content: "売上、契約、資金調達等の合意した成果", deliverable: "契約時に定義", price: "個別設定" },
];

// 11. よくある質問（FAQPage構造化データと同一内容）
const QA: [string, string][] = [
  [
    "FOOD JAPAN NAKAMAの共創プロデュースとは何ですか？",
    "食の資源や課題をもとに、新商品、ブランド、販路、地域事業などの構想を具体化し、適切な共創相手との接続、企画、実証、事業化までを進める有料の個別支援です。人がプロジェクトに入り、打診、交渉、合意形成、進行管理などの実務を担います。",
  ],
  [
    "6次産業化とは何ですか？",
    "6次産業化とは、農林漁業などの一次産業に、食品加工などの二次産業、販売・サービスなどの三次産業を組み合わせ、新しい付加価値と収益を生み出す取り組みです。FOOD JAPAN NAKAMAでは、商品をつくるだけでなく、ブランド、製造、物流、販売までを一つの事業として設計します。",
  ],
  [
    "NAKAMAの月額会員サービスだけで商品開発を依頼できますか？",
    "月額会員サービスには、本格的な商品開発や制作業務は含まれません。会員サービスでは、出会い、相談、情報交換、共創テーマや共創相手を見つける機会を提供します。調査、商品企画、試作、デザイン、製造・物流調整、テスト販売、販路開拓などの実働は、個別契約・個別見積りの共創プロデュースとして承ります。",
  ],
  [
    "まだアイデアしかありませんが、相談できますか？",
    "はい。地域資源や課題はあるものの、商品や事業の形が決まっていない段階から相談できます。ヒアリングと調査を通じて、顧客、提供価値、共創相手、実現方法を整理します。ただし、事業化の可能性や必要な条件を確認した結果、実施を見送る場合もあります。",
  ],
  [
    "試作品や製造先が決まっていなくても依頼できますか？",
    "はい。商品企画に応じて、加工会社、OEM、料理人、専門家などの候補を探し、試作や製造体制づくりを支援します。製造可否、最小ロット、原価、品質、納期などの条件により、企画内容を調整する場合があります。",
  ],
  [
    "パッケージデザインだけを依頼できますか？",
    "対応可能です。ただし、誰に、どの価値を、いくらで届けるかが不明確なままデザインだけを進めることは推奨していません。必要に応じて、商品コンセプト、価格、販路、表示、収支を確認したうえで、売場で価値が伝わるパッケージを設計します。",
  ],
  [
    "販路を必ず紹介してもらえますか？",
    "販売先候補の選定、提案資料の作成、商談調整、テスト導入などを支援しますが、取引成立や売上を保証するものではありません。価格、品質、供給量、物流、販売条件、市場の反応を確認しながら、採用される可能性を高めます。",
  ],
  [
    "どのくらいの期間がかかりますか？",
    "期間は、商品の開発状況、試作回数、製造先、許認可、パッケージ制作、販売方法によって異なります。初回相談後に、実施工程とスケジュールをご提示します。食品の場合、表示、検査、賞味期限、製造ロットなどの確認に時間がかかることがあります。",
  ],
  [
    "自治体や複数事業者によるプロジェクトにも対応できますか？",
    "はい。自治体、生産者、加工会社、物流会社、販売先など、複数の関係者が参加するプロジェクトにも対応します。目的、意思決定方法、役割、費用、知的財産、販売責任を整理し、共創チームの進行を支援します。",
  ],
  [
    "補助金を活用したプロジェクトにも対応できますか？",
    "補助金の条件と事業内容が合う場合は、事業計画や実施体制の整理を支援できます。ただし、補助金の採択は保証できません。申請代行や法令上の専門業務が必要な場合は、行政書士、税理士などの専門家と連携します。",
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

      {/* 1. ファーストビュー */}
      <section className="relative grid min-h-[540px] items-center bg-[var(--ink)] px-5 py-16 sm:min-h-[600px] sm:py-[88px]">
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
            <p className="text-[11px] font-medium tracking-[0.2em] text-white/70">FOOD BUSINESS PRODUCE</p>
            <h1 className="mt-4 font-serif text-[32px] leading-[1.4] tracking-[0.02em] text-white sm:text-[44px]">
              食の資源と課題を、
              <br />
              動く事業に変える。
            </h1>
            <p className="mt-5 max-w-[610px] text-[15px] leading-8 text-white/90 sm:text-[16px]">
              新商品、ブランド、販路、地域事業を構想だけで終わらせず、適切な相手とつなぎ、実証と事業化まで進める個別支援です。事務局の人間が支援に入り、企画し、動かします。
            </p>
            <div className="mt-7">
              <Link href={CTA_HREF} className={btn("primary", "lg")}>プロジェクトについて相談する</Link>
            </div>
            <p className="mt-4 text-[11px] leading-6 text-white/60">
              ※本サービスは、NAKAMAの月額会費とは別料金です。支援内容に応じて個別に契約します。
            </p>
          </div>
        </div>
      </section>

      {/* 2. 導入メッセージ */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[770px]">
          <h2 className="font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            構想だけでは、事業は動かない。
          </h2>
          <p className="mt-5 text-[14px] leading-8 text-[var(--ink-2)] sm:text-[15px]">
            良い資源がある。解決したい課題も、新しい構想もある。それでも、担い手、役割、収益、実証の方法が決まらなければ、事業は動きません。
          </p>
          <div className="mt-5 border-l-2 border-[var(--green)] pl-5 text-[14px] leading-8 text-[var(--ink)] sm:text-[15px]">
            <p>誰の、どんな課題を解決するのか。</p>
            <p>誰と組み、何を実証するのか。</p>
            <p>どう収益を生み、継続させるのか。</p>
          </div>
          <p className="mt-5 text-[14px] leading-8 text-[var(--ink-2)] sm:text-[15px]">
            新商品、ブランド、販路、地域事業を実現するには、必要な相手を集め、合意をつくり、実行を前へ進める役割が必要です。
          </p>
          <p className="mt-4 text-[14px] leading-8 text-[var(--ink-2)] sm:text-[15px]">
            FOOD JAPAN NAKAMAは、相談や事業者紹介だけで終わりません。共創テーマを設計し、相手を探し、企画し、実証し、事業化まで進めます。必要に応じて、6次産業化、商品開発、ブランド設計、テスト販売、販路開拓などの個別プロジェクトへつなげます。
          </p>
        </div>
      </section>

      {/* 3. 共創支援との関係 */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <div className="mx-auto max-w-[720px] text-center">
            <Eyebrow>MEMBERSHIP → PRODUCE</Eyebrow>
            <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
              NAKAMAで生まれた可能性を、本格的な事業へ。
            </h2>
            <p className="mt-4 text-[14px] leading-8 text-[var(--ink-2)]">
              NAKAMAの会員サービスでは、出会い、相談、情報交換、共創テーマや共創相手を見つける機会を提供します。そこで見つかった可能性を、実際の事業として動かす段階が「共創プロデュース」です。ヒアリング、テーマ設計、企画、相手探し、打診、交渉、実証設計、進行管理など、人が入って動く支援のため、内容に応じた有料の個別契約で進めます。
            </p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            <div className="border border-[var(--line)] bg-white p-6">
              <h3 className="text-[15px] font-bold text-[var(--ink)]">NAKAMA会員向け共創支援</h3>
              <ul className="mt-3 text-[13px] leading-8 text-[var(--ink-2)]">
                <li>・出会い・相談・情報交換</li>
                <li>・課題や地域資源の共有</li>
                <li>・共創テーマの発見</li>
                <li>・共創相手との接点づくり</li>
                <li>・共創のきっかけづくり</li>
              </ul>
              <p className="mt-3 border-t border-[var(--line)] pt-3 text-[12px] font-semibold text-[var(--green-d)]">月額会員サービス</p>
            </div>
            <div className="border-2 border-[var(--green)] bg-white p-6">
              <h3 className="text-[15px] font-bold text-[var(--green-d)]">共創プロデュース</h3>
              <ul className="mt-3 text-[13px] leading-8 text-[var(--ink-2)]">
                <li>・調査・戦略設計</li>
                <li>・商品企画・収支設計</li>
                <li>・試作・製造体制の構築</li>
                <li>・ブランド・パッケージ制作</li>
                <li>・テスト販売・販路開拓</li>
              </ul>
              <p className="mt-3 border-t border-[var(--line)] pt-3 text-[12px] font-semibold text-[var(--green-d)]">個別契約・個別見積り</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 共創プロデュースで行うこと */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>WHAT WE DO</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            出会いを、合意と実行に変えます。
          </h2>
          <p className="mt-4 max-w-[780px] text-[14px] leading-8 text-[var(--ink-2)]">
            共創相手と出会うだけでは、事業は始まりません。課題と目的を共有し、双方の役割、費用、成果、実証方法を決め、行動に移す必要があります。FOOD JAPAN NAKAMAは、次の4つを設計し、実行を支援します。
          </p>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ACTIONS.map((a) => (
              <div key={a.no} className="border-t-[3px] border-[var(--green)] bg-[#f6f3ec] px-5 py-6">
                <span className="font-serif text-[12px] text-[var(--orange)]">{a.no}</span>
                <h3 className="mt-2 text-[15px] font-bold text-[var(--ink)]">{a.t}</h3>
                <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">{a.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 支援内容 */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>SERVICES</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            事業化に必要な領域を、ひとつのプロジェクトとして支援します。
          </h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DOMAINS.map((dm, i) => (
              <div key={dm.t} className="border border-[var(--line)] bg-white p-6">
                <span className="font-serif text-[12px] text-[var(--orange)]">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-1.5 text-[15px] font-bold text-[var(--ink)]">{dm.t}</h3>
                <ul className="mt-3 list-disc pl-5 text-[13px] leading-7 text-[var(--ink-2)]">
                  {dm.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[12px] leading-6 text-[var(--muted)]">
            ※必要な支援だけを組み合わせてプロジェクトを設計します。すべての業務を一律に実施するものではありません。
          </p>
        </div>
      </section>

      {/* 6. プロジェクトの流れ（7段階） */}
      <section className="bg-[var(--green-d)] px-5 py-16 text-white sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow light>PROJECT FLOW</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] sm:text-[30px]">
            共創から、継続する事業が生まれるまで
          </h2>
          <div className="mt-9 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((f) => (
              <div key={f.no} className="border border-white/25 bg-white/5 px-5 py-5">
                <span className="font-serif text-[12px] text-[var(--orange)]">STEP {f.no}</span>
                <h3 className="mt-2 text-[14px] font-bold leading-6">{f.t}</h3>
                <p className="mt-2 text-[12px] leading-6 text-[#dce8e2]">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. こんな課題に対応します */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>FOR WHOM</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            こんな課題に対応します
          </h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {AUDIENCES.map((au) => (
              <div key={au.t} className="border border-[var(--line)] p-6">
                <h3 className="text-[15px] font-bold text-[var(--green-d)]">{au.t}</h3>
                <ul className="mt-3 list-disc pl-5 text-[13px] leading-7 text-[var(--ink-2)]">
                  {au.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FOOD JAPAN NAKAMAの特徴 */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>OUR STRENGTH</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            人を紹介するだけでなく、プロジェクトを動かします。
          </h2>
          <div className="mt-9 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {FEATURES.map((ft) => (
              <div key={ft.t} className="border-t-2 border-[var(--green)] pt-4">
                <h3 className="font-serif text-[17px] text-[var(--ink)]">{ft.t}</h3>
                <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">{ft.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. プロジェクト例 */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>MODEL CASES</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            プロジェクト例
          </h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <div key={ex.t} className="border border-[var(--line)] bg-white p-6">
                <h3 className="text-[15px] font-bold text-[var(--ink)]">{ex.t}</h3>
                <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">{ex.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[12px] leading-6 text-[var(--muted)]">
            ※上記は支援内容を示すモデル例です。実際の支援範囲はプロジェクトごとに設計します。
          </p>
        </div>
      </section>

      {/* 10. 料金 */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>FEE</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            人が入り、企画し、動かす有料の個別支援です。
          </h2>
          <p className="mt-4 max-w-[780px] text-[14px] leading-8 text-[var(--ink-2)]">
            共創プロデュースは、NAKAMAの月額会費には含まれません。初回相談後、取り組む範囲、成果物、役割分担、スケジュール、費用を明記した企画書・見積書をご提示します。
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING.map((p) => (
              <div key={p.plan} className="flex flex-col border border-[var(--line)] bg-white p-6">
                <h3 className="text-[15px] font-bold text-[var(--ink)]">{p.plan}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-6 text-[var(--ink-2)]">{p.content}</p>
                <p className="mt-3 text-[12px] text-[var(--muted)]">成果物：{p.deliverable}</p>
                <p className="mt-3 border-t border-[var(--line)] pt-3 text-[17px] font-bold text-[var(--green-d)]">
                  {p.price}
                  {p.price !== "個別設定" ? <span className="ml-1 text-[11px] font-normal text-[var(--muted)]">（税抜）</span> : null}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] leading-7 text-[var(--ink-2)]">
            商品開発、試作、製造、デザイン、撮影、Web制作、広告、出張、専門家、物流などの費用は、プロジェクト内容に応じて別途お見積りします。
          </p>
          <p className="mt-2 text-[13px] font-semibold leading-7 text-[var(--ink)]">
            契約では、売上、利益、販売額、契約成立、資金調達などの成果を保証・確約するものではありません。
          </p>
          <div className="mt-7">
            <Link href={CTA_HREF} className={btn("primary", "lg")}>まずはプロジェクトについて相談する</Link>
          </div>
        </div>
      </section>

      {/* 11. よくある質問 */}
      <section className="px-5 py-16 sm:py-[88px]">
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

      {/* 12. 最終CTA */}
      <section className="bg-[var(--green-d)] px-5 py-16 text-center text-white sm:py-[88px]">
        <div className="mx-auto max-w-[760px]">
          <Eyebrow light>START A PROJECT</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.55] sm:text-[30px]">
            地域の可能性を、
            <br />
            動くプロジェクトにしませんか。
          </h2>
          <div className="mx-auto mt-5 max-w-[560px] text-left text-[14px] leading-8 text-[#dce8e2]">
            <p>地域資源を生かしたいが、事業の形が見えない。</p>
            <p>新商品や販路をつくりたいが、誰と組めばよいか分からない。</p>
            <p>共創の構想はあるが、実証や事業化まで進める人がいない。</p>
          </div>
          <p className="mx-auto mt-5 max-w-[620px] text-[14px] leading-8 text-[#dce8e2]">
            その資源、課題、構想を、FOOD JAPAN NAKAMAにお聞かせください。必要な共創相手とチームをつくり、企画し、実証し、継続する事業へ進めます。
          </p>
          <div className="mt-8">
            <Link
              href={CTA_HREF}
              className="inline-block rounded-lg bg-[var(--orange)] px-10 py-4 text-[16px] font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              プロジェクトについて相談する
            </Link>
          </div>
          <p className="mt-6 text-[12px] leading-6 text-[#bcd8ca]">
            相談時にお聞きすること：地域・素材／現在の課題／実現したいこと／希望時期／想定予算／現在の協力事業者
          </p>
        </div>
      </section>
    </>
  );
}
