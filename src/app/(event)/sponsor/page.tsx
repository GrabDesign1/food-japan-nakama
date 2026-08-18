import Link from "next/link";
import type { Metadata } from "next";
import {
  HOST, MIN_PLAN_PRICE, yen, VENUES,
  COMMON_VALUE_CARDS, COMMON_VALUE_NOTE,
} from "@/lib/sponsor";
import s from "./sponsor-teaser.module.css";

// Food Japan Summit 2026 協賛のティザーページ。
//
// ⚠️ 2026-08-18 に納品された `sponsor-top.html`（実装指示書つき）をそのまま実装したもの。
//    **文言・階層・CTAリンクは納品HTMLが正**（指示書の指定）。勝手に整えないこと。
// ⚠️ ここから2つに分岐させる：申し込む → /sponsor/apply、相談する → /sponsor/contact。
//    金額やプランが決まっていない人が行き止まりにならないようにする作りは維持している。
// ⚠️ 以前この位置にあった「協賛企業共通の提供価値カード」と「特別割価格の注記」は、
//    丸ごと差し替えの判断（ユーザー 2026-08-18）で外した。**税別表記だけは残している**
//    （金額を出す以上、税別である旨は消せない）。
// ⚠️ NAKAMA の機能ではないので noindex のまま。URLを直接案内して使う。
// ⚠️ 見た目は黒基調。申込フォーム（/sponsor/apply）は白基調のままで、意図的に別の顔にしている。
// ⚠️ CTAの文言は納品HTMLの「共創パートナーに申し込む」から**「協賛に申し込む」へ変更**
//    （ユーザー指示 2026-08-18）。リンク先は /sponsor/apply のまま。

export const metadata: Metadata = {
  title: "Food Japan Summit 2026｜共創パートナー募集",
  description:
    "試食、対話、商談から、次の商品・販路・地域連携を生み出す。Food Japan Summit 2026の共創パートナーを募集しています。",
  robots: { index: false, follow: false },
};

/**
 * ヒーロー直下の判断材料（2026-08-18 改訂指示書1。出典＝2026_マスターJapanFoodSummit(5).pptx）。
 * ⚠️ これは**目標・想定であって実績ではない**。「予定」「目標」「想定」の語を外さないこと。
 *    外すと達成を保証したことになる（指示書の禁止事項）。
 */
const FIGURES = [
  { n: "25名", label: "登壇者を予定" },
  { n: "50社", label: "参加企業を予定" },
  { n: "100件", label: "商談機会を目標" },
  // ⚠️ 来場想定は開催で規模が違うので分けて出す（1枠に詰めると改行位置が崩れる）。
  { n: "200〜300名", label: "宮崎の来場想定" },
  { n: "400〜500名", label: "名古屋の来場想定" },
];

/** 会場で起きること（納品HTMLの WHAT HAPPENS）。 */
const HAPPENS = [
  {
    no: "01 / SPEAK",
    title: ["ブランドを伝える。", "次の相手を見つける。"],
    lead: "スポンサーセッション",
    body: "で、貴社のブランドの考え方と、新商品・地域連携・サステナビリティへの取り組みを発信。経営者、商品開発責任者、バイヤー、シェフ、行政担当者との次の対話をつくります。",
  },
  {
    no: "02 / TASTE",
    title: ["試食・試飲・資料で、", "反応を得る。"],
    lead: "展示・試食・試飲",
    body: "に加え、資料を通じて商品や取り組みを具体的に伝えます。バイヤーや飲食店からの率直な反応を、商品改善、販売提案、次の商談に生かせます。",
    // ⚠️ 全協賛企業へ一律で保証しないための注記（指示書の禁止事項）。外さないこと。
    note: "展示・試食・試飲・資料配布の内容は協賛プランに応じます。",
  },
  {
    no: "03 / MEET",
    title: ["会うべき相手と、", "次の話を始める。"],
    lead: "事務局",
    body: "が、貴社の目的やテーマに応じて商談候補者を選定します。参加者の同意を得た範囲で紹介・面談調整を行い、名刺交換で終わらない商談、共同開発、地域連携の入口をつくります。",
  },
  {
    no: "04 / CONTINUE",
    title: ["イベント後も、", "事業を進め続ける。"],
    lead: "FOOD JAPAN NAKAMA",
    body: "に協賛企業として紹介情報を掲載。出会いを一日で終わらせず、実証、販路開拓、共創プロジェクトへ進むための接点を継続します。",
    // ⚠️ 継続利用は年間会員特典という切り分けを崩さない。
    note: "案件掲載、メッセージ、マッチング相談などの継続利用は、年間会員特典として提供します。",
  },
];

