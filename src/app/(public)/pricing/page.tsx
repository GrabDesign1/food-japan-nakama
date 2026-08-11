import Link from "next/link";
import { InfoPage } from "../_components/InfoPage";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "利用料金・共創支援｜FOOD JAPAN NAKAMA",
  description:
    "登録・案件の掲載・閲覧・応募・問い合わせ・届いた問い合わせへの返信は無料（月額契約は不要）。有料は、売り手から「探している」案件への初回提案（紹介料1,100円〜）、掲載オプション、事務局への個別依頼のみ。NAKAMAビジネス会員（月額22,000円・税込）は任意です。",
};

// 正式サービスメニュー（最終実装指示 2026-08-10。価格は税込の提案値・個別契約が必要なサービスは相談から）
const SUPPORT_MENU: { name: string; desc: string; price: string }[] = [
  { name: "NAKAMA登録", desc: "商品・会社・募集情報の掲載", price: "無料" },
  { name: "販促プラン", desc: "SNS掲載、クーポン配信、アクセス分析", price: "月額33,000円" },
  { name: "販売強化プラン", desc: "特集制作、広告運用、販売企画、月次改善", price: "月額110,000円＋広告費" },
  { name: "売れる仕組み構築", desc: "LP、動画、クラウドファンディング、EC、キャンペーン開発", price: "100万〜500万円" },
  { name: "販売成果報酬", desc: "NAKAMA経由で確認できる売上（個別契約で条件確定後に開始）", price: "売上の10〜20％" },
  { name: "共創・商品開発", desc: "相手探し、試作、販路、事業化", price: "300万〜1,000万円" },
];

// 掲載オプション（案件を目立たせる・届ける。ログイン後に案件ごとに購入）
const LISTING_OPTIONS: { name: string; price: string }[] = [
  { name: "注目表示（7日間）", price: "5,500円〜11,000円" },
  { name: "最上部PR（7日間）", price: "22,000円" },
  { name: "急募ラベル・急募表示（7日間）", price: "3,300円〜5,500円" },
  { name: "案内メール一斉送信（同意者・最大100件）", price: "11,000円" },
  { name: "非公開募集（30日）", price: "22,000円" },
  { name: "応募者限定公開（30日）", price: "11,000円" },
];

