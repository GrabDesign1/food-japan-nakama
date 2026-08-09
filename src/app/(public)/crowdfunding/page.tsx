import Link from "next/link";
import Image from "next/image";
import { PublicTopBar } from "../_components/PublicTopBar";
import { JsonLd, CROWDFUNDING_JSONLD } from "../_components/JsonLd";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "クラウドファンディング支援｜FOOD JAPAN NAKAMA",
  description:
    "クラウドファンディングを資金集めで終わらせない。販売前に需要・価格・顧客を確かめ、最初のファンと販売実績をつくるマーケティング支援です。料金は応援購入総額の35％（Makuake手数料20％＋当社支援手数料15％）。",
};

const BENEFITS = [
  { no: "01", t: "需要を確かめる", d: "誰が、どれだけ欲しいのかを販売前に検証。" },
  { no: "02", t: "価格を確かめる", d: "複数のリターンから受け入れられる価格帯を把握。" },
  { no: "03", t: "初期ファンをつくる", d: "開発の物語に共感する最初の顧客を獲得。" },
  { no: "04", t: "販路へつなげる", d: "支援実績と顧客の声を小売・流通への提案材料に。" },
];

const PHASES = [
  {
    t: "1. 準備期",
    d: "売れる仮説をつくる",
    items: ["ターゲット・提供価値の整理", "リターンと収支の設計", "事前集客と公開初速の準備"],
  },
  {
    t: "2. 公開中",
    d: "反応を集め、熱量を高める",
    items: ["SNS・広報・既存顧客への告知", "活動報告と問い合わせ対応", "支援状況に応じた改善"],
  },
  {
    t: "3. 終了後",
    d: "データを次の商売へ変える",
    items: ["購入者・価格・地域の分析", "支援者との継続的な関係づくり", "一般販売・卸・小売への展開"],
  },
];

const SUPPORTS = [
  { t: "企画設計", d: "目的、顧客、社会的テーマ、共創先を整理。" },
  { t: "収支・リターン", d: "価格、原価、送料、目標金額、供給量を設計。" },
  { t: "ページ制作", d: "構成、コピー、デザイン、写真・動画を制作。" },
  { t: "公開後の運用", d: "活動報告、進捗管理、問い合わせ、広報を支援。" },
  { t: "次の販路", d: "結果を分析し、一般販売や流通提案へ活用。" },
];

