// 販路開拓の入口商品（商品・販路戦略セッション／販路開拓トライアル）の詳細ページ。
// 価格・業務範囲・含まれないもの・準委任である旨は、ユーザー確定の文面をそのまま掲載する（2026-08-11）。
import Link from "next/link";
import { InfoPage } from "../_components/InfoPage";
import { btn } from "@/lib/ui";
import { SERVICE_MENU, consultationHref } from "@/lib/services";

export const metadata = {
  title: "販路開拓支援｜FOOD JAPAN NAKAMA",
  description:
    "商品の価値と販売条件を整理し、買い手となり得る企業を探して実際の打診まで進めます。商品・販路戦略セッション（110,000円〜・税込）と販路開拓トライアル（440,000円〜・税込／1商品45日間）の2段階。準委任型のため成果は保証しません。",
};

const SESSION_FOR = [
  "商品の強みをうまく説明できない",
  "どの業種・企業へ提案すべきか分からない",
  "卸価格やロットなどの販売条件を見直したい",
  "営業を始める前に販路開拓の方向性を固めたい",
  "新しい地域や業界への展開を検討している",
];

const SESSION_WORK = [
  "事前資料・商品情報の確認",
  "90分程度のオンラインセッション",
  "商品の価値・特徴・課題の整理",
  "価格、ロット、供給量、商流などの確認",
  "想定顧客・利用場面・販売先業種の整理",
  "優先して狙う販路の提案",
  "提案時の訴求ポイントの整理",
  "今後90日間のアクションプラン作成",
];

const SESSION_DELIVERABLES = [
  "商品・販路戦略シート",
  "優先して狙う顧客・販路の整理",
  "販路開拓に向けた課題一覧",
  "90日間のアクションプラン",
];

// 最終成果物「商品・販路戦略書」に記載する項目
const SESSION_REPORT_CONTENTS = [
  "商品・販売条件の現状整理",
  "商品の強みと訴求ポイント",
  "想定顧客・利用場面",
  "優先して狙う販路と選定理由",
  "販路ごとの提案方針",
  "販路開拓前に改善すべき課題",
  "90日間のアクションプラン",
];

const SESSION_EXCLUDED = [
  "候補企業の個別調査",
  "企業リストの作成",
  "候補企業への打診",
  "商談の日程調整",
  "営業資料・Webサイト等の制作",
];

const TRIAL_FOR = [
  "新しい販売先を開拓したい",
  "営業担当者や営業する時間が足りない",
  "小売、外食、食品メーカーなどへ提案したい",
  "既存の販路とは異なる市場へ進出したい",
  "自社だけでは接点を持てない企業へ提案したい",
];

const TRIAL_WORK = [
  "初回ヒアリング",
  "商品・販売条件・営業課題の整理",
  "狙う業種・用途・地域の設定",
  "商品紹介文・提案内容の改善",
  "候補企業の調査・選定",
  "候補先への個別打診",
  "反応があった場合の面談調整",
  "商談前の準備支援",
  "活動状況・先方の反応の記録",
  "今後の販路開拓方針の提案",
];

const TRIAL_DELIVERABLES = [
  "販路開拓方針",
  "候補企業の調査結果",
  "実施した打診内容",
  "候補先から得られた反応",
  "今後の営業・販路開拓に関する提案",
];

const TRIAL_EXCLUDED = [
  "売上や取引成立の保証",
  "相手企業からの返信・面談承諾の保証",
  "サンプル・配送・交通・出張などの実費",
  "営業資料、LP、動画、広告等の制作",
  "45日間終了後の継続的な営業活動",
];

const FLOW = [
  "初回相談",
  "商品・販売条件の確認",
  "最適なサービスの提案",
  "業務範囲・料金の提示",
  "準委任契約の締結",
  "支援開始",
  "実施状況の報告",
  "次の販路開拓方針を提案",
];

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1 text-[13px] leading-6 text-[var(--ink-2)]">
      {items.map((t) => (
        <li key={t}>・{t}</li>
      ))}
    </ul>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-[13px] font-bold text-[var(--ink)]">{title}</h3>
      {children}
    </div>
  );
}

