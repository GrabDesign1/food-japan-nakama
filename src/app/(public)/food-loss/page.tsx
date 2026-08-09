import Link from "next/link";
import Image from "next/image";
import { PublicTopBar } from "../_components/PublicTopBar";
import { JsonLd, FOODLOSS_JSONLD, faqJsonLd } from "../_components/JsonLd";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "食品ロス・規格外品・食品副産物の活用相談｜FOOD JAPAN NAKAMA",
  description:
    "規格外農産物、余剰在庫、売れ残り、ビール粕、コーヒーかす、食品加工残さなどの活用を支援。用途調査、相手探し、商品開発、飼料・肥料化、地域循環の実証まで相談できます。",
  openGraph: {
    images: ["/food-loss/og-food-loss.jpg"],
  },
};

const CTA_HREF = "/consultation?type=food-loss";

// YOUR PROBLEM
const PROBLEMS = [
  "規格外や傷があるため、味や品質に問題がなくても出荷できない",
  "パン、惣菜、弁当などが売れ残る",
  "賞味期限が近い在庫や、パッケージ変更後の旧商品が残っている",
  "製造工程で、切れ端、割れ、搾りかす、残渣が定期的に発生する",
  "ビール粕、コーヒーかす、きのこの廃菌床などの処分に費用がかかる",
  "再利用のアイデアはあるが、加工技術、採算、法規制、販売先が分からない",
  "自社だけでは必要な量を集められず、事業として成立しない",
];

// WHAT WE SOLVE
const SOLUTIONS = [
  { no: "01", t: "発生そのものを減らす", d: "販売データ、天候、曜日、予約状況などをもとに製造量や仕入量を見直し、売れ残る前に買い手へ届ける。" },
  { no: "02", t: "まだ食べられるものを必要な人へ届ける", d: "値引き販売、EC、レスキュー販売、フードバンクへの寄贈など、状態や数量に合う方法を検討する。" },
  { no: "03", t: "別の商品や原料に生まれ変わらせる", d: "規格外品や製造端材を、菓子、調味料、飲料、クラフトビール、ジンなどの原料として試作する。" },
  { no: "04", t: "食べられない副産物を資源として循環させる", d: "ビール粕、コーヒーかす、廃菌床などの飼料、堆肥、土壌改良材、素材への利用可能性を検討する。" },
  { no: "05", t: "容器や資材も地域の循環へつなげる", d: "バガスや生分解性素材について、使用後の回収、分別、処理、農業利用まで含む循環モデルを検討する。" },
];

// 共創チーム 3分類
const TEAM = [
  { t: "排出する側", d: "農家、食品メーカー、スーパー、コンビニ、ベーカリー、菓子店、飲食店、ホテル" },
  { t: "活用する側", d: "加工会社、OEM、醸造所、蒸留所、畜産農家、耕種農家、素材メーカー、リサイクル事業者" },
  { t: "事業を支える側", d: "物流会社、小売、EC、自治体、大学・研究機関、検査機関、デザイナー、投資家" },
];

// PROJECT IDEAS
const IDEAS = [
  { t: "キクラゲの廃菌床を、農業・畜産資材へ", d: "成分や安全性、保存・回収方法、利用先を確認し、飼料・堆肥・土壌改良材などへの活用を検証します。" },
  { t: "クラフトビールの廃麦芽を、次の商品へ", d: "発生量と鮮度管理、加工方法、採算性を確認し、食品や飼料などへの活用を検証します。" },
  { t: "コーヒーかすを、地域資源へ", d: "回収の仕組みと物流費、乾燥・加工方法、利用先を確認し、堆肥や素材などへの活用を検証します。" },
  { t: "菓子の切れ端を、クラフトビールやジンの原料へ", d: "品質・保存状態、酒類製造に関わる法規制、製造先を確認したうえで、原料化を検証します。" },
  { t: "売れ残りの惣菜やパンを、廃棄前に販売", d: "食品衛生と表示、値引き・EC・寄贈などの方法、オペレーションと採算性を確認します。" },
  { t: "植物由来の食品容器を、次の農業へ", d: "使用後の回収・分別・処理方法と安全性を確認し、農業利用まで含む循環モデルを検証します。" },
];