const FAQS: { q: string; a: string[]; list?: string[]; after?: string[]; open?: boolean }[] = [
  {
    q: "クラウドファンディングで集まった支援金は、売上ですか？寄付ですか？",
    a: [
      "購入型クラウドファンディングで集まった応援購入額は、原則としてプロジェクト実行者の売上として扱います。",
      "商品代、送料、プラットフォーム手数料、当事務局の支援手数料などを含め、赤字にならないようにリターン価格を設計する必要があります。",
      "寄付を伴うプロジェクトについては、寄付先、寄付額の算定方法、会計・税務上の処理を事前に税理士などの専門家へ確認します。",
    ],
    open: true,
  },
  {
    q: "クラウドファンディングには、どのくらいの手数料がかかりますか？",
    a: [
      "本サービスでは、応援購入総額に対して、クラウドファンディング・プラットフォームの手数料20％と、当事務局の企画・制作・運用支援手数料15％がかかります。",
      "このほか、商品原価、梱包費、配送料、広告費、撮影費などが必要になる場合があります。プロジェクト開始前に収支計画を作成し、必要な費用と利益が分かる状態にします。",
      "※消費税の扱いや個別費用については、お見積り時にご案内します。",
    ],
  },
  {
    q: "クラウドファンディングの売上は、どの口座に入金されますか？",
    a: [
      "原則として、プロジェクト実行者名義の口座へ入金されます。",
      "口座情報や実行者情報の登録が必要な場合は、当事務局が設定を支援します。プロジェクト終了後、当事務局から企画・制作・運用支援手数料として、応援購入総額の15％をご請求します。",
      "入金時期や振込条件は、利用するクラウドファンディング・プラットフォームの規定に従います。",
    ],
  },
  {
    q: "クラウドファンディングの申請には、どのような資料が必要ですか？",
    a: [
      "商品やサービスの内容だけでなく、製造・調達・販売の根拠を確認できる資料が必要です。主に、次のような情報や証拠資料を準備します。",
    ],
    list: [
      "実行者・事業者の基本情報",
      "商品・サービスの詳しい説明",
      "製造元や調達先の情報",
      "原価や仕入価格が分かる見積書",
      "製造・供給が可能であることを示す資料",
      "販売価格とリターン内容",
      "生産可能数と発送予定",
      "商品写真・動画・開発経緯",
      "食品表示、許認可、検査結果など",
      "商標・著作権・販売権限に関する資料",
    ],
    after: [
      "必要書類は、商品カテゴリーとプラットフォームの審査基準によって異なります。当事務局が必要資料を整理し、申請から掲載まで支援します。",
    ],
  },
  {
    q: "支援者の配送先は誰が管理し、商品は誰が発送しますか？",
    a: [
      "原則として、プロジェクト実行者が支援者情報を確認し、商品の梱包・発送を行います。",
      "自治体、福祉施設、被災地などへ商品をまとめて届けるプロジェクトでは、公開前に受入先、配送時期、数量、保管方法、輸送方法を決めておく必要があります。",
      "当事務局は、配送計画の整理や関係者との調整を支援します。実際の発送業務を委託する場合は、別途、配送会社や物流事業者の費用がかかります。",
    ],
  },
  {
    q: "クラウドファンディングの支援額や申込数量は確認できますか？",
    a: [
      "はい。プロジェクトの支援総額、支援者数、リターンごとの申込数量などを確認できます。",
      "プロジェクト終了後は、どの商品が、どの価格で、どのような顧客に選ばれたのかを分析します。その結果を、本格販売、商品改良、価格設定、小売・流通への提案に活用できます。",
      "商品の発送結果や支援先への提供状況は、写真や数量とともに活動報告として発信できます。",
    ],
  },
  {
    q: "どのような商品でもクラウドファンディングに出品できますか？",
    a: [
      "すべての商品が出品できるわけではありません。",
      "クラウドファンディングを実施するには、品質、供給責任、原価、販売価格、生産可能数、納期、配送方法、食品表示、許認可などが整理されている必要があります。",
      "また、利用するプラットフォームの審査・掲載基準によって、掲載できない商品や表現があります。当事務局では、企画段階で実現可能性を確認し、審査に必要な情報や資料を整理します。",
    ],
  },
  {
    q: "商品がまだ完成していなくても、クラウドファンディングを実施できますか？",
    a: [
      "試作品や開発中の商品でも、製造・供給できる見通しがあり、発送時期を明示できれば、実施を検討できます。",
      "クラウドファンディングは、完成品を大量生産してから販売する方法ではありません。まず小さく市場へ出し、需要、価格、顧客の反応を確認するテストマーケティングとして活用できます。",
      "ただし、実現可能性が不明確な企画や、品質・納期を保証できない商品は、審査を通過できない場合があります。",
    ],
  },
];

const CTA_HREF = "/consultation?type=crowdfunding";

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`text-[11px] font-medium tracking-[0.2em] ${light ? "text-[#bcd8ca]" : "text-[var(--green-d)]"}`}>
      {children}
    </p>
  );
}

