// 販路開拓支援ページ。
// 指示書＝相談ファイル/CloudCode_販路開拓支援ページ_UI修正指示書_20260816.md（2026-08-16 実装）。
// 見た目は公開ページ共通規格（_components/publicUi.ts）＝食品ロス支援・共創プロデュースと同じ骨格。
//
// **契約条件・業務範囲・成果物の詳細な文面は削除せず、各サービスの折りたたみへ移した**（指示書5）。
// 価格・準委任である旨・成果を保証しない旨は、ユーザー確定の文面をそのまま使う（2026-08-11 確定分）。
import Link from "next/link";
import { PublicTopBar } from "../_components/PublicTopBar";
import { JsonLd, HANRO_JSONLD, breadcrumbJsonLd, faqJsonLd } from "../_components/JsonLd";
import { consultationHref } from "@/lib/services";
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
  title: "食品の販路開拓支援｜販売先探し・商談準備を伴走｜FOOD JAPAN NAKAMA",
  description:
    "食品メーカー、生産者、地域事業者の販路開拓を支援。商品・販売条件の整理から、候補企業の調査・打診、商談準備までを個別に伴走します。売上・商談成立は保証しません。",
};

const CTA_HREF = "/consultation?type=service";

// 4-3 共感・課題
const CHALLENGES = [
  "商品の強みを、相手に伝わる言葉にできていない",
  "どの業種・企業へ提案すべきか分からない",
  "価格、ロット、供給量などの販売条件が整理できていない",
  "新しい地域や業界へ展開したい",
  "営業に充てる時間や人手が足りない",
  "自社だけでは接点をつくりにくい相手へ提案したい",
];

// 4-5 NAKAMAが行うこと
const WHAT_WE_DO = [
  { no: "01", t: "商品と条件を整理する", d: "商品の強み、価格、ロット、供給、販売上の課題を整理します。" },
  { no: "02", t: "狙う相手を定める", d: "業種、用途、地域、優先順位を定め、候補先の考え方をつくります。" },
  { no: "03", t: "提案の形を整える", d: "相手に伝える商品紹介、訴求、取引条件を整理します。" },
  { no: "04", t: "候補先へ打診する", d: "契約範囲に応じて候補企業を調査し、個別に打診します。" },
  { no: "05", t: "次の営業へつなげる", d: "反応と課題を記録し、商談準備と次の方針を整理します。" },
];

// 4-6 進め方
const FLOW = [
  { no: "01", t: "初回相談", d: "商品・販売条件・課題を伺います。" },
  { no: "02", t: "支援内容の整理", d: "対象市場、業務範囲、期間、費用を定めます。" },
  { no: "03", t: "個別契約", d: "準委任契約を締結します。" },
  { no: "04", t: "調査・打診・商談準備", d: "選定した内容を実行します。" },
  { no: "05", t: "報告・次の方針", d: "実施内容、反応、次の営業方針を共有します。" },
];

// 4-7 含まれないもの
const NOT_INCLUDED = [
  "売上、商品採用、商談・契約成立の保証",
  "相手企業からの返信・面談承諾の保証",
  "サンプル代、配送料、交通費、出張費などの実費",
  "LP、Web、動画、広告などの制作費",
  "取引条件の交渉、契約書作成、法務対応",
];

// ── 2つの支援メニュー（4-4）。詳細は折りたたみに入れる ──────────
type Service = {
  key: string;
  eyebrow: string;
  name: string;
  lead: string;
  desc: string;
  forWhom: string[];
  includes: string[];
  period: string;
  price: string;
  cta: string;
  /** 折りたたみに入れる詳細（現行ページの文面をそのまま保持） */
  detail: {
    work: string[];
    reportTitle: string;
    reportContents: string[];
    reportNote: string;
    excluded: string[];
  };
};