// PROJECT FLOW
const FLOW = [
  { no: "01", t: "捨てているものを確認する", d: "何が、いつ、どれだけ、どの状態で発生しているかを整理します。" },
  { no: "02", t: "活用方法と条件を調べる", d: "成分、安全性、法規制、加工方法、需要を調査します。" },
  { no: "03", t: "必要な相手を集める", d: "加工会社、利用先、物流など、実現に必要な協力先を探して打診します。" },
  { no: "04", t: "小さく試す", d: "試作・テストを行い、品質、コスト、反応を確かめます。" },
  { no: "05", t: "続けられる事業にする", d: "役割、費用、契約、物流を整理し、継続する仕組みへ育てます。" },
];

// WHAT YOU GET
const FIRST_STEPS = [
  "何が、どのくらい、どの頻度で発生しているか",
  "現在いくらで処分し、どんな負担が生じているか",
  "食品として販売・寄贈できるか、別用途の原料にするか",
  "どのような相手や技術が必要か",
  "実証する場合、何を確かめれば次へ進めるか",
  "事業化までのおおよその期間と費用",
];

// FEE
const PRICING = [
  { plan: "活用可能性の整理", d: "発生状況のヒアリング、課題整理、用途候補と必要な相手の整理", deliverable: "食品循環テーマシート", price: "着手金15万円〜", tax: true },
  { plan: "企画・実証設計", d: "用途調査、連携先候補、回収・加工・販売方法、概算収支、実証方法の設計", deliverable: "食品循環企画書・実証計画", price: "50万円〜", tax: true },
  { plan: "継続プロデュース", d: "相手探し、打診、面談、試作・実証、交渉、進行管理、事業化支援", deliverable: "月次進捗・合意事項・実行管理", price: "月額30万円〜", tax: true },
  { plan: "成功報酬", d: "売上、契約、処分費削減、資金調達等、合意した成果", deliverable: null, price: "個別設定", tax: false },
];

