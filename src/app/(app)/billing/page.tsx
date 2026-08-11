import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { PLANS, stripe } from "@/lib/stripe";
import { getCreditBalance } from "@/lib/contact-credits";
import { PlanButton } from "./_components/PlanButton";
import { PortalButton } from "./_components/PortalButton";
import { btn, eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";

// 正式サービスメニュー（最終実装指示 2026-08-10 §正式サービス。個別契約型は自動決済しない）
const SERVICE_MENU: { name: string; desc: string; price: string; type: string }[] = [
  { name: "販促プラン", desc: "SNS掲載、クーポン配信、アクセス分析", price: "月額33,000円", type: "promotion_plan" },
  { name: "販売強化プラン", desc: "特集制作、広告運用、販売企画、月次改善", price: "月額110,000円＋広告費", type: "sales_growth" },
  { name: "売れる仕組み構築", desc: "LP、動画、クラウドファンディング、EC、キャンペーン開発", price: "100万〜500万円", type: "solution_build" },
  { name: "販売成果報酬", desc: "NAKAMA経由で確認できる売上（個別契約で条件確定後に開始）", price: "売上の10〜20％", type: "success_fee" },
  { name: "共創・商品開発", desc: "相手探し、試作、販路、事業化", price: "300万〜1,000万円", type: "co_creation" },
];

// 購入履歴に出す注文の状態＝実際に支払いが成立したもの（返金済みは支払いの記録として残す）
const PURCHASED_STATUSES = ["paid", "fulfilled", "refunded"];

type HistoryRow = {
  key: string;
  date: Date;
  name: string;
  amount: number;
  status: string;
  refunded: boolean;
};

/**
 * ビジネス会員の月額の支払い履歴（Stripeの請求書）。
 * クーポンで0円になった請求も支払い済みとして返す（自社DBのbillingOrderには残らないため）。
 */
async function listPaidInvoices(customerId: string | null): Promise<HistoryRow[]> {
  if (!stripe || !customerId) return [];
  try {
    const res = await stripe.invoices.list({ customer: customerId, limit: 24 });
    return res.data
      .filter((inv) => inv.status === "paid")
      .map((inv) => ({
        key: `inv_${inv.id}`,
        date: new Date(inv.created * 1000),
        // 請求書の明細（英語まじりの自動生成文）ではなくプラン名で統一する。
        // Checkout(mode=payment)の単品購入は請求書を作らないため、ここに来るのは月額のみ。
        name: `${PLANS[0].name}（月額）`,
        amount: inv.amount_paid,
        status: "支払い済み",
        refunded: false,
      }));
  } catch (e) {
    // 履歴が出ないだけで画面は使えるようにする
    console.error("[billing] 請求書の取得に失敗:", e);
    return [];
  }
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "支払い待ち",
  paid: "支払い済み",
  fulfilled: "適用済み",
  payment_failed: "決済失敗",
  cancelled: "キャンセル",
  refunded: "返金済み",
};

/** 事務局へ依頼する（正式サービス。相談→見積→個別契約）。会員は上部、未加入は下部に置く。 */
function ServiceMenuSection() {
  return (
    <div className="max-w-[760px]">
      <h2 className={h2Cls}>事務局へ依頼する（個別契約）</h2>
      <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
        基本掲載は無料です。必要なところだけ、NAKAMA事務局が販促・販売企画・共創事業化まで伴走します。
        価格は税込の提案値で、個別契約が必要なサービスは「相談する」から事務局が要件確認・見積提示を行います（自動決済はしません）。
      </p>
      <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
        {SERVICE_MENU.map((s, i) => (
          <div
            key={s.name}
            className={`flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center ${i > 0 ? "border-t border-[var(--line)]" : ""}`}
          >
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[var(--ink)]">{s.name}</div>
              <div className="text-[12px] text-[var(--muted)]">{s.desc}</div>
            </div>
            <div className="shrink-0 text-[13px] font-semibold text-[var(--green-d)]">{s.price}</div>
            <Link
              href={`/consultation?type=service&service=${s.type}`}
              className={`${btn("secondary", "sm")} shrink-0`}
            >
              相談する
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; paid?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su!);
  const { success, paid } = await searchParams;

  const isMember = me.paymentStatus === "PAID";
  const plan = PLANS[0];

  const [balance, orders, invoices] = await Promise.all([
    getCreditBalance(me.id),
    prisma.billingOrder.findMany({
      // 支払いが成立したものだけを履歴に出す（Stripeへ行っただけの「支払い待ち」や
      // 失敗・キャンセルは購入していないため除外・2026-08-11 ユーザー指示）
      where: { memberId: me.id, status: { in: PURCHASED_STATUSES } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { items: { select: { name: true } } },
    }),
    listPaidInvoices(me.stripeCustomerId),
  ]);

  // 単品購入・掲載オプション（自社DB）と、ビジネス会員の月額（Stripeの請求書）を1つの履歴にまとめる。
  // クーポンで0円になった請求も「支払い済み」として残す。
  const history: HistoryRow[] = [
    ...orders.map((o) => ({
      key: o.id,
      date: o.createdAt,
      name: o.items.map((it) => it.name).join("、"),
      amount: o.totalAmount,
      status: ORDER_STATUS_LABEL[o.status] ?? o.status,
      refunded: o.status === "refunded",
    })),
    ...invoices,
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={eyebrowCls}>BILLING</p>
        <h1 className={h1Cls}>プラン・お支払い</h1>
      </div>

      {success || paid ? (
        <div className="max-w-[760px] rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-5 py-3 text-[14px] text-[var(--green-d)]">
          お支払いの手続きが完了しました。反映まで少し時間がかかる場合があります。
        </div>
      ) : null}

      {/* 無料で使えることの明示（有料を必須に見せない）。会員には不要なので出さない（2026-08-11 ユーザー指示） */}
      {isMember ? (
        <ServiceMenuSection />
      ) : (
        <div className="max-w-[760px] rounded-[10px] border border-[var(--line)] bg-white px-5 py-4">
          <p className="text-[13px] font-semibold text-[var(--ink)]">基本利用は無料です</p>
          <p className="mt-1 text-[12px] leading-6 text-[var(--ink-2)]">
            プロフィール登録、案件（売りたい（提供したい）／探している（調達したい）／共創パートナー募集）の掲載、閲覧、応募、問い合わせの送信は無料です。
            届いた問い合わせへの返信は、何往復でも無料です。有料になるのは、①売り手から「探している（調達したい）」案件への初回提案（紹介料）②掲載オプション（露出・通知）③事務局への依頼、の3つです。
          </p>
        </div>
      )}

      {/* 紹介クレジット残高 */}
      <div className="max-w-[760px] rounded-[10px] border border-[var(--line)] bg-white px-5 py-4">
        <h2 className={h2Cls}>紹介クレジット残高</h2>
        <div className="mt-2 flex flex-wrap gap-6 text-[13px]">
          <span>
            利用できるクレジット：<b className="text-[16px] text-[var(--green-d)]">{balance}</b> クレジット
          </span>
          {isMember ? (
            <span className="font-semibold text-[#A87F2F]">
              ビジネス会員：毎月50クレジットが自動付与されます（繰越なし）
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
          クレジットは「探している（調達したい）」案件への初回提案に使います。消費するのは、通常案件が1クレジット、NAKAMA確認済み案件が3クレジットです。
          1クレジット1,100円（税込）で、5・10クレジットのまとめ買いパックも同じ単価です。
          有償クレジットの有効期限は購入日から180日（期限の延長・再発行はありません）。ビジネス会員の月次クレジットは次回更新日で失効します。
          消費の順番は、月次クレジット→有償クレジット（いずれも期限が早い順）です。
          送信後14日間相手が未読の場合のみ、消費したクレジットを自動返還します（開封済みで返信がない場合、および有効期限が過ぎている場合は返還しません）。
        </p>
      </div>

      {/* NAKAMAビジネス会員プラン（ゴールド基調） */}
      <div className="max-w-[760px] rounded-[12px] border-2 border-[#C9A053] bg-[#FDF9EF] p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[15px] font-semibold text-[var(--ink)]">{plan.name}</div>
          {isMember ? (
            <span className="rounded-full bg-[#F7EED9] px-2.5 py-1 text-[10px] font-bold text-[#A87F2F]">
              ご契約中
            </span>
          ) : null}
        </div>
        <div className="mt-1 text-[11px] text-[var(--muted)]">{plan.tagline}</div>
        <div className="mt-2 font-serif text-[26px] text-[var(--ink)]">
          ¥{plan.amount!.toLocaleString()}
          <span className="text-[12px] text-[var(--muted)]">/月（税込）</span>
        </div>
        <ul className="mt-3 flex flex-col gap-1.5 text-[12px] text-[var(--ink-2)]">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-1.5">
              <span className="font-bold text-[#C9A053]">✓</span>
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-5">
          {isMember ? (
            <div>
              <p className="mb-2 text-[12px] text-[var(--muted)]">
                解約・領収書のダウンロード・お支払い方法の変更は、こちらから行えます。
              </p>
              <PortalButton />
            </div>
          ) : (
            <PlanButton planCode={plan.code} label={`月額¥${plan.amount!.toLocaleString()}（税込）で申し込む`} />
          )}
        </div>
        {!isMember ? (
          <div className="mt-4 rounded-[10px] border border-[var(--line)] bg-[var(--canvas)] px-4 py-3">
            <p className="text-[11px] leading-5 text-[var(--muted)]">
              ・自動更新契約です。初回は申込日に決済し、以後は1か月ごと（毎月、申込日と同じ日）に自動決済されます。
              解約は次回更新日の前日23:59（日本時間）までにこのページから手続きできます。日割り返金はありません。
              <br />
              ・会員でなくても、基本利用は無料のままご利用いただけます。
            </p>
          </div>
        ) : null}
      </div>

      {/* 事務局へ依頼する（正式サービス。相談→見積→個別契約）。会員のときは上部へ移動している */}
      {isMember ? null : <ServiceMenuSection />}

      {/* 購入履歴 */}
      <div className="max-w-[760px]">
        <h2 className={h2Cls}>購入履歴（ビジネス会員・掲載オプション・紹介クレジット）</h2>
        {history.length === 0 ? (
          <p className="mt-2 rounded-[10px] border border-dashed border-[var(--line)] bg-white p-5 text-[12px] text-[var(--muted)]">
            購入履歴はまだありません。
          </p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {history.map((h, i) => (
              <div
                key={h.key}
                className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[12px] ${i > 0 ? "border-t border-[var(--line)]" : ""}`}
              >
                <span className="text-[var(--muted)]">{h.date.toLocaleDateString("ja-JP")}</span>
                <span className="flex-1 font-medium text-[var(--ink)]">{h.name}</span>
                <span className="text-[var(--ink)]">¥{h.amount.toLocaleString()}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    h.refunded
                      ? "bg-[var(--red-soft)] text-[var(--red)]"
                      : "bg-[var(--green-soft)] text-[var(--green-d)]"
                  }`}
                >
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="max-w-[760px] text-[11px] leading-5 text-[var(--muted)]">
        ※ 有料オプションは表示機会を増やすサービスであり、閲覧数、問い合わせ、取引成立、売上を保証するものではありません。
        登録者同士が自ら行う通常取引について、NAKAMAは原則として売買手数料を徴収しません。
      </p>
    </div>
  );
}