export default function PricingPage() {
  return (
    <InfoPage
      eyebrow="PRICING"
      title="利用料金・共創支援"
      lead="登録・掲載・応募は無料です。事務局が動く共創支援は、内容に応じて個別に契約します。"
    >
      {/* 無料利用 */}
      <section className="rounded-[12px] border border-[var(--green)] bg-white p-6">
        <div className="text-[13px] text-[var(--muted)]">無料利用</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-serif text-[38px] text-[var(--green-d)]">0</span>
          <span className="text-[14px] text-[var(--ink-2)]">円</span>
        </div>
        <ul className="mt-3 flex flex-col gap-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
          <li>・プロフィール登録</li>
          <li>・案件（売りたい（提供したい）／探している（調達したい）／共創パートナー募集）の閲覧・登録</li>
          <li>・応募・問い合わせ</li>
          <li>・問い合わせの送信・受信と、<b>届いた問い合わせへの返信（何往復でも無料）</b></li>
        </ul>
        <p className="mt-3 text-[12px] leading-6 text-[var(--muted)]">
          無料登録にクレジットカードは必要ありません。無料範囲には、事務局による個別探索、推薦、原稿制作、SNS掲載保証、商談同席、交渉を含みません。
          売り手から「探している（調達したい）」案件への初回提案のみ、紹介料（紹介クレジットで支払い。通常案件1クレジット＝1,100円・NAKAMA確認済み案件3クレジット＝3,300円。5・10クレジットのまとめ買いパックもあります）がかかります。同じ案件・同じ相手との継続メッセージと、受けた問い合わせへの返信は何往復でも無料です。
        </p>
        <div className="mt-4">
          <Link href="/signup" className={btn("primary", "lg")}>無料で登録する</Link>
        </div>
      </section>

      {/* 月額会員 */}
      <section className="rounded-[12px] border-2 border-[#C9A053] bg-[#FDF9EF] p-6">
        <div className="text-[13px] font-bold text-[#A87F2F]">NAKAMAビジネス会員（任意）</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-serif text-[32px] text-[var(--ink)]">22,000</span>
          <span className="text-[14px] text-[var(--ink-2)]">円 / 月（税込）</span>
        </div>
        <ul className="mt-3 flex flex-col gap-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
          <li>・<b>毎月50クレジット</b>（「探している（調達したい）」案件への初回提案に使えます。翌月への繰越はありません）</li>
          <li>・提案1件の消費は<b>通常案件1クレジット・NAKAMA確認済み案件3クレジット</b></li>
          <li>・<b>1クレジットあたり440円</b>（都度購入は1クレジット1,100円。使い切ると<b>55,000円相当</b>）</li>
          <li>・追加の紹介クレジット（単品購入）が20%割引</li>
          <li>・掲載オプションが20%割引</li>
          <li>・Food Japan Summit ネットワークとの接点</li>
        </ul>
        <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
          NAKAMA確認済み案件は1件につき3クレジットを消費します。未使用分の翌月への繰越はありません。パック（5・10クレジット）は会員割引の対象外です。
        </p>
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          会員でなくても基本利用は無料です。お申し込みはログイン後の「プラン・お支払い」から。
        </p>
      </section>

      {/* 掲載オプション */}
      <section>
        <h2 className="text-[16px] font-bold text-[var(--ink)]">掲載オプション（案件を目立たせる・届ける）</h2>
        <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
          基本掲載は無料のまま、必要なときだけ追加できます（税込・案件ごと。有料枠には「広告」表記がつきます。成果を保証するものではありません）。
        </p>
        <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
          {LISTING_OPTIONS.map((o, i) => (
            <div
              key={o.name}
              className={`flex items-center justify-between px-5 py-2.5 text-[13px] ${i > 0 ? "border-t border-[var(--line)]" : ""}`}
            >
              <span className="text-[var(--ink)]">{o.name}</span>
              <span className="font-semibold text-[var(--green-d)]">{o.price}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 個別支援 */}
      <section>
        <h2 className="text-[16px] font-bold text-[var(--ink)]">事務局へ依頼する（NAKAMAサービスメニュー）</h2>
        <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
          基本掲載は無料です。必要なところだけ、NAKAMA事務局が販促・販売企画・共創事業化まで伴走します。
          価格は税込の提案値で、内容や規模により変動します。試作・検査・製造・物流・出張・制作・広告媒体費等は別途です。個別契約が必要なサービスは、相談のうえ見積を提示します（自動決済はしません）。
        </p>
        <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
          {SUPPORT_MENU.map((s, i) => (
            <div
              key={s.name}
              className={`flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between ${i > 0 ? "border-t border-[var(--line)]" : ""}`}
            >
              <div>
                <div className="text-[14px] font-semibold text-[var(--ink)]">{s.name}</div>
                <div className="text-[12px] text-[var(--muted)]">{s.desc}</div>
              </div>
              <div className="shrink-0 text-[14px] font-semibold text-[var(--green-d)]">{s.price}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/consultation?type=theme" className={btn("primary", "lg")}>共創テーマを相談する</Link>
        </div>
      </section>

      {/* 手数料の考え方 */}
      <div className="rounded-[10px] border border-[var(--line)] bg-[var(--green-soft)] p-5 text-[13px] leading-7 text-[var(--ink-2)]">
        登録者同士が自ら行う取引について、NAKAMAは原則として売買手数料を徴収しません。
        事務局へ調査、相手探し、企画、商談調整、実証、制作等を依頼する場合は、業務範囲を確認したうえで個別に契約します。
      </div>

      <p className="text-[12px] leading-6 text-[var(--muted)]">
        共創プロデュースの詳細は<Link href="/produce" className="underline">共創プロデュース</Link>ページ、
        クラウドファンディング支援は<Link href="/crowdfunding" className="underline">クラファン支援</Link>ページをご覧ください。
        詳細は<Link href="/terms" className="underline">利用規約</Link>・
        <Link href="/tokushoho" className="underline">特定商取引法に基づく表記</Link>をご確認ください。
      </p>
    </InfoPage>
  );
}