// FAQ（AIO対応：実際に尋ねられる質問に、見出し直下で結論から答える）
type FaqBlock = { p?: string; ul?: string[]; ol?: string[] };
type FaqItem = { q: string; blocks: FaqBlock[] };
const FAQ_GROUPS: { cat: string; items: FaqItem[] }[] = [
  {
    cat: "食品ロス・食品副産物について",
    items: [
      {
        q: "食品ロスとは何ですか？",
        blocks: [
          { p: "食品ロスとは、本来は食べられるにもかかわらず、売れ残り、規格外、返品、食べ残しなどの理由で捨てられてしまう食品です。" },
          { p: "食品の製造工程で発生するビール粕、コーヒーかす、果皮、搾りかす、廃菌床などは、状態や用途によって「食品副産物」「食品加工残さ」「食品廃棄物」として扱われる場合があります。" },
          { p: "NAKAMAでは、まだ食べられる食品だけでなく、食品製造や農業から発生する副産物の再利用についても相談できます。" },
        ],
      },
      {
        q: "どのような食品や副産物を相談できますか？",
        blocks: [
          { p: "例えば、次のようなものが対象になります。" },
          { ul: ["規格外の野菜・果物・水産物", "賞味期限が近い商品や余剰在庫", "季節商品、パッケージ変更品、販売終了商品", "パン、菓子、麺類などの製造過程で発生する端材", "ビール粕、酒粕、茶殻、コーヒーかす", "果皮、搾りかす、野菜くず", "きのこの廃菌床", "食品工場から継続的に発生する副産物", "バガスや食品由来の容器・包装資材"] },
          { p: "食品の状態や保存方法によっては活用できないこともありますが、用途が決まっていない段階から相談できます。" },
        ],
      },
      {
        q: "まだ活用方法が決まっていなくても相談できますか？",
        blocks: [
          { p: "はい。活用方法が決まっていない段階から相談できます。" },
          { p: "食品・副産物の種類、成分、発生量、頻度、保存状態、現在の処分方法などを整理し、次のような活用可能性を検討します。" },
          { ul: ["食品原料としての商品化", "飲料、菓子、調味料、酒類などへの加工", "飼料・肥料・堆肥への転用", "地域内の農家、食品メーカー、飲食店との連携", "フードシェアリングや寄附", "バイオマス資源や新素材としての活用"] },
          { p: "活用の可否は、安全性、品質、必要量、輸送距離、加工費、関係法令などを確認したうえで判断します。" },
        ],
      },
    ],
  },
  {
    cat: "販売・マッチングについて",
    items: [
      {
        q: "規格外品や余剰食品を販売できますか？",
        blocks: [
          { p: "販売できる可能性があります。" },
          { p: "NAKAMAでは、活用したい食品や副産物の情報を整理し、食品メーカー、料理人、飲食店、小売事業者、農家、研究機関、自治体など、利用する可能性がある相手を探します。" },
          { p: "ただし、掲載しただけで販売や成約が保証されるものではありません。品質、数量、価格、輸送費、供給の安定性などを確認し、継続可能な取引条件を整える必要があります。" },
        ],
      },
      {
        q: "売れ残った食品をNAKAMAが買い取ってくれますか？",
        blocks: [
          { p: "NAKAMAが食品を一律に買い取るサービスではありません。" },
          { p: "廃棄予定の商品や副産物を必要とする事業者を探し、販売、加工、寄附、再資源化などの方法を検討します。必要に応じて、相手探し、商品企画、条件交渉、実証実験、販路づくりまで支援します。" },
        ],
      },
      {
        q: "売れ残り商品を掲載するだけでも利用できますか？",
        blocks: [
          { p: "NAKAMA会員は、規格外品、余剰在庫、食品副産物などの情報を掲載し、ほかの会員へ共有できます。" },
          { p: "次の業務を事務局へ依頼する場合は、月額会費とは別に個別契約が必要です。" },
          { ul: ["活用方法や市場の調査", "活用事業者・加工事業者・販売先探し", "相手先への提案や交渉", "商品・サービスの企画", "試作や実証事業の設計", "プロジェクトの進行管理", "販売促進や販路開拓"] },
        ],
      },
      {
        q: "少量の食品や副産物でも相談できますか？",
        blocks: [
          { p: "相談できます。" },
          { p: "ただし、少量の場合は、回収費、輸送費、保管費、加工費が活用によって生まれる価値を上回ることがあります。その場合は、次のような方法を検討します。" },
          { ul: ["近隣の飲食店や農家で活用する", "同じ地域の複数事業者から発生するものを集約する", "高付加価値の商品に加工する", "定期的に発生する量をまとめて取引する", "寄附やフードシェアリングを利用する"] },
          { p: "量が少ないという理由だけで判断せず、発生頻度や地域内の需要も含めて検討します。" },
        ],
      },
    ],
  },
  {
    cat: "商品化・再資源化について",
    items: [
      {
        q: "食品ロスから新しい商品を開発できますか？",
        blocks: [
          { p: "商品化できる可能性があります。" },
          { p: "例えば、規格外農産物や菓子の端材、パン、果皮、搾りかすなどを、次のような商品へ活用する方法が考えられます。" },
          { ul: ["菓子、パン、調味料、加工食品", "クラフトビール、ジン、リキュールなどの酒類", "冷凍食品、レトルト食品", "ペットフード", "飼料、肥料、堆肥", "紙、容器、包装材などの素材"] },
          { p: "NAKAMAでは、用途の検討だけでなく、加工事業者との連携、試作、ブランド設計、テスト販売、販路開拓まで支援できます。" },
        ],
      },
      {
        q: "飼料や肥料へ転用できますか？",
        blocks: [
          { p: "転用できる可能性はありますが、すべての食品副産物を飼料や肥料にできるわけではありません。" },
          { p: "次のような確認が必要です。" },
          { ul: ["原材料と成分", "異物や有害物質の有無", "腐敗・カビなどの保存状態", "塩分、水分、油分", "加熱や乾燥などの加工方法", "継続的に確保できる量", "利用する農家や事業者", "飼料安全法、肥料法、食品リサイクル法などの関係法令"] },
          { p: "必要に応じて、専門家、研究機関、処理事業者、行政機関と連携して確認します。" },
        ],
      },
      {
        q: "賞味期限が近い商品や販売できなくなった商品も相談できますか？",
        blocks: [
          { p: "相談できます。" },
          { p: "賞味期限と消費期限は意味が異なり、期限、保存状態、表示、流通条件などによって対応が変わります。値引き販売、フードシェアリング、寄附、業務用原料への転用などを検討します。" },
          { p: "安全性が確認できない食品や、消費期限を過ぎた食品について、再販売や食用利用を勧めることはできません。" },
        ],
      },
    ],
  },
  {
    cat: "費用・進め方について",
    items: [
      {
        q: "相談すると、どのように進みますか？",
        blocks: [
          { p: "基本的には次の順番で進めます。" },
          { ol: ["発生している食品・副産物について確認", "数量、頻度、保管状態、処分費などの整理", "活用方法と必要な相手の仮説を作成", "加工事業者、利用事業者、販売先などの調査", "小規模な試作・実証", "採算性、安全性、継続性の検証", "取引または事業化"] },
          { p: "最初から大規模な商品開発を行うのではなく、可能な限り小さな実証から始めます。" },
        ],
      },
      {
        q: "相談には何を準備すればよいですか？",
        blocks: [
          { p: "すべて揃っていなくても相談できます。分かる範囲で、次の情報をご用意ください。" },
          { ul: ["食品・副産物の名称と写真", "原材料・成分", "発生する工程と理由", "1回あたりの量", "発生頻度と年間発生量", "発生場所", "賞味期限・消費期限", "温度帯と保管状態", "現在の処分方法と処分費", "希望する活用方法", "希望時期", "事業化に使える想定予算"] },
          { p: "写真とおおよその量だけでも、初回相談は可能です。" },
        ],
      },
      {
        q: "調査や事業化の費用はいくらですか？",
        blocks: [
          { p: "初回相談後、必要な業務と費用をご提示します。" },
          { p: "食品や副産物の情報掲載と、事務局による調査・交渉・事業開発は別のサービスです。相手探し、商品企画、試作、実証、販路開拓などを依頼する場合は、内容に応じた個別契約となります。" },
          { p: "加工費、検査費、試作費、輸送費、専門家費用、出張費、製造費などは、原則として別途必要です。" },
        ],
      },
      {
        q: "補助金を利用できますか？",
        blocks: [
          { p: "国、自治体、地域、実施時期、事業内容によっては、食品ロス削減、資源循環、商品開発、地域活性化などに関する補助制度を利用できる可能性があります。" },
          { p: "ただし、利用できる制度や条件は案件ごとに異なり、申請や採択を保証するものではありません。補助金の採択を前提にせず、継続できる事業モデルを検討します。" },
        ],
      },
    ],
  },
  {
    cat: "自治体・地域プロジェクトについて",
    items: [
      {
        q: "自治体や複数企業による地域循環にも対応できますか？",
        blocks: [
          { p: "はい。自治体、生産者、食品メーカー、小売店、飲食店、大学、物流会社、廃棄物処理事業者などが参加する地域循環プロジェクトにも対応します。" },
          { p: "次のような業務を支援できます。" },
          { ul: ["地域内で発生する食品・副産物の調査", "参加事業者の募集", "活用方法と事業モデルの設計", "実証事業の企画・運営", "役割分担と取引条件の整理", "成果の検証", "継続的な運営体制づくり", "情報発信や報告資料の作成"] },
          { p: "単発のイベントではなく、地域内で継続する仕組みをつくることを目指します。" },
        ],
      },
    ],
  },
];