export default function SalesChannelPage() {
  return (
    <InfoPage
      eyebrow="SALES CHANNEL"
      title="まだ出会えていない相手へ、商品の価値を届ける。"
      lead="良い商品があっても、その価値が整理され、必要とする相手に届かなければ、取引にはつながりません。"
    >
      {/* 導入（lead の続き。InfoPage の lead は1段落しか置けないため本文側に書く） */}
      <div className="flex flex-col gap-3">
        <p className="text-[14px] leading-7 text-[var(--ink-2)]">
          NAKAMAは、商品を掲載して待つだけのサービスではありません。商品の強みや背景、価格・ロットなどの販売条件を整理し、買い手となり得る企業を探します。
          そして、候補企業への打診や商談準備まで行い、販路開拓を具体的に前へ進めます。
        </p>
        <p className="text-[14px] leading-7 text-[var(--ink-2)]">
          食品業界のネットワークを生かし、自社だけでは出会えなかった相手との接点をつくります。
        </p>
        <p className="text-[12px] leading-6 text-[var(--muted)]">
          ※売上や商談成立を保証するものではなく、調査・整理・候補先の選定・打診などの業務を行う準委任型のサービスです。
        </p>
      </div>

      {/* 入口商品1：商品・販路戦略セッション */}
      <section id="strategy-session" className="scroll-mt-6 rounded-[12px] border-2 border-[var(--green)] bg-white p-6">
        <h2 className="text-[20px] font-bold leading-7 text-[var(--ink)]">商品・販路戦略セッション</h2>
        <p className="mt-3 text-[13px] leading-7 text-[var(--ink-2)]">
          商品はあるものの、「誰に、どのように提案すればよいか」が整理できていない事業者向けの戦略設計サービスです。
          商品の特徴、価格、ロット、供給条件、現在の販売状況を確認し、優先して狙う市場と販路開拓の進め方を整理します。
        </p>

        <Block title="こんな方におすすめ"><List items={SESSION_FOR} /></Block>
        <Block title="実施する業務"><List items={SESSION_WORK} /></Block>
        <Block title="実施後に共有するもの"><List items={SESSION_DELIVERABLES} /></Block>
        <Block title="最終成果物">
          <p className="mt-2 text-[13px] font-semibold leading-6 text-[var(--ink)]">
            商品・販路戦略書（PDF／目安8〜12ページ）
          </p>
          <List items={SESSION_REPORT_CONTENTS} />
          <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
            準委任契約のため、業務遂行の結果を報告する資料として、「商品・販路戦略書」を作成し、PDF形式で共有します。
            本資料は、売上、商談、商品採用その他の成果を保証するものではありません。
          </p>
        </Block>
        <Block title="含まれないもの"><List items={SESSION_EXCLUDED} /></Block>

        <p className="mt-4 text-[12px] leading-6 text-[var(--muted)]">
          商品や販売条件が整った後は、「販路開拓トライアル」へ進むことができます。
        </p>
        <div className="mt-4">
          <Link href={consultationHref("strategy_session")} className={btn("primary", "lg")}>
            商品と販路について相談する
          </Link>
        </div>
        <p className="mt-4 text-[12px] leading-6 text-[var(--muted)]">
          目安の費用：110,000円〜（税込）
        </p>
      </section>

      {/* 入口商品2：販路開拓トライアル */}
      <section id="channel-trial" className="scroll-mt-6 rounded-[12px] border-2 border-[var(--green)] bg-white p-6">
        <h2 className="text-[20px] font-bold leading-7 text-[var(--ink)]">販路開拓トライアル</h2>
        <p className="mt-3 text-[13px] leading-7 text-[var(--ink-2)]">
          商品の販売条件と提案内容を整理し、買い手となり得る企業の調査・選定から、候補先への初期打診までを行う短期の販路開拓支援です。
          食品業界に特化した知見とFood Japan Summitで培ったネットワークを活用し、自社だけでは接点をつくりにくい相手へのアプローチを進めます。
        </p>

        <Block title="こんな方におすすめ"><List items={TRIAL_FOR} /></Block>
        <Block title="実施する業務"><List items={TRIAL_WORK} /></Block>
        <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
          候補企業数や打診先数は、商品、市場、契約範囲を確認したうえで個別に設定します。
        </p>
        <Block title="実施後に共有するもの"><List items={TRIAL_DELIVERABLES} /></Block>
        <Block title="含まれないもの"><List items={TRIAL_EXCLUDED} /></Block>

        <p className="mt-4 text-[12px] leading-6 text-[var(--muted)]">
          継続的な打診や商談支援が必要な場合は、終了後に「販路開拓伴走プラン」を提案します。
        </p>
        <div className="mt-4">
          <Link href={consultationHref("channel_trial")} className={btn("primary", "lg")}>
            自分の商品が対象になるか相談する
          </Link>
        </div>
        <p className="mt-4 text-[12px] leading-6 text-[var(--muted)]">
          目安の費用：440,000円〜（税込）／1商品・45日間
        </p>
      </section>

      {/* 共通の契約条件 */}
      <section className="rounded-[10px] border border-[var(--line)] bg-[var(--green-soft)] p-5">
        <h2 className="text-[15px] font-bold text-[var(--ink)]">共通の契約条件</h2>
        <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
          本サービスは、契約で定めた支援業務を一定期間実施する準委任型サービスです。売上、返信、面談、商談、商品採用、契約締結など、特定の成果を保証するものではありません。
          報酬は、調査、整理、候補先選定、打診、報告など、契約で定めた業務の遂行に対して発生します。
        </p>
        <h3 className="mt-4 text-[13px] font-bold text-[var(--ink)]">料金に「〜」を付ける理由</h3>
        <p className="mt-1 text-[13px] leading-7 text-[var(--ink-2)]">
          商品の種類、対象市場、調査範囲、打診先数、支援内容により料金が異なります。初回相談後に業務範囲、契約期間、報酬をご提示し、双方の合意に基づく契約締結後に支援を開始します。
        </p>
      </section>

      {/* 申込みから支援まで */}
      <section>
        <h2 className="text-[16px] font-bold text-[var(--ink)]">申込みから支援まで</h2>
        <ol className="mt-3 flex flex-col gap-2">
          {FLOW.map((t, i) => (
            <li key={t} className="flex items-start gap-3 rounded-[10px] border border-[var(--line)] bg-white px-4 py-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-[12px] font-bold text-white">
                {i + 1}
              </span>
              <span className="text-[13px] leading-6 text-[var(--ink-2)]">{t}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* この先の支援メニュー */}
      <section>
        <h2 className="text-[16px] font-bold text-[var(--ink)]">困りごとから選ぶ（NAKAMAサービスメニュー）</h2>
        <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
          価格は税込の提案値です。試作・検査・製造・物流・出張・制作・広告媒体費等は別途です。いずれも相談のうえ見積を提示し、個別契約のうえ開始します（自動決済はしません）。
        </p>
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-[var(--line)] bg-white">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--canvas)] text-[11px] text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">いま困っていること</th>
                <th className="px-4 py-3 font-medium">サービス</th>
                <th className="px-4 py-3 font-medium">やること（納品物）</th>
                <th className="px-4 py-3 font-medium">期間</th>
                <th className="px-4 py-3 font-medium">費用</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {SERVICE_MENU.map((s) => (
                <tr key={s.type} className="border-b border-[var(--line-soft)] last:border-b-0">
                  <td className="px-4 py-3 text-[var(--ink-2)]">{s.problem}</td>
                  <td className="px-4 py-3 font-semibold text-[var(--ink)]">
                    {s.href ? (
                      <Link href={s.href} className="underline decoration-dotted underline-offset-2">{s.name}</Link>
                    ) : (
                      s.name
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-2)]">{s.deliverable}</td>
                  <td className="px-4 py-3 text-[var(--ink-2)]">{s.period}</td>
                  <td className="px-4 py-3 font-semibold text-[var(--green-d)]">{s.price}</td>
                  <td className="px-4 py-3">
                    <Link href={consultationHref(s.type)} className={`${btn("secondary", "sm")} whitespace-nowrap`}>
                      相談する
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[12px] leading-6 text-[var(--muted)]">
        登録・掲載・応募は無料です（<Link href="/pricing" className="underline">利用料金</Link>）。
        詳細は<Link href="/terms" className="underline">利用規約</Link>・
        <Link href="/tokushoho" className="underline">特定商取引法に基づく表記</Link>をご確認ください。
      </p>
    </InfoPage>
  );
}
