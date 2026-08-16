// 食品ロス支援ページ（食品循環プロデュース）。
// 指示書＝相談ファイル/CloudCode_食品ロス支援ページ_再設計実装指示書_20260816.md（2026-08-16 実装）。
//
// このページだけの配色（指示書 9-3）。globals.css は触らず、ここで完結させる：
//   墨緑 #182019 ／ 深緑 #49634F ／ 生成り #F4F0E6 ／ アクセント黄緑 #DCE969
// 影は使わない・角丸は最小・1セクション1メッセージ・アニメーションなし（prefers-reduced-motion 対応不要な作り）。
import Link from "next/link";
import Image from "next/image";
import { PublicTopBar } from "../_components/PublicTopBar";
import { JsonLd, FOODLOSS_JSONLD, faqJsonLd } from "../_components/JsonLd";
import {
  pBody,
  pBtn,
  pContainer,
  pContainerWide,
  pEyebrow,
  pH1,
  pH2,
  pH3,
  pNote,
  pSection,
} from "../_components/publicUi";

export const metadata = {
  title: "食品ロス・副産物を次の価値へ｜FOOD JAPAN NAKAMA",
  description:
    "規格外品、売れ残り、製造副産物を、商品・原料・飼料・肥料などの新しい用途へ。FOOD JAPAN NAKAMAが調査、相手探し、実証、事業化を支援します。",
  openGraph: {
    images: ["/food-loss/og-food-loss.jpg"],
  },
};

const CTA_HREF = "/consultation?type=food-loss";

// 5-3 課題カード
const PROBLEMS = [
  "規格外や傷があるため、味や品質に問題がなくても出荷できない",
  "パン、惣菜、弁当などが売れ残る",
  "賞味期限が近い在庫や旧商品が残っている",
  "切れ端、割れ、搾りかす、残渣が定期的に発生する",
  "ビール粕、コーヒーかす、廃菌床の処分に費用がかかる",
  "加工技術、採算、法規制、販売先が分からない",
];

// 5-4 解決領域
const SOLUTIONS = [
  { no: "01", t: "発生そのものを減らす", d: "製造量や仕入量、値引きのタイミングを見直します。" },
  { no: "02", t: "まだ食べられるものを届ける", d: "値引き販売、EC、レスキュー販売、寄贈などを設計します。" },
  { no: "03", t: "別の商品や原料へ", d: "規格外品や端材を、菓子、飲料、ビール、ジンなどへ。" },
  { no: "04", t: "副産物を資源として循環", d: "ビール粕、コーヒーかす、廃菌床を飼料、堆肥、素材へ。" },
  { no: "05", t: "容器や資材も地域循環へ", d: "回収、分別、処理、農業利用まで含めて設計します。" },
];

// 5-5 NAKAMAの役割
const TEAM = [
  { t: "排出する側", d: "農家、食品メーカー、スーパー、コンビニ、ベーカリー、飲食店、ホテル" },
  { t: "活用する側", d: "加工会社、OEM、醸造所、蒸留所、農家、素材メーカー、リサイクル事業者" },
  { t: "事業を支える側", d: "物流、小売、EC、自治体、大学、検査機関、デザイナー、投資家" },
];

// 5-6 プロジェクト例
const IDEAS = [
  { tag: "廃菌床", t: "キクラゲの廃菌床を、農業・畜産資材へ", d: "堆肥、土壌改良材、飼料原料などへの利用可能性を検証。" },
  { tag: "廃麦芽", t: "クラフトビールの廃麦芽を、次の商品へ", d: "菓子、パン、グラノーラ、飼料、堆肥などへ。" },
  { tag: "コーヒーかす", t: "店舗や工場のかすを、地域資源へ", d: "回収コストと利用量が釣り合う地域内循環を設計。" },
  { tag: "菓子の端材", t: "ドーナツやクッキーを、ビールやジンへ", d: "表示、酒税、衛生、供給、ブランドまで確認。" },
  { tag: "売れ残り", t: "惣菜やパンを、廃棄前に販売", d: "値引き、通知、セット販売、予約受取を小さく実証。" },
  { tag: "植物由来容器", t: "使用後の容器を、次の農業へ", d: "分別・回収、処理、分解条件、農業利用を確認。" },
];

