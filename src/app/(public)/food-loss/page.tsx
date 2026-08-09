import Link from "next/link";
import Image from "next/image";
import { PublicTopBar } from "../_components/PublicTopBar";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "食品ロス支援｜食品副産物を次の価値へ｜FOOD JAPAN NAKAMA",
  description:
    "規格外農産物、余剰食品、製造端材、食品副産物、未利用資源を、新しい商品・原料・地域循環へ。FOOD JAPAN NAKAMAが調査、チームづくり、実証、事業化まで伴走します。",
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

// FAQ
const QA: [string, string][] = [
  ["まだ活用方法が決まっていません。相談できますか？", "はい。発生物の種類、量、状態を確認し、活用方法を探すところから支援します。"],
  ["少量でも相談できますか？", "相談できます。ただし回収・輸送・加工費が価値を上回る場合があり、地域内活用や複数事業者で量をまとめる方法も検討します。"],
  ["余った食品をNAKAMAが買い取ってくれますか？", "原則として一律に買い取るサービスではありません。活用事業者や販売先を探し、取引条件と事業の仕組みを整える支援です。"],
  ["売れ残り商品を掲載するだけでも利用できますか？", "NAKAMA会員として情報共有は可能です。調査、相手探し、企画、交渉、実証を事務局へ依頼する場合は別途個別契約です。"],
  ["飼料や肥料への転用は必ずできますか？", "できるとは限りません。成分、安全性、異物、保存状態、加工方法、利用先、関係法令などの確認が必要です。"],
  ["自治体や複数企業による地域循環にも対応できますか？", "はい。複数関係者が参加する実証事業の設計・運営にも対応します。"],
  ["補助金を利用できますか？", "対象となる可能性はありますが、制度等により異なります。採択は保証できません。"],
];

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

      {/* START A PROJECT */}
      <section className="bg-[var(--green-d)] px-5 py-16 text-center text-white sm:py-[88px]">
        <div className="mx-auto max-w-[760px]">
          <Eyebrow light>START A PROJECT</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.55] sm:text-[30px]">
            捨てる費用を、次の事業への入口に。
          </h2>
          <p className="mx-auto mt-5 max-w-[620px] text-left text-[14px] leading-8 text-[#dce8e2] sm:text-center">
            毎日、毎週、毎月、同じ食品や副産物を捨てている。活用したい気持ちはあるが、自社だけでは用途も相手も見つからない。その状況を、まずお聞かせください。何が発生しているのかを整理し、必要な相手とつなぎ、小さな実証から始めます。
          </p>
          <div className="mt-8">
            <Link
              href={CTA_HREF}
              className="inline-block rounded-lg bg-[var(--orange)] px-10 py-4 text-[16px] font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              活用したい食品・副産物について相談する
            </Link>
          </div>
          <p className="mt-6 text-[12px] leading-6 text-[#bcd8ca]">
            相談時に分かる範囲でお聞かせください：食品・副産物の種類／写真／発生量と頻度／発生場所／保管状態／現在の処分方法と費用／実現したいこと／希望時期／想定予算
          </p>
        </div>
      </section>
    </>
  );
}