export default function CrowdfundingPage() {
  return (
    <>
      <PublicTopBar />
      <JsonLd data={CROWDFUNDING_JSONLD} />

      {/* ヒーロー */}
      <section className="relative grid min-h-[540px] items-center bg-[var(--ink)] px-5 py-16 sm:min-h-[600px] sm:py-[88px]">
        <Image
          src="/crowdfunding/hero-crowdfunding.jpg"
          alt="応援購入プロジェクトのイメージ（料理写真と支援状況の画面例）"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[35%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414d9] via-[#14141480] to-[#14141433] sm:bg-gradient-to-r sm:from-[#141414cc] sm:via-[#14141466] sm:to-transparent" />
        <div className="relative mx-auto w-full max-w-[1080px]">
          <div className="max-w-[640px]">
            <p className="text-[11px] font-medium tracking-[0.2em] text-white/70">CROWDFUNDING MARKETING</p>
            <h1 className="mt-4 font-serif text-[32px] leading-[1.4] tracking-[0.02em] text-white sm:text-[44px]">
              売る前に、
              <br />
              <em className="not-italic text-[var(--orange)]">売れる理由</em>をつくる。
            </h1>
            <p className="mt-5 max-w-[610px] text-[15px] leading-8 text-white/90 sm:text-[16px]">
              クラウドファンディングを、資金集めだけで終わらせない。商品を世に出す前に、需要・価格・顧客を確かめ、最初のファンと販売実績をつくるマーケティング支援です。
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link href={CTA_HREF} className={btn("primary", "lg")}>クラファン活用を相談する</Link>
              <span className="text-[12px] text-white/70">初回相談無料</span>
            </div>
            <p className="mt-4 text-[10px] text-white/50">※画像内の金額・数値はイメージです。</p>
          </div>
        </div>
      </section>

      {/* クラファンマーケティングの4つの価値 */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px] text-center">
          <Eyebrow>WHY CROWDFUNDING?</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            クラファンは、「売れるか」を確かめるマーケティングです。
          </h2>
          <p className="mx-auto mt-4 max-w-[780px] text-[15px] leading-8 text-[var(--ink-2)]">
            商品を発売前から市場へ問いかけ、需要や価格を検証する。同時に、最初の顧客とファンをつくる。実際の購入行動を、本格販売の確かな一歩につなげます。商品を小さく市場へ出し、需要・価格・顧客の反応を検証します。実際の購入データを、本格販売や商品開発に生かします。
          </p>
          <div className="mt-10 grid grid-cols-2 gap-px border border-[var(--line)] bg-[var(--line)] text-left lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.no} className="bg-white p-6 sm:p-7">
                <span className="font-serif text-[12px] text-[var(--orange)]">{b.no}</span>
                <strong className="mt-3 block text-[16px] text-[var(--green-d)]">{b.t}</strong>
                <p className="mt-2 text-[13px] leading-7 text-[var(--muted)]">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3フェーズ */}
      <section className="bg-[var(--green-d)] px-5 py-16 text-white sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow light>THREE PHASES</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] sm:text-[30px]">
            公開前から、終了後の販売まで。
          </h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {PHASES.map((p) => (
              <div key={p.t} className="border-t border-white/35 px-2 py-6">
                <b className="text-[19px]">{p.t}</b>
                <p className="mt-2 text-[13px] text-[#dce8e2]">{p.d}</p>
                <ul className="mt-3 list-disc pl-5 text-[13px] leading-8 text-[#dce8e2]">
                  {p.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 共創事業プロジェクト事例 */}
      <section className="bg-[#f8f8f5] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto grid max-w-[1080px] items-center gap-8 sm:grid-cols-[1.15fr_.85fr] sm:gap-12">
          <Image
            src="/crowdfunding/case-beer.jpg"
            alt="宮崎・青島発クラフトビールの応援購入プロジェクト（目標を上回る応援購入を達成）"
            width={1380}
            height={1296}
            sizes="(max-width: 640px) 100vw, 55vw"
            className="h-auto w-full shadow-[0_18px_44px_rgba(0,0,0,0.12)]"
          />
          <div>
            <span className="inline-block rounded-full bg-[var(--green-soft)] px-3 py-1.5 text-[11px] text-[var(--green-d)]">
              共創事業プロジェクト事例
            </span>
            <h3 className="mt-4 font-serif text-[22px] leading-[1.55] text-[var(--ink)] sm:text-[26px]">
              地方創生を目的とした、
              <br />
              クラフトビールメーカーとの
              <br />
              プロジェクト
            </h3>
            <p className="mt-3 text-[14px] leading-8 text-[var(--ink-2)]">
              宮崎・青島のサーフカルチャーから生まれたクラフトビールを、Makuakeでの応援購入企画として展開。目標を上回る支援を集め、地域発ブランドの最初のファンづくりと販売実績につながりました。
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-[12px]">
              <span className="border border-[var(--line)] bg-white px-3 py-2">商品・テーマ</span>
              <i className="not-italic text-[var(--orange)]">×</i>
              <span className="border border-[var(--line)] bg-white px-3 py-2">共創企業</span>
              <i className="not-italic text-[var(--orange)]">×</i>
              <span className="border border-[var(--line)] bg-white px-3 py-2">応援購入</span>
              <i className="not-italic text-[var(--orange)]">→</i>
              <span className="border border-[var(--line)] bg-white px-3 py-2">新しい市場</span>
            </div>
            <p className="mt-4 text-[11px] leading-6 text-[var(--muted)]">
              ※数値はMakuake掲載プロジェクト（終了済み）の公開情報です。
            </p>
          </div>
        </div>
      </section>

      {/* 支援範囲 */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>OUR SUPPORT</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            企画から販売後まで、一緒に動きます。
          </h2>
          <div className="mt-9 grid grid-cols-2 gap-3.5 lg:grid-cols-5">
            {SUPPORTS.map((s) => (
              <div key={s.t} className="border-t-[3px] border-[var(--green)] bg-[#f6f3ec] px-4 py-5">
                <b className="text-[14px] text-[var(--ink)]">{s.t}</b>
                <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 料金 */}
      <section className="bg-[#f6f3ec] px-5 py-16 sm:py-[88px]">
        <div className="mx-auto grid max-w-[1080px] items-start gap-8 sm:grid-cols-[.9fr_1.1fr] sm:gap-11">
          <div>
            <Eyebrow>FEE</Eyebrow>
            <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
              費用は、応援購入総額の35％。
            </h2>
            <p className="mt-4 text-[15px] leading-8 text-[var(--ink-2)]">
              Makuakeの利用手数料20％と、
              <br className="hidden sm:block" />
              当事務局の企画・制作・運用手数料15％です。
            </p>
            <p className="mt-3 text-[11px] leading-6 text-[var(--muted)]">
              当社手数料に含む範囲は、プロジェクトごとの実施内容を確認したうえで契約時に確定します。
              上記の他、着手金10万円がかかります。
            </p>
          <div className="mt-5 border border-[var(--line)] bg-white p-5">
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

          </div>
          <div className="border border-[var(--line)] bg-white p-6 sm:p-8">
            <p className="text-[15px] font-bold text-[var(--ink)]">出品時のお見積り</p>
            <div className="flex items-end justify-between border-b border-[var(--line)] py-4">
              <span className="text-[14px] text-[var(--ink-2)]">Makuake手数料</span>
              <b className="text-[26px] text-[var(--green-d)]">20％</b>
            </div>
            <div className="flex items-end justify-between border-b border-[var(--line)] py-4">
              <span className="text-[14px] text-[var(--ink-2)]">当事務局マーケティング支援手数料</span>
              <b className="text-[26px] text-[var(--green-d)]">15％</b>
            </div>
            <div className="flex items-end justify-between border-b border-[var(--line)] py-4">
              <span className="text-[14px] text-[var(--ink-2)]">初期着手金</span>
              <b className="text-[26px] text-[var(--green-d)]">10万円</b>
            </div>
            <div className="mt-5 flex items-center justify-between bg-[var(--green-d)] px-4 py-4 text-white">
              <span className="text-[14px]">合計手数料</span>
              <strong className="text-[20px]">35％</strong>
            </div>
            <div className="mt-6 text-[13px] leading-7 text-[var(--ink-2)]">
              <b className="text-[var(--ink)]">応援購入総額100万円の場合</b>
              <div className="mt-4 mb-3 flex h-9 text-center text-[11px] leading-9 text-white">
                <span className="w-[65%] bg-[var(--green)]">65万円</span>
                <span className="w-[20%] bg-[#88948e]">20万円</span>
                <span className="w-[15%] bg-[var(--orange)]">15万円</span>
              </div>
              <p>手数料差引後：65万円</p>
              <p className="text-[11px] text-[var(--muted)]">※着手金を除く</p>
              <p className="mt-2 text-[11px] leading-6 text-[var(--muted)]">
                ここから商品原価、梱包費、送料、広告費、返品・再送費等を支払います。消費税の取扱いやMakuakeの実際の料率・対象範囲は契約・審査時の条件を確認します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 役割分担 */}
      <section className="px-5 py-16 sm:py-[88px]">
        <div className="mx-auto max-w-[1080px]">
          <Eyebrow>RESPONSIBILITY</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            クラファンの役割分担
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border border-[var(--line)] p-6">
              <h3 className="text-[17px] font-bold text-[var(--ink)]">実行者が担うこと</h3>
              <ul className="mt-3 list-disc pl-5 text-[13px] leading-8 text-[var(--ink-2)]">
                <li>商品原価・梱包・送料等の負担</li>
                <li>在庫・品質・食品表示・発送</li>
                <li>配送先情報に基づく履行</li>
                <li>返品・再送・購入者対応の最終責任</li>
                <li>入金、キャンセル等の対応</li>
              </ul>
            </div>
            <div className="border border-[var(--line)] p-6">
              <h3 className="text-[17px] font-bold text-[var(--ink)]">当事務局が支援すること</h3>
              <ul className="mt-3 list-disc pl-5 text-[13px] leading-8 text-[var(--ink-2)]">
                <li>企画、収支、リターンの設計</li>
                <li>掲載ページと広報素材の制作</li>
                <li>公開中の進行・活動報告支援</li>
                <li>結果整理と次の販路づくり</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 pb-16 sm:pb-[88px]">
        <div className="mx-auto max-w-[820px]">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] text-[var(--ink)] sm:text-[30px]">
            クラウドファンディング支援に関するよくある質問
          </h2>
          <div className="mt-6">
            {FAQS.map((f) => (
              <details key={f.q} open={f.open} className="group border-t border-[var(--line)] py-5">
                <summary className="cursor-pointer text-[14px] font-medium leading-6 text-[var(--ink)]">{f.q}</summary>
                {f.a.map((p) => (
                  <p key={p.slice(0, 20)} className="mt-3 text-[13px] leading-7 text-[var(--muted)]">{p}</p>
                ))}
                {f.list ? (
                  <ul className="mt-3 list-disc pl-5 text-[13px] leading-7 text-[var(--muted)]">
                    {f.list.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                ) : null}
                {f.after?.map((p) => (
                  <p key={p.slice(0, 20)} className="mt-3 text-[13px] leading-7 text-[var(--muted)]">{p}</p>
                ))}
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 相談CTA */}
      <section className="bg-[var(--green-d)] px-5 py-16 text-center text-white sm:py-[88px]">
        <div className="mx-auto max-w-[760px]">
          <Eyebrow light>START A PROJECT</Eyebrow>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.5] sm:text-[30px]">
            商品を売る前に、共創の価値と市場の答えを聞く。
          </h2>
          <p className="mt-3 text-[14px] leading-7 text-[#dce8e2]">
            商品企画の段階でも、共創相手を探す段階でもご相談いただけます。
          </p>
          <div className="mt-7">
            <Link
              href={CTA_HREF}
              className="inline-block rounded-lg bg-[var(--orange)] px-10 py-4 text-[16px] font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              クラファン活用支援を相談する
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