// 5-7 進め方
const FLOW = [
  { no: "01", t: "捨てているものを確認", d: "種類、状態、場所、量、頻度、処分方法と費用を伺います。" },
  { no: "02", t: "活用方法と条件を調査", d: "成分、安全性、保存性、法規制、需要、物流、費用を整理。" },
  { no: "03", t: "必要な相手を集める", d: "加工会社、醸造所、農家、販売先、自治体、大学へ打診。" },
  { no: "04", t: "小さく試す", d: "試作、回収テスト、販売実験で品質、需要、原価を検証。" },
  { no: "05", t: "続けられる事業にする", d: "役割、価格、契約、物流、品質管理を整えます。" },
];

// 5-8 依頼できる範囲（金額は出さない＝ユーザー指示 2026-08-16。費用は相談後に個別見積）
const MENU = [
  { plan: "活用可能性の整理", note: "発生状況の確認、用途候補と必要な相手の整理（食品循環テーマシート）" },
  { plan: "企画・実証設計", note: "用途調査、連携先候補、回収・加工・販売方法、収支と実証の設計" },
  { plan: "継続プロデュース", note: "相手探し、打診、交渉、試作・実証、進行管理" },
  { plan: "成功報酬", note: "合意した成果に応じて設定" },
];

// 5-9 FAQ
const FAQ: [string, string][] = [
  [
    "まだ活用方法が決まっていません。相談できますか？",
    "はい。発生物の種類、量、状態を確認し、活用方法を探すところから支援します。",
  ],
  [
    "少量でも相談できますか？",
    "相談できます。ただし回収・輸送・加工費が価値を上回る場合は、量をまとめる方法や地域内活用を検討します。",
  ],
  [
    "NAKAMAが余った食品を買い取りますか？",
    "原則として一律に買い取るサービスではありません。活用事業者や販売先を探し、取引条件を整える支援です。",
  ],
  [
    "飼料や肥料への転用は必ずできますか？",
    "できるとは限りません。成分、安全性、保存状態、加工方法、関係法令を確認して判断します。",
  ],
  [
    "補助金を使った事業にも対応できますか？",
    "相談できます。ただし補助金の採択や交付は保証しません。補助事業終了後も継続できる収支と運営体制を重視します。",
  ],
];

// 5-10 相談時に伺うこと
const ASK_ITEMS = [
  "種類",
  "写真",
  "発生量と頻度",
  "発生場所",
  "保管状態",
  "現在の処分方法と費用",
  "希望時期",
  "想定予算",
];

function Eyebrow({ children, tone = "dark" }: { children: React.ReactNode; tone?: "dark" | "light" | "lime" }) {
  const color = tone === "light" ? "text-[#F4F0E6]" : tone === "lime" ? "text-[#DCE969]" : "text-[#49634F]";
  return <p className={`${pEyebrow} ${color}`}>{children}</p>;
}

