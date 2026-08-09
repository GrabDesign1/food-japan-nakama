import Link from "next/link";
import { InfoPage } from "../_components/InfoPage";
import { JsonLd, PRODUCE_JSONLD } from "../_components/JsonLd";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "共創プロデュース｜FOOD JAPAN NAKAMA",
  description:
    "FOOD JAPANの担当者や専門家が、課題と資源を整理し、企画設計、共創相手の選定、面談、実証、事業化まで支援する個別支援サービスです。",
};

const STEPS = [
  { n: 1, t: "発掘", d: "商品、技術、地域資源、課題を整理します。" },
  { n: 2, t: "編集", d: "顧客と提供価値、事業コンセプトを設計します。" },
  { n: 3, t: "接続", d: "食品メーカー、小売、流通、飲食店、料理人、自治体、大学等から候補を選定します。" },
  { n: 4, t: "実装", d: "面談、役割整理、試作、テスト販売、実証、事業化を推進します。" },
];

const PRICING: { plan: string; content: string; deliverable: string; price: string }[] = [
  { plan: "共創テーマ設計", content: "ヒアリング、課題・資源・顧客・相手像の整理", deliverable: "共創テーマシート", price: "15万円〜" },
  { plan: "企画・実証設計", content: "事業企画、連携先、実証方法、概算収支の設計", deliverable: "共創企画書・実証計画", price: "40万円〜" },
  { plan: "継続プロデュース", content: "相手探し、打診、面談、交渉、進行管理、事業化支援", deliverable: "月次進捗・合意事項・実行管理", price: "月額30万円〜" },
  { plan: "成功報酬", content: "売上、契約、資金調達等の合意した成果", deliverable: "契約時に定義", price: "個別設定" },
];

const TARGETS = [
  "新商品・ブランド開発", "地域資源の商品化", "販路・販売先開拓",
  "生産者と食品企業の連携", "食品メーカーと小売・外食の連携", "規格外品・食品ロス活用",
  "自治体・大学・企業の地域プロジェクト", "テスト販売・実証イベント",
];

export default function ProducePage() {
  return (
    <InfoPage
      eyebrow="共創プロデュース"
      title="食の資源と課題を、動く事業に変える。"
      lead="新商品、ブランド、販路、地域事業を構想だけで終わらせず、適切な相手とつなぎ、実証と事業化まで進める個別支援です。人が入り、企画し、動かします。"
    >
      <JsonLd data={PRODUCE_JSONLD} />
      <div>
        <Link href="/consultation?type=produce" className={btn("primary", "lg")}>共創プロデュースを相談する</Link>
      </div>

      <section>
        <h2 className="font-serif text-[18px] text-[var(--ink)]">支援の4段階</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-3 rounded-[10px] border border-[var(--line)] bg-white p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--green)] text-[14px] font-bold text-white">{s.n}</span>
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--ink)]">{s.t}</h3>
                <p className="mt-1 text-[13px] leading-6 text-[var(--ink-2)]">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-[18px] text-[var(--ink)]">料金</h2>
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-[var(--line)] bg-white">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--green-soft)] text-left text-[12px] text-[var(--ink-2)]">
                <th className="px-4 py-3 font-medium">プラン</th>
                <th className="px-4 py-3 font-medium">内容</th>
                <th className="px-4 py-3 font-medium">成果物</th>
                <th className="px-4 py-3 text-right font-medium">料金（税抜）</th>
              </tr>
            </thead>
            <tbody>
              {PRICING.map((r) => (
                <tr key={r.plan} className="border-b border-[#EDF0EA] last:border-0">
                  <td className="px-4 py-3 font-medium text-[var(--ink)]">{r.plan}</td>
                  <td className="px-4 py-3 text-[var(--ink-2)]">{r.content}</td>
                  <td className="px-4 py-3 text-[var(--ink-2)]">{r.deliverable}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[var(--green-d)]">{r.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
          別途費用：クリエイティブ、パッケージ、広告制作、試作、調査、出張、物流、外部専門家。
          料金は「相談した時間」ではなく「決められたプロジェクトと成果物」に対して発生します。
        </p>
      </section>

      <section>
        <h2 className="font-serif text-[18px] text-[var(--ink)]">支援対象</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {TARGETS.map((t) => (
            <span key={t} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[12px] text-[var(--ink-2)]">{t}</span>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-6 text-[var(--muted)]">
          財務、人事、法務、食品認証などは必要に応じて専門家を紹介し、FOOD JAPANが専門判断を直接保証するものではありません。
        </p>
      </section>

      <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-6 text-center">
        <p className="text-[14px] font-semibold text-[var(--ink)]">自分たちだけでは進まない企画に、人が入る。</p>
        <div className="mt-3">
          <Link href="/consultation?type=produce" className={btn("primary")}>共創プロデュースを相談する</Link>
        </div>
      </div>
    </InfoPage>
  );
}