// FAQPage構造化データ用（画面と同一内容をテキスト化）
const QA_TEXT: [string, string][] = FAQ_GROUPS.flatMap((g) =>
  g.items.map(
    (it) =>
      [
        it.q,
        it.blocks
          .map((b) => b.p ?? (b.ul ?? b.ol ?? []).join("、"))
          .join(" "),
      ] as [string, string]
  )
);

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`text-[11px] font-medium tracking-[0.2em] ${light ? "text-[#bcd8ca]" : "text-[var(--green-d)]"}`}>
      {children}
    </p>
  );
}

export default function FoodLossPage() {
  return (
    <>
      <PublicTopBar />
      <JsonLd data={FOODLOSS_JSONLD} />
      <JsonLd data={faqJsonLd(QA_TEXT)} />

      {/* ヒーロー：トマトの山=左、文章=右 */}
      <section className="relative grid min-h-[640px] items-center bg-[var(--ink)] px-5 py-16 sm:min-h-[620px] sm:py-[88px]">
        <Image
          src="/food-loss/food-loss-hero.jpg"
          alt="畑に積み上げられた大量の規格外トマト"
          fill
          priority
          sizes="100vw"
          className="pointer-events-none object-cover object-[70%_center] sm:object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a2417d9] via-[#0a241780] to-[#0a241733] sm:bg-gradient-to-l sm:from-[#0a2417d9] sm:via-[#0a241766] sm:to-transparent" />
        <div className="relative mx-auto w-full max-w-[1080px]">
          <div className="sm:ml-auto sm:max-w-[560px]">
            <p className="text-[11px] font-medium tracking-[0.2em] text-white/70">FOOD CIRCULATION PRODUCE</p>
            <h1 className="mt-4 font-serif text-[30px] leading-[1.45] tracking-[0.02em] text-white sm:text-[40px]">
              捨てるしかなかったものを、
              <br />
              次の価値に変える。
            </h1>
            <p className="mt-5 text-[14px] leading-8 text-white/90 sm:text-[15px]">
              規格外の農産物、売れ残った食品、製造時に出る端材、ビール粕やコーヒーかす。「何かに使えそうだが、活用方法も相手も分からない」食品や副産物を、商品、原料、飼料、肥料などの新しい用途につなげます。
            </p>
            <div className="mt-7">
              <Link href={CTA_HREF} className={btn("primary", "lg")}>活用したい食品・副産物について相談する</Link>
            </div>
            <p className="mt-4 text-[12px] leading-6 text-white/80">
              調査、用途開発、実証、事業化まで、必要な相手を集めて実務に入って進めます。
            </p>
          </div>
        </div>
      </section>

      {/* YOUR PROBLEM */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[820px]">
          <Eyebrow>YOUR PROBLEM</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            こんな食品や副産物を、捨てていませんか。
          </h2>
          <ul className="mt-7 flex flex-col gap-2.5">
            {PROBLEMS.map((s) => (
              <li key={s} className="flex items-start gap-2.5 border border-[var(--line)] bg-white px-4 py-3 text-[14px] font-bold leading-7 text-[var(--ink)]">
                <span aria-hidden className="mt-0.5 font-bold text-[var(--green)]">✓</span>
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[14px] leading-8 text-[var(--ink-2)]">
            廃棄物に見えるものでも、発生量、成分、品質、回収方法、加工費、需要を整理すると、別の事業者にとっての原料になる可能性があります。一方で、すべてが商品化できるわけではありません。まず「何が、いつ、どれだけ、どの状態で発生するのか」を確認し、実現性と採算性のある活用方法を一緒に探します。
          </p>
        </div>
      </section>

      {/* WHAT WE SOLVE */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>WHAT WE SOLVE</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            「もったいない」で終わらせず、続く仕組みをつくります。
          </h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.map((s) => (
              <div key={s.no} className="border-t-[3px] border-[var(--green)] bg-white px-5 py-6">
                <span className="font-serif text-[12px] text-[var(--orange)]">{s.no}</span>
                <h3 className="mt-2 text-[15px] font-bold leading-6 text-[var(--ink)]">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOD JAPAN NAKAMA MODEL */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>FOOD JAPAN NAKAMA MODEL</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            NAKAMAだからできる、食品循環の共創チーム。
          </h2>
          <p className="mt-4 max-w-[780px] text-[14px] leading-8 text-[var(--ink-2)]">
            一社だけで食品ロスを解決することは困難です。排出する人、加工する人、運ぶ人、使う人、売る人がそろって、初めて循環が動きます。FOOD JAPAN
            NAKAMAは、Food Japan Summitで培ったつながりを生かし、課題ごとに必要なチームを組成します。
          </p>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {TEAM.map((t) => (
              <div key={t.t} className="border border-[var(--line)] bg-white p-6">
                <h3 className="text-[15px] font-bold text-[var(--green-d)]">{t.t}</h3>
                <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">{t.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] leading-7 text-[var(--ink-2)]">
            FOOD JAPAN NAKAMAが、課題整理、相手探し、打診、企画、収支設計、実証、進行管理を担います。
          </p>
        </div>
      </section>

      {/* NAKAMA会員でできること（既存ブロックを維持） */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto grid max-w-[1080px] gap-4 sm:grid-cols-2">
          <div className="border border-[var(--line)] bg-white p-6">
            <h3 className="font-serif text-[18px] text-[var(--ink)]">NAKAMAでできること</h3>
            <p className="mt-2 text-[14px] leading-7 text-[var(--ink-2)]">
              規格外品や余剰在庫を「売りたい」として掲載し、活用したい企業・料理人・自治体とつながれます。
              原料として探している相手が見つかれば、廃棄コストが新しい取引に変わります。
            </p>
          </div>
          <div className="border border-[var(--line)] bg-white p-6">
            <h3 className="font-serif text-[18px] text-[var(--ink)]">事業化までの個別支援</h3>
            <p className="mt-2 text-[14px] leading-7 text-[var(--ink-2)]">
              商品化・販路づくりまで踏み込みたい場合は、共創プロデュースが企画・実証・事業化まで伴走します。
              まずは個別相談で状況をお聞かせください。
            </p>
          </div>
        </div>
      </section>

      {/* PROJECT IDEAS */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>PROJECT IDEAS</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            例えば、こんな循環をつくります。
          </h2>
          <p className="mt-4 max-w-[820px] text-[12px] leading-6 text-[var(--muted)]">
            以下は、取り組める可能性を示すプロジェクト例です。実施可否は、原料の状態、成分、発生量、地域、費用、安全性、法規制等を調査したうえで判断します。
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {IDEAS.map((c) => (
              <div key={c.t} className="border border-[var(--line)] bg-white p-6">
                <h3 className="text-[15px] font-bold leading-6 text-[var(--ink)]">{c.t}</h3>
                <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROJECT FLOW */}
      <section className="bg-[var(--green-d)] px-5 py-16 text-white sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow light>PROJECT FLOW</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] sm:text-[30px]">
            相談から、循環が動き出すまで。
          </h2>
          <div className="mt-9 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
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

      {/* WHAT YOU GET */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[820px]">
          <Eyebrow>WHAT YOU GET</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            最初の相談で整理すること。
          </h2>
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {FIRST_STEPS.map((s) => (
              <li key={s} className="flex items-start gap-2.5 border border-[var(--line)] bg-white px-4 py-3 text-[13px] leading-6 text-[var(--ink-2)]">
                <span aria-hidden className="mt-0.5 font-bold text-[var(--green)]">・</span>
                {s}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <Link href={CTA_HREF} className={btn("primary", "lg")}>食品ロス・副産物の活用を相談する</Link>
          </div>
        </div>
      </section>

      {/* FEE */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>FEE</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            調査だけでも、事業化まででも依頼できます。
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING.map((p) => (
              <div key={p.plan} className="flex flex-col border border-[var(--line)] bg-white p-6">
                <h3 className="text-[15px] font-bold text-[var(--ink)]">{p.plan}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-6 text-[var(--ink-2)]">{p.d}</p>
                {p.deliverable ? <p className="mt-3 text-[12px] text-[var(--muted)]">成果物：{p.deliverable}</p> : null}
                <p className="mt-3 border-t border-[var(--line)] pt-3 text-[17px] font-bold text-[var(--green-d)]">
                  {p.price}
                  {p.tax ? <span className="ml-1 text-[11px] font-normal text-[var(--muted)]">（税抜）</span> : null}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[12px] leading-6 text-[var(--muted)]">
            検査、分析、試作、製造、容器、デザイン、撮影、Web制作、広告、出張、物流、専門家等の費用は別途お見積りします。商品化、販売、廃棄費削減、補助金採択その他の成果を保証・確約するものではありません。
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[820px]">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            よくある質問
          </h2>
          <p className="mt-4 text-[14px] leading-7 text-[var(--ink-2)]">
            食品ロス、規格外農産物、余剰在庫、食品加工残さ、副産物の活用について、よくいただく質問をまとめました。
          </p>
          {FAQ_GROUPS.map((g, gi) => (
            <div key={g.cat} className="mt-8">
              <h3 className="text-[15px] font-bold text-[var(--green-d)]">{g.cat}</h3>
              <div className="mt-2">
                {g.items.map((it, i) => (
                  <details key={it.q} open={gi === 0 && i === 0} className="group border-t border-[var(--line)] py-5">
                    <summary className="cursor-pointer text-[14px] font-medium leading-6 text-[var(--ink)]">{it.q}</summary>
                    <div className="mt-3 flex flex-col gap-3">
                      {it.blocks.map((b, bi) =>
                        b.p ? (
                          <p key={bi} className="text-[13px] leading-7 text-[var(--muted)]">{b.p}</p>
                        ) : b.ul ? (
                          <ul key={bi} className="list-disc pl-5 text-[13px] leading-7 text-[var(--muted)]">
                            {b.ul.map((li) => <li key={li}>{li}</li>)}
                          </ul>
                        ) : b.ol ? (
                          <ol key={bi} className="list-decimal pl-5 text-[13px] leading-7 text-[var(--muted)]">
                            {b.ol.map((li) => <li key={li}>{li}</li>)}
                          </ol>
                        ) : null
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* START A PROJECT */}
      <section className="bg-[var(--green-d)] px-5 py-16 text-center text-white sm:py-[88px]">
        <div className="mx-auto max-w-[760px]">
          <Eyebrow light>START A PROJECT</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.55] sm:text-[30px]">
            食品ロス・副産物を、次の事業への入口に。
          </h2>
          <div className="mx-auto mt-5 max-w-[620px] text-left text-[14px] leading-8 text-[#dce8e2] sm:text-center">
            <p>毎日、毎週、毎月、同じ食品や副産物を廃棄している。活用したい気持ちはあるものの、自社だけでは用途も相手も見つからない。その状況を、まずお聞かせください。</p>
            <p className="mt-3">
              NAKAMAが、何が・どこで・どのくらい発生しているのかを整理します。そのうえで、食品原料、商品開発、飼料・肥料、地域内循環などの可能性を検討し、必要な企業、料理人、農家、自治体、研究機関などとつなぎます。
            </p>
            <p className="mt-3">最初から大きな事業を目指す必要はありません。実現可能性を確認するための、小さな試作や実証から始められます。</p>
          </div>
          <div className="mt-8">
            <Link
              href={CTA_HREF}
              className="inline-block rounded-lg bg-[var(--orange)] px-10 py-4 text-[16px] font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              食品ロス・副産物の活用について相談する
            </Link>
          </div>
          <div className="mx-auto mt-7 max-w-[620px] text-left">
            <p className="text-[13px] font-bold text-white">相談時に分かる範囲でお聞かせください</p>
            <ul className="mt-2 grid list-disc gap-x-6 pl-5 text-[12px] leading-6 text-[#bcd8ca] sm:grid-cols-2">
              {[
                "食品・副産物の名称",
                "写真",
                "原材料や成分",
                "発生する理由・工程",
                "1回あたりの量",
                "発生頻度・年間発生量",
                "発生場所",
                "賞味期限・消費期限",
                "温度帯・保管状態",
                "現在の処分方法と処分費",
                "実現したいこと",
                "希望時期",
                "想定予算",
              ].map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-6 text-[#bcd8ca]">
              情報がすべて揃っていなくても相談できます。写真とおおよその量だけでも構いません。
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