const SERVICES: Service[] = [
  {
    key: "strategy_session",
    eyebrow: "STEP 1",
    name: "商品・販路戦略セッション",
    lead: "まず、何を誰にどう売るかを整理したい。",
    desc: "商品の特徴、価格、ロット、供給条件、現在の販売状況を確認し、優先して狙う顧客・販路と、90日間の行動を整理します。",
    forWhom: ["商品の強みを説明しきれない", "販売先の優先順位を決めたい", "営業に入る前に条件を整えたい"],
    includes: [
      "90分程度のオンラインセッション",
      "商品・販路戦略シート",
      "優先顧客・販路の整理",
      "90日間のアクションプラン",
    ],
    period: "単発",
    price: "110,000円〜（税込）",
    cta: "戦略セッションを相談する",
    detail: {
      work: [
        "事前資料・商品情報の確認",
        "90分程度のオンラインセッション",
        "商品の価値・特徴・課題の整理",
        "価格、ロット、供給量、商流などの確認",
        "想定顧客・利用場面・販売先業種の整理",
        "優先して狙う販路の提案",
        "提案時の訴求ポイントの整理",
        "今後90日間のアクションプラン作成",
      ],
      reportTitle: "商品・販路戦略書（PDF／目安8〜12ページ）",
      reportContents: [
        "商品・販売条件の現状整理",
        "商品の強みと訴求ポイント",
        "想定顧客・利用場面",
        "優先して狙う販路と選定理由",
        "販路ごとの提案方針",
        "販路開拓前に改善すべき課題",
        "90日間のアクションプラン",
      ],
      reportNote:
        "本業務は準委任契約に基づき実施し、業務遂行の結果を報告する資料として「商品・販路戦略書」を作成のうえ、PDF形式で共有します。なお、本資料は、売上、商談の成立、商品採用その他の成果を保証するものではありません。",
      excluded: [
        "候補企業の個別調査",
        "企業リストの作成",
        "候補企業への打診",
        "商談の日程調整",
        "営業資料・Webサイト等の制作",
      ],
    },
  },
  {
    key: "channel_trial",
    eyebrow: "STEP 2",
    name: "販路開拓トライアル",
    lead: "候補先を探し、実際に営業を動かしたい。",
    desc: "商品と販売条件を整理したうえで、候補企業の調査・選定、初期打診、反応があった場合の面談調整、活動報告までを行います。",
    forWhom: ["新しい販売先を開拓したい", "候補先探しと初期打診を任せたい", "商談の入口をつくりたい"],
    includes: [
      "候補企業の調査・選定",
      "商品紹介・提案内容の整理",
      "候補先への個別打診",
      "面談調整と商談準備",
      "販路開拓活動報告書",
    ],
    period: "1商品・30日間程度",
    price: "440,000円〜（税込）",
    cta: "販路開拓トライアルを相談する",
    detail: {
      work: [
        "初回ヒアリング",
        "商品・販売条件・営業課題の整理",
        "狙う業種・用途・地域の設定",
        "商品紹介文・提案内容の改善",
        "候補企業の調査・選定",
        "候補先への個別打診",
        "反応があった場合の面談調整",
        "商談前の準備支援",
        "活動状況および候補先の反応の記録",
        "今後の販路開拓方針の提案",
      ],
      reportTitle: "販路開拓活動報告書（PDF）",
      reportContents: [
        "商品・販売条件・営業課題の整理",
        "販路開拓の方針と対象市場",
        "候補企業の選定結果と選定理由",
        "候補先ごとの打診内容",
        "返信・面談希望など、候補先から得られた反応",
        "打診を通じて把握した課題や改善点",
        "今後優先して取り組むべき販路",
        "次の営業活動に向けた具体的な提案",
      ],
      reportNote:
        "本業務は準委任契約に基づき実施し、業務遂行の結果を報告する資料として「販路開拓活動報告書」を作成のうえ、PDF形式で共有します。なお、本サービスは、売上、候補企業からの返信、面談・商談の成立、商品採用、契約締結その他の成果を保証するものではありません。",
      excluded: [
        "売上、商品採用、取引成立などの保証",
        "相手企業からの返信、面談承諾、商談成立の保証",
        "サンプル代、配送料、交通費、出張費などの実費",
        "営業資料、LP、Webサイト、動画、広告等の制作",
        "契約期間終了後の継続的な営業活動",
        "取引条件の交渉、契約書の作成および法務対応",
      ],
    },
  },
];