/** FROM EVENT TO BUSINESS の3ステップ。 */
const STEPS = [
  { no: "BEFORE", title: ["会いたい相手と、", "試したいことを定める。"], body: "協賛の目的と発信テーマを整理します。" },
  { no: "AT THE SUMMIT", title: ["語る、味わう、", "その場で話を進める。"], body: "登壇、試食、展示、ネットワーキングで対話を深めます。" },
  { no: "AFTER", title: ["商談、実証、", "次の共創事業へ。"], body: "Food Japan NAKAMAを通じて関係を継続します。" },
];

export default function SponsorLandingPage() {
  return (
    <div className={s.page}>
      {/* ⚠️ (event)/layout.tsx が既に <main id="main"> を持っているので、ここでは main を使わない。 */}
        <section className={s.hero}>
          <div className={`${s.wrap} ${s.nav}`}>
            <span>FOOD JAPAN SUMMIT / 2026</span>
            <Link href="/sponsor/contact">協賛のご相談</Link>
          </div>
          <div className={`${s.wrap} ${s.heroMain}`}>
            {/* ⚠️ ロゴは本文と同じ流れに置いて左端を揃える（ユーザー指示 2026-08-18）。
                絶対配置に戻すと、器が中央寄せなぶん本文の左端とずれる。
                ⚠️ 遅延読み込みしない（指示書）。 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={s.heroLogo}
              src="/sponsor/teaser/fjs-logo-hero.png"
              alt="食のリーダーが共創づくり Food Japan Summit"
              width={800}
              height={348}
              fetchPriority="high"
            />
            <div className={s.ey}>CO-CREATION PARTNER / SPONSORSHIP</div>
            {/* ⚠️ キャッチコピーはユーザー指定（2026-08-18）。改行の位置も指定どおり。
                装飾（色替え等）を足さないこと。 */}
            <h1>
              協賛で
              <br />
              商談へつなげる。
              <br />
              共創をつくる。
            </h1>
            <p>
              生産者、企業、流通、飲食、自治体、スタートアップが同じテーブルを囲む。Food Japan
              Summitは、商品を味わい、アイデアを磨き、次に一緒に動く相手を見つける場です。
            </p>
            <div className={s.actions}>
              <Link className={`${s.btn} ${s.primary}`} href="/sponsor/apply">
                協賛に申し込む
              </Link>
              <Link className={`${s.btn} ${s.ghost}`} href="/sponsor/contact">
                まずは相談する
              </Link>
            </div>
            <p className={s.note}>宮崎開催・名古屋開催・両開催からお選びいただけます。</p>
          </div>
        </section>

        {/* ⚠️ 英語のティッカー（TRY IT / TALK ABOUT IT …）は削除した
            （ユーザー指示 2026-08-18「意味がわからない」）。CSSの .ticker も未使用。 */}

        {/* 判断材料の数字帯（改訂指示書1）。
            ⚠️ ラベルの「予定」「目標」「想定」を外さないこと＝外すと達成保証になる。 */}
        <section className={s.figures}>
          <div className={`${s.wrap} ${s.figureGrid}`}>
            {FIGURES.map((f) => (
              <div key={f.label} className={s.figure}>
                <b>{f.n}</b>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={s.intro}>
          <div className={`${s.wrap} ${s.introGrid}`}>
            <div>
              <div className={s.ey}>WHY SPONSOR</div>
              <h2>
                協賛で、
                <br />
                <i>何が起きるか。</i>
              </h2>
            </div>
            <div className={s.introCopy}>
              <p>
                貴社の商品・技術・課題を起点に、
                <strong>会いたい相手と出会い、会場で試し、次の商談・共創へ繋げる。</strong>
                {/* ⚠️ ここで必ず改行する（ユーザー指定 2026-08-18）。 */}
                <br />
                これがFood Japan Summitの協賛です。
              </p>
              <p>
                目指すのはその場の露出ではなく、商品開発、販路開拓、地域連携など、次に動き出す具体的な仕事です。
              </p>
            </div>
          </div>
        </section>

        <section className={s.what}>
          <div className={s.wrap}>
            <div className={s.whatHead}>
              <div>
                <div className={s.ey}>WHAT HAPPENS</div>
                {/* ⚠️ 見出しはユーザー指定（2026-08-18）。改行や装飾を足さないこと。 */}
                <h2 className={s.sectionTitle}>協賛するメリット</h2>
              </div>
              {/* ⚠️「参加者の同意を得た範囲での商談候補者紹介・面談調整」は指示書の必須文言。
                  成果を保証する表現に書き換えないこと。 */}
              <p>
                協賛プランに応じて、登壇、試食・試飲、展示、参加者の同意を得た範囲での商談候補者紹介・面談調整、Food
                Japan NAKAMAでの紹介を組み合わせます。
              </p>
            </div>
            <div className={s.happen}>
              {HAPPENS.map((h) => (
                <article key={h.no}>
                  <b>{h.no}</b>
                  <h3>
                    {h.title[0]}
                    <br />
                    {h.title[1]}
                  </h3>
                  <p>
                    <strong>{h.lead}</strong>
                    {h.body}
                    {h.note ? (
                      <span className={s.itemNote}>※ {h.note}</span>
                    ) : null}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 協賛の詳細（2026-08-18 ユーザー指定の文面をそのまま掲載）──
            ⚠️ 文面は要約・言い換えをしないこと。ページ中央のCTAもここに置く
               （ヒーロー下・途中・一番下の3か所に置くというユーザー指示）。 */}
        {/* ── 協賛企業共通の提供価値＋価格・CTA（2026-08-18 改訂指示書3）──
            ⚠️ ここにあった「協賛で得られるのは、露出だけではありません。」の見出しと、
               その後の長い説明文・課題リスト・事務局の接点設計は**01〜04と内容が重複する**ため
               指示書の指定で削除した。短い提供価値と価格・CTAだけを置く。 */}
        <section className={s.detail}>
          <div className={s.wrap}>
            <div className={s.ey}>WHAT YOU GET</div>
            <h2 className={s.detailTitle}>協賛企業共通の提供価値</h2>

            <div className={s.values}>
              {COMMON_VALUE_CARDS.map((c) => (
                <div key={c.label}>
                  <h3>{c.label}</h3>
                  <p>{c.text}</p>
                </div>
              ))}
            </div>

            <p className={s.lead}>
              協賛プランは{yen(MIN_PLAN_PRICE)}（税別）から。宮崎開催、名古屋開催、両開催からお選びいただけます。登壇、展示・試食、商談候補者紹介・面談調整、NAKAMA掲載の範囲はプランごとに異なります。
            </p>

            <div className={s.actions}>
              <Link className={`${s.btn} ${s.primary}`} href="/sponsor/apply">
                協賛に申し込む
              </Link>
              <Link className={`${s.btn} ${s.ghost}`} href="/sponsor/contact">
                まずは協賛内容を相談する
              </Link>
            </div>
            <div className={s.notes}>
              <p>
                「相談する」は、ご連絡先だけの短いフォームです。プランや金額が決まっていなくてもお送りいただけます。
              </p>
              <p>※ {COMMON_VALUE_NOTE}</p>
              {/* ⚠️ 特別割の価格はここに手書きしている。sponsor.ts の LOCAL_DISCOUNT_PRICES を
                  変えたら、この一文も直すこと（申込フォームは定義から導出しているのでずれる）。 */}
              <p>
                金額はすべて税別です。宮崎県内に本店または主たる事業所を置く法人は、宮崎開催に限り特別割価格（PRESENTER
                40万円／STRATEGIC 70万円／DIAMOND PARTNER
                200万円）でお申し込みいただけます。各プランの価格と詳しい特典は申込フォームでご確認いただけます。
              </p>
            </div>

            <dl className={s.venues}>
              {[VENUES.miyazaki, VENUES.nagoya].map((v) => (
                <div key={v.label}>
                  <dt>{v.label}</dt>
                  <dd>
                    {v.dates}／{v.venue}
                  </dd>
                </div>
              ))}
              <div>
                <dt>主催</dt>
                <dd>{HOST}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={s.cities}>
          <div className={s.wrap}>
            <div className={s.ey}>TWO CITIES, DIFFERENT OPPORTUNITIES</div>
            <h2 className={s.sectionTitle}>
              深くつながる宮崎。
              <br />
              広く進める名古屋。
            </h2>
            <div className={s.cityGrid}>
              <article className={`${s.city} ${s.miyazaki}`}>
                <div className={s.cityBg} />
                <div className={s.cityContent}>
                  <div className={s.label}>MIYAZAKI / STAY TOGETHER</div>
                  <h3>宮崎</h3>
                  <p>
                    合宿型に近い二日間。食のリーダーやキーパーソンと、試食会・交流・フィールドワークを通じて長い時間をともにします。一緒に旅をするような濃い時間が、表面的ではない信頼と、次の共創を生み出します。
                  </p>
                  <time dateTime="2026-11-17">2026.11.17–18 ／ 宮崎観光ホテル</time>
                </div>
              </article>
              <article className={`${s.city} ${s.nagoya}`}>
                <div className={s.cityBg} />
                <a
                  className={s.tech}
                  href="https://techgala.jp/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/sponsor/teaser/techgala-logo.jpg"
                    alt="TechGALA 2026: BEYOND"
                    loading="lazy"
                    width={900}
                    height={472}
                  />
                </a>
                <div className={s.cityContent}>
                  <div className={s.label}>AICHI / NAGOYA × TECHGALA</div>
                  <h3>名古屋</h3>
                  <p>
                    都市の企業・流通・スタートアップとつながり、事業をより広い市場へ進める。食品産業の集積地・東海とTechGALAの接点から、販路、技術、資金、仲間を得る機会をつくります。
                  </p>
                  <time dateTime="2026-12-15">2026.12.15–16 ／ 名鉄グランドホテル（予定）</time>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={s.after}>
          <div className={s.wrap}>
            <div className={s.afterGrid}>
              <div>
                <div className={s.ey}>FROM EVENT TO BUSINESS</div>
                <h2 className={s.sectionTitle}>一日で終わらせない。</h2>
              </div>
              <p>
                事前に目的を整え、会場で試し、終わった後に次の打ち合わせへ。Food Japan
                Summitは、出会いを継続する事業に変えるための共創プラットフォームです。
              </p>
            </div>
            <div className={s.steps}>
              {STEPS.map((st) => (
                <article key={st.no} className={s.step}>
                  <b>{st.no}</b>
                  <h3>
                    {st.title[0]}
                    <br />
                    {st.title[1]}
                  </h3>
                  <p>{st.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={s.final}>
          <div className={s.wrap}>
            <div className={s.ey} style={{ justifyContent: "center" }}>
              JOIN THE CO-CREATION
            </div>
            <h2>
              次の商品と、
              <br />
              <i>次の商談をつくろう。</i>
            </h2>
            {/* ⚠️「（税別）」は納品HTMLには無いが足している（ユーザー判断 2026-08-18）。
                金額を出す以上、税別である旨を消せないため。金額はプラン定義から導出。 */}
            <p>
              協賛プランは{yen(MIN_PLAN_PRICE)}（税別）から。宮崎、名古屋、両開催での関わり方を、貴社の目的に合わせてご提案します。内容や金額が未確定でもご相談ください。
            </p>
            <div className={s.actions} style={{ justifyContent: "center" }}>
              <Link className={`${s.btn} ${s.primary}`} href="/sponsor/apply">
                協賛に申し込む
              </Link>
              <Link className={`${s.btn} ${s.ghost}`} href="/sponsor/contact">
                協賛内容を相談する
              </Link>
            </div>
          </div>
        </section>
      {/* ⚠️ フッターは「フードジャパンサミット実行委員会」だけにする（ユーザー指定 2026-08-18）。
          運営会社と連絡先は、上の「主催」と申込・相談フォーム側で示している。 */}
      <footer className={s.foot}>
        <div className={s.wrap}>フードジャパンサミット実行委員会</div>
      </footer>
    </div>
  );
}