/** 主CTA（四角に近い塗りボタン。黄緑＝濃色の上、深緑＝明るい地の上） */
function Cta({ tone = "lime", children }: { tone?: "lime" | "ink"; children: React.ReactNode }) {
  return (
    <Link href={CTA_HREF} className={pBtn(tone === "lime" ? "lime" : "ink")}>
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}

export default function FoodLossPage() {
  return (
    <>
      <PublicTopBar />
      <JsonLd data={FOODLOSS_JSONLD} />
      <JsonLd data={faqJsonLd(FAQ)} />

      {/* ページ内ナビ（指示書 4） */}
      <div className="sticky top-0 z-30 border-b border-[#2b352c] bg-[#182019]">
        <div className={`${pContainer} flex items-center justify-between gap-4 py-3`}>
          <span className="text-[12px] font-bold tracking-[0.08em] text-[#F4F0E6] sm:text-[13px]">
            食品循環プロデュース
          </span>
          <nav aria-label="ページ内ナビゲーション" className="flex items-center gap-4 sm:gap-6">
            <a href="#ideas" className="hidden text-[12px] text-[#C7D0C4] hover:text-[#DCE969] sm:inline">
              プロジェクト例
            </a>
            <a href="#flow" className="hidden text-[12px] text-[#C7D0C4] hover:text-[#DCE969] sm:inline">
              進め方
            </a>
            <a href="#price" className="hidden text-[12px] text-[#C7D0C4] hover:text-[#DCE969] sm:inline">
              費用
            </a>
            <Link
              href={CTA_HREF}
              className="rounded-[2px] bg-[#DCE969] px-4 py-2 text-[12px] font-bold text-[#182019] hover:bg-[#E7F08D]"
            >
              相談する
            </Link>
          </nav>
        </div>
      </div>

      {/* 5-1 ヒーロー：トマトの山＝左、文字＝右 */}
      <section className="relative flex min-h-[620px] items-center overflow-hidden bg-[#182019] lg:min-h-[680px]">
        <Image
          src="/food-loss/food-loss-hero.jpg"
          alt="畑に積み上げられた大量の規格外トマト"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[30%_center]"
        />
        {/* 読みやすさのための黒〜深緑のオーバーレイ（文字はHTMLで重ねる） */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,32,25,0.55)_0%,rgba(24,32,25,0.92)_72%)] lg:bg-[linear-gradient(90deg,rgba(24,32,25,0.25)_0%,rgba(24,32,25,0.80)_38%,rgba(24,32,25,0.95)_62%)]"
        />
        {/* ヒーローだけは横幅を広く取る（右の文字組みを保ったまま、左にトマトを残すため） */}
        <div className={`${pContainerWide} relative py-[72px] lg:py-[96px]`}>
          <div className="lg:ml-auto lg:max-w-[880px] xl:max-w-[1040px]">
            <Eyebrow tone="lime">FOOD CIRCULATION PRODUCE</Eyebrow>
            {/* 見出しの2行は指示書で固定。PCは幅に合わせて字を伸縮させ、折り返しが増えないようにする */}
            <h1 className={`${pH1} mt-5 text-[#F4F0E6]`}>
              捨てるしかなかったものを、
              <br />
              <span className="text-[#DCE969]">次の価値に変える。</span>
            </h1>
            <p className={`${pBody} mt-7 max-w-[620px] text-[#DCE3D8]`}>
              規格外の農産物、売れ残った食品、製造時に出る端材、ビール粕やコーヒーかす。活用方法も相手も分からない食品や副産物を、商品、原料、飼料、肥料などの新しい用途につなげます。
            </p>
            <div className="mt-9">
              <Cta>活用したい食品・副産物について相談する</Cta>
            </div>
            <p className="mt-5 max-w-[560px] text-[12px] leading-[1.9] text-[#AEBBAC] sm:text-[13px]">
              NAKAMAの月額会費とは別料金の個別支援です。支援内容に応じてお見積りします。
            </p>
          </div>
        </div>
      </section>

      {/* 5-2 価値の説明 */}
      <section className={`bg-white ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow>OUR APPROACH</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#182019]`}>
            「もったいない」で終わらせず、
            <br />
            続く仕組みをつくる。
          </h2>
          <div className="mt-9 max-w-[820px]">
            <p className={`${pBody} text-[#3B463C]`}>
              FOOD JAPAN NAKAMAは、排出する事業者と、技術、製造、販売、物流を担う相手を集め、調査、用途開発、実証、事業化まで実務に入って進めます。
            </p>
            <p className={`${pBody} mt-5 text-[#3B463C]`}>
              一社だけでは動かせない課題に、必要なNAKAMAを集めます。
            </p>
          </div>
        </div>
      </section>

      {/* 5-3 課題カード（生成り・上罫線＋番号＋テキスト） */}
      <section className={`bg-[#F4F0E6] ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow>YOUR PROBLEM</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#182019]`}>
            こんな食品や副産物を、
            <br />
            捨てていませんか。
          </h2>
          <ul className="mt-12 grid gap-x-10 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
            {PROBLEMS.map((p, i) => (
              <li key={p} className="border-t border-[#C9C3AF] py-6">
                <span className="text-[11px] font-bold tracking-[0.18em] text-[#49634F]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 text-[15px] font-bold leading-[1.8] text-[#182019] sm:text-[16px]">{p}</p>
              </li>
            ))}
          </ul>
          <p className={`${pNote} mt-10 max-w-[820px] text-[#5C6459]`}>
            すべてが商品化できるわけではありません。まず「何が、いつ、どれだけ、どの状態で発生するのか」を確認し、実現性と採算性のある活用方法を探します。
          </p>
        </div>
      </section>

      {/* 5-4 解決領域（濃色・横罫線の3列） */}
      <section className={`bg-[#182019] ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow tone="lime">WHAT WE SOLVE</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#F4F0E6]`}>
            「もったいない」で終わらせず、
            <br />
            続く仕組みをつくります。
          </h2>
          <div className="mt-12 border-t border-[#3A453B]">
            {SOLUTIONS.map((s) => (
              <div
                key={s.no}
                className="grid gap-2 border-b border-[#3A453B] py-7 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-6 lg:grid-cols-[80px_320px_minmax(0,1fr)] lg:items-baseline"
              >
                <span className="text-[13px] font-bold tracking-[0.14em] text-[#DCE969]">{s.no}</span>
                <h3 className={`${pH3} text-[#F4F0E6]`}>{s.t}</h3>
                <p className="text-[14px] leading-[2] text-[#AEBBAC] sm:text-[15px] lg:col-start-3 lg:row-start-1">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5-5 NAKAMAの役割 */}
      <section className={`bg-white ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow>FOOD JAPAN NAKAMA MODEL</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#182019]`}>
            食品循環の共創チームをつくる。
          </h2>
          <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-3">
            {TEAM.map((t) => (
              <div key={t.t} className="border-t-2 border-[#182019] pt-5">
                <h3 className={`${pH3} text-[#182019]`}>{t.t}</h3>
                <p className="mt-3 text-[14px] leading-[2] text-[#5C6459] sm:text-[15px]">{t.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 border border-[#C9C3AF] bg-[#F4F0E6] px-6 py-5">
            <p className="text-[13px] leading-[1.9] text-[#182019] sm:text-[14px]">
              <span className="font-bold">NAKAMAが担うこと</span>
              <span className="ml-3 text-[#49634F]">
                課題整理 ／ 相手探し ／ 打診 ／ 企画 ／ 収支設計 ／ 実証 ／ 進行管理
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* 5-6 プロジェクト例（生成り・3カラム） */}
      <section id="ideas" className={`scroll-mt-16 bg-[#F4F0E6] ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow>PROJECT IDEAS</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#182019]`}>
            例えば、こんな循環をつくります。
          </h2>
          <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {IDEAS.map((c) => (
              <div key={c.t} className="flex flex-col border-t border-[#C9C3AF] pt-5">
                <span className="text-[11px] font-bold tracking-[0.14em] text-[#49634F]">{c.tag}</span>
                <h3 className={`${pH3} mt-3 min-h-[3.4em] text-[#182019]`}>
                  {c.t}
                </h3>
                <p className="mt-2 text-[14px] leading-[2] text-[#5C6459]">{c.d}</p>
              </div>
            ))}
          </div>
          <p className={`${pNote} mt-10 max-w-[900px] text-[#5C6459]`}>
            これらはプロジェクト例です。実施可能性は、原料の状態、成分、発生量、地域、費用、安全性、法規制等を調査したうえで判断します。
          </p>
        </div>
      </section>

      {/* 5-7 進め方（PC 横5カラム） */}
      <section id="flow" className={`scroll-mt-16 bg-white ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow>PROJECT FLOW</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#182019]`}>
            相談から、循環が動き出すまで。
          </h2>
          <div className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
            {FLOW.map((f) => (
              <div key={f.no} className="border-t-2 border-[#182019] pt-5">
                <span className="text-[13px] font-bold tracking-[0.14em] text-[#49634F]">{f.no}</span>
                <h3 className={`${pH3} mt-3 text-[#182019]`}>{f.t}</h3>
                <p className="mt-3 text-[13px] leading-[2] text-[#5C6459] sm:text-[14px]">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5-8 依頼できる範囲と費用（濃色・4カラム。金額は出さない＝ユーザー指示 2026-08-16） */}
      <section id="price" className={`scroll-mt-16 bg-[#182019] ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow tone="lime">FEE</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#F4F0E6]`}>
            調査だけでも、事業化まででも依頼できます。
          </h2>
          <p className={`${pNote} mt-6 max-w-[820px] text-[#AEBBAC]`}>
            NAKAMAの月額会員とは別の、個別支援サービスです。発生している量や状態、必要な調査や実証の範囲によって費用が変わるため、
            まずご相談のうえで内容を定め、個別にお見積り・ご契約します（このページから自動で決済されることはありません）。
          </p>
          <div className="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {MENU.map((p) => (
              <div key={p.plan} className="border-t border-[#3A453B] pt-5">
                <h3 className={`${pH3} text-[#F4F0E6]`}>{p.plan}</h3>
                <p className="mt-4 text-[15px] font-bold text-[#DCE969]">個別見積</p>
                <p className="mt-3 text-[13px] leading-[1.9] text-[#AEBBAC]">{p.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-12 max-w-[900px] text-[12px] leading-[2] text-[#8E9B8D] sm:text-[13px]">
            検査、分析、試作、製造、容器、デザイン、撮影、Web制作、広告、出張、物流、専門家等の費用は別途。商品化、販売、廃棄費削減その他の成果を保証・確約するものではありません。
          </p>
        </div>
      </section>

      {/* 5-9 FAQ */}
      <section className={`bg-white ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#182019]`}>
            よくある質問
          </h2>
          <div className="mt-12 max-w-[900px] border-t border-[#D8D3C4]">
            {FAQ.map(([q, a], i) => (
              <details key={q} open={i === 0} className="border-b border-[#D8D3C4]">
                <summary className="cursor-pointer list-none py-6 text-[16px] font-bold leading-[1.7] text-[#182019] marker:hidden sm:text-[17px]">
                  {q}
                </summary>
                <p className="pb-6 text-[14px] leading-[2] text-[#5C6459] sm:text-[15px]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 5-10 最終CTA（グリーン） */}
      <section className={`bg-[#49634F] ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow tone="light">START A PROJECT</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#F4F0E6]`}>
            捨てる費用を、
            <br />
            次の事業への入口に。
          </h2>
          <p className={`${pBody} mt-7 max-w-[720px] text-[#E4EADF]`}>
            活用したい気持ちはあるが、自社だけでは用途も相手も見つからない。
            <br className="hidden sm:block" />
            その状況を、まずお聞かせください。
          </p>
          <div className="mt-9">
            <Cta>食品ロス・副産物の活用を相談する</Cta>
          </div>
          <p className="mt-5 text-[12px] leading-[1.9] text-[#D3DCCE] sm:text-[13px]">
            NAKAMAの月額会費とは別料金の個別支援です。支援内容に応じてお見積りします。
          </p>
          <div className="mt-12 border-t border-[#6C8271] pt-6">
            <p className="text-[13px] font-bold text-[#F4F0E6]">相談時に、分かる範囲でお聞かせください</p>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px] leading-[1.9] text-[#D3DCCE]">
              {ASK_ITEMS.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