// 4-8 FAQ
const FAQ: [string, string][] = [
  [
    "商品がまだ整理できていなくても相談できますか？",
    "できます。まず商品、販売条件、現在の課題を整理し、戦略セッションまたはトライアルのどちらが適しているかを検討します。",
  ],
  [
    "販売先を必ず紹介してもらえますか？",
    "保証はできません。商品・条件・対象市場を確認したうえで、候補先の調査、選定、打診などの業務を行います。",
  ],
  [
    "自社で営業担当者がいても依頼できますか？",
    "できます。営業方針の整理、候補先の調査、初期打診、商談準備など、必要な範囲だけをご依頼いただけます。",
  ],
  [
    "相談から支援開始までどのくらいかかりますか？",
    "相談後に業務範囲と見積を提示し、合意・契約後に開始します。開始時期は対象商品と支援内容により異なります。",
  ],
];

function Eyebrow({ children, tone = "dark" }: { children: React.ReactNode; tone?: "dark" | "light" | "lime" }) {
  const color = tone === "light" ? "text-[#F4F0E6]" : tone === "lime" ? "text-[#DCE969]" : "text-[#49634F]";
  return <p className={`${pEyebrow} ${color}`}>{children}</p>;
}

function Bullets({ items, onDark }: { items: string[]; onDark?: boolean }) {
  return (
    <ul className={`flex flex-col gap-1.5 text-[13px] leading-[1.9] sm:text-[14px] ${onDark ? "text-[#AEBBAC]" : "text-[#5C6459]"}`}>
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span aria-hidden className={onDark ? "text-[#DCE969]" : "text-[#49634F]"}>
            —
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export default function HanroPage() {
  return (
    <>
      <PublicTopBar />
      <JsonLd data={HANRO_JSONLD} />
      <JsonLd data={faqJsonLd(FAQ)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "ホーム", path: "/" },
          { name: "販路開拓支援", path: "/hanro" },
        ])}
      />

      {/* ページ内ナビ（指示書 4-1） */}
      <div className="sticky top-0 z-30 border-b border-[#2b352c] bg-[#182019]">
        <div className={`${pContainer} flex items-center justify-between gap-4 py-3`}>
          <span className="text-[12px] font-bold tracking-[0.08em] text-[#F4F0E6] sm:text-[13px]">販路開拓支援</span>
          <nav aria-label="ページ内ナビゲーション" className="flex items-center gap-4 sm:gap-6">
            <a href="#services" className="hidden text-[12px] text-[#C7D0C4] hover:text-[#DCE969] sm:inline">
              サービス比較
            </a>
            <a href="#flow" className="hidden text-[12px] text-[#C7D0C4] hover:text-[#DCE969] sm:inline">
              進め方
            </a>
            <a href="#price" className="hidden text-[12px] text-[#C7D0C4] hover:text-[#DCE969] sm:inline">
              料金
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

      {/* 4-2 ヒーロー */}
      <section className="bg-[#182019]">
        <div className={`${pContainerWide} py-[72px] lg:py-[104px]`}>
          <div>
            <Eyebrow tone="lime">SALES CHANNEL DEVELOPMENT</Eyebrow>
            <h1 className={`${pH1} mt-5 text-[#F4F0E6]`}>
              まだ出会えていない相手へ、
              <br />
              <span className="text-[#DCE969]">商品の価値を届ける。</span>
            </h1>
            <p className={`${pBody} mt-7 max-w-[720px] text-[#DCE3D8]`}>
              良い商品があっても、価値や販売条件が整理され、必要とする相手に届かなければ取引にはつながりません。FOOD
              JAPAN NAKAMAは、商品・販路の整理から、候補企業の調査、打診、商談準備までを支援します。
            </p>
            <div className="mt-9">
              <Link href={CTA_HREF} className={pBtn("lime")}>
                商品と販路について相談する
                <span aria-hidden>→</span>
              </Link>
            </div>
            <p className="mt-5 max-w-[640px] text-[12px] leading-[1.9] text-[#AEBBAC] sm:text-[13px]">
              支援内容に応じてお見積りする、準委任型の個別支援です。売上・商談成立は保証しません。
            </p>
          </div>
        </div>
      </section>

      {/* 4-3 共感・課題 */}
      <section className={`bg-[#F4F0E6] ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow>YOUR CHALLENGE</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#182019]`}>
            商品はあるのに、
            <br />
            次の売り先へ進めない。
          </h2>
          <ul className="mt-12 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {CHALLENGES.map((c, i) => (
              <li key={c} className="border-t border-[#C9C3AF] py-6">
                <span className="text-[11px] font-bold tracking-[0.18em] text-[#49634F]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 text-[15px] font-bold leading-[1.8] text-[#182019] sm:text-[16px]">{c}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4-4 2つの支援メニュー */}
      <section id="services" className={`scroll-mt-16 bg-white ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow>TWO WAYS TO START</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#182019]`}>
            いまの状況に合わせて、
            <br />
            二つの入口があります。
          </h2>
          <div className="mt-12 grid gap-x-10 gap-y-12 lg:grid-cols-2">
            {SERVICES.map((s) => (
              <div key={s.key} className="flex flex-col border-t-2 border-[#182019] pt-6">
                <span className="text-[11px] font-bold tracking-[0.18em] text-[#49634F]">{s.eyebrow}</span>
                <h3 className={`${pH3} mt-2 text-[22px] text-[#182019] sm:text-[24px]`}>{s.name}</h3>
                <p className="mt-3 text-[15px] font-bold leading-[1.8] text-[#49634F] sm:text-[16px]">{s.lead}</p>
                <p className="mt-4 text-[14px] leading-[2] text-[#5C6459] sm:text-[15px]">{s.desc}</p>

                <p className="mt-7 text-[12px] font-bold tracking-[0.14em] text-[#687067]">向いている状態</p>
                <div className="mt-2">
                  <Bullets items={s.forWhom} />
                </div>

                <p className="mt-6 text-[12px] font-bold tracking-[0.14em] text-[#687067]">含まれるもの</p>
                <div className="mt-2">
                  <Bullets items={s.includes} />
                </div>

                <dl className="mt-7 border-t border-[#CFD1C8] pt-4 text-[14px]">
                  <div className="flex gap-4 py-1">
                    <dt className="w-[64px] shrink-0 text-[#687067]">期間</dt>
                    <dd className="text-[#182019]">{s.period}</dd>
                  </div>
                  <div className="flex gap-4 py-1">
                    <dt className="w-[64px] shrink-0 text-[#687067]">料金</dt>
                    <dd className="font-bold text-[#182019]">{s.price}</dd>
                  </div>
                </dl>

                {/* 詳細な業務範囲・成果物・含まれないものは折りたたみへ（指示書5） */}
                <details className="mt-5 border-t border-[#CFD1C8] pt-4">
                  <summary className="cursor-pointer text-[13px] font-bold text-[#49634F]">
                    詳しい業務範囲と成果物を見る
                  </summary>
                  <div className="mt-4 flex flex-col gap-5">
                    <div>
                      <p className="text-[12px] font-bold tracking-[0.14em] text-[#687067]">実施する業務</p>
                      <div className="mt-2">
                        <Bullets items={s.detail.work} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold tracking-[0.14em] text-[#687067]">最終成果物</p>
                      <p className="mt-2 text-[13px] font-bold text-[#182019]">{s.detail.reportTitle}</p>
                      <div className="mt-2">
                        <Bullets items={s.detail.reportContents} />
                      </div>
                      <p className="mt-3 text-[12px] leading-[1.9] text-[#687067]">{s.detail.reportNote}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold tracking-[0.14em] text-[#687067]">含まれないもの</p>
                      <div className="mt-2">
                        <Bullets items={s.detail.excluded} />
                      </div>
                    </div>
                  </div>
                </details>

                <div className="mt-7">
                  <Link href={consultationHref(s.key)} className={pBtn("ink")}>
                    {s.cta}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <p className={`${pNote} mt-10 text-[#5C6459]`}>
            商品や販売条件が整った後は、戦略セッションから販路開拓トライアルへ進むこともできます。
            ほかの支援メニューは<Link href="/pricing" className="underline">利用料金・共創支援</Link>にまとめています。
          </p>
        </div>
      </section>

      {/* 4-5 NAKAMAが行うこと */}
      <section className={`bg-[#182019] ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow tone="lime">WHAT WE DO</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#F4F0E6]`}>
            紹介だけで終わらせず、
            <br />
            営業が動くところまで整える。
          </h2>
          <div className="mt-12 border-t border-[#3A453B]">
            {WHAT_WE_DO.map((s) => (
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

      {/* 4-6 進め方 */}
      <section id="flow" className={`scroll-mt-16 bg-white ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow>PROJECT FLOW</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#182019]`}>相談から、次の商談まで。</h2>
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

      {/* 4-7 料金と含まれないもの */}
      <section id="price" className={`scroll-mt-16 bg-[#182019] ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow tone="lime">FEE</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#F4F0E6]`}>
            進める範囲に合わせて、
            <br />
            支援内容を組み立てます。
          </h2>
          <div className="mt-12 grid gap-x-10 gap-y-9 lg:grid-cols-2">
            {SERVICES.map((s) => (
              <div key={s.key} className="border-t border-[#3A453B] pt-5">
                <h3 className={`${pH3} text-[#F4F0E6]`}>{s.name}</h3>
                <p className="mt-4 text-[26px] font-bold leading-[1.2] text-[#DCE969] sm:text-[30px]">{s.price}</p>
                <p className="mt-3 text-[13px] leading-[1.9] text-[#AEBBAC]">
                  {s.period}／{s.lead}
                </p>
                <div className="mt-4">
                  <Link href={consultationHref(s.key)} className={pBtn("outlineOnDark")}>
                    {s.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 border-t border-[#3A453B] pt-8">
            <h3 className={`${pH3} text-[#F4F0E6]`}>含まれないもの</h3>
            <div className="mt-4 max-w-[820px]">
              <Bullets items={NOT_INCLUDED} onDark />
            </div>
          </div>

          <p className={`${pNote} mt-10 max-w-[900px] text-[#8E9B8D]`}>
            商品の種類、対象市場、候補先数、調査範囲、支援内容により費用は異なります。初回相談後に業務範囲とお見積りを提示し、合意後に開始します。
          </p>

          {/* 準委任の詳細説明は削除せず折りたたみで残す（指示書5） */}
          <details className="mt-6 max-w-[900px] border-t border-[#3A453B] pt-5">
            <summary className="cursor-pointer text-[13px] font-bold text-[#DCE969]">共通の契約条件を見る</summary>
            <div className="mt-4 flex flex-col gap-4 text-[13px] leading-[2] text-[#AEBBAC] sm:text-[14px]">
              <p>
                本サービスは、契約で定めた支援業務を一定期間実施する準委任型サービスです。売上、返信、面談、商談、商品採用、契約締結など、特定の成果を保証するものではありません。報酬は、調査、整理、候補先選定、打診、報告など、契約で定めた業務の遂行に対して発生します。
              </p>
              <p>
                <span className="font-bold text-[#F4F0E6]">料金に「〜」を付ける理由：</span>
                商品の種類、対象市場、調査範囲、打診先数、支援内容により料金が異なります。初回相談後に業務範囲、契約期間、報酬をご提示し、双方の合意に基づく契約締結後に支援を開始します。
              </p>
              <p>
                調査・打診の過程で知り得た個別企業の情報は、契約に基づき適切に取り扱います。候補先の社名や反応は、報告書の範囲でご報告します。
              </p>
            </div>
          </details>
        </div>
      </section>

      {/* 4-8 FAQ */}
      <section className={`bg-white ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#182019]`}>よくある質問</h2>
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

      {/* 4-9 最終CTA */}
      <section className={`bg-[#49634F] ${pSection}`}>
        <div className={pContainer}>
          <Eyebrow tone="light">START A CONVERSATION</Eyebrow>
          <h2 className={`${pH2} mt-5 text-[#F4F0E6]`}>
            売り先を探す前に、
            <br />
            売れる条件を整える。
          </h2>
          <p className={`${pBody} mt-7 max-w-[720px] text-[#E4EADF]`}>
            まだ販売先や進め方が決まっていなくても構いません。商品の状況と次に進みたいことをお聞かせください。
          </p>
          <div className="mt-9">
            <Link href={CTA_HREF} className={pBtn("lime")}>
              商品と販路について相談する
              <span aria-hidden>→</span>
            </Link>
          </div>
          <p className="mt-5 text-[12px] leading-[1.9] text-[#D3DCCE] sm:text-[13px]">
            NAKAMAの月額会費とは別料金の個別支援です。準委任型のため、売上・商談成立は保証しません。
          </p>
        </div>
      </section>
    </>
  );
}
