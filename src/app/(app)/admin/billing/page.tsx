// 事務局：課金管理（商品マスター・注文・掲載オプション審査・案内メール一斉送信・優良案件・クレジット台帳）。
import Link from "next/link";
import { requireAdmin, isSuperAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminNav } from "../_components/AdminNav";
import { btn, input } from "@/lib/ui";
import { aEyebrow, aH1, aH2 } from "../_components/adminUi";
import {
  adminSeedProducts,
  adminUpdateProduct,
  adminApprovePromotion,
  adminRejectPromotion,
  adminSendMatchedNotice,
  adminRejectMatchedNotice,
  adminMarkVerifiedLead,
  adminUnmarkVerifiedLead,
} from "../billing-actions";
import { ProductSaveForm } from "../_components/ProductSaveForm";

const inputCls =
  `${input("xs")} w-24`;

const ORDER_STATUS: Record<string, string> = {
  pending_payment: "支払い待ち",
  paid: "支払い済み",
  fulfilled: "適用済み",
  payment_failed: "決済失敗",
  cancelled: "キャンセル",
  refunded: "返金済み",
};

const PROMO_LABEL: Record<string, string> = {
  featured: "注目表示",
  top_pr: "最上部PR",
  urgent: "急募",
  private: "非公開募集",
  applicant_only: "応募者限定公開",
};

export default async function AdminBillingPage() {
  const su = await requireAdmin();
  const tenantId = su.app.tenantId;
  const isSuper = isSuperAdminRole(su.app.role);
  const now = new Date();

  const [products, orders, pendingPromos, activePromos, notices, verifiedLeads, wantListings, ledger] =
    await Promise.all([
      prisma.billingProduct.findMany({ where: { tenantId }, orderBy: { sortOrder: "asc" } }),
      prisma.billingOrder.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { items: { select: { name: true } } },
      }),
      prisma.listingPromotion.findMany({
        where: { tenantId, status: "pending_review" },
        orderBy: { createdAt: "asc" },
      }),
      prisma.listingPromotion.findMany({
        where: { tenantId, status: { in: ["active", "scheduled"] } },
        orderBy: { endsAt: "asc" },
        take: 30,
      }),
      prisma.matchedNotice.findMany({
        where: { tenantId, status: "pending_review" },
        orderBy: { createdAt: "asc" },
      }),
      prisma.offering.findMany({
        where: { direction: "WANT", verifiedLeadAt: { not: null }, member: { tenantId } },
        select: { id: true, title: true, verifiedLeadAt: true, verifiedLeadBy: true, verifiedLeadNote: true },
        orderBy: { verifiedLeadAt: "desc" },
      }),
      prisma.offering.findMany({
        where: { direction: "WANT", isPublic: true, title: { not: "" }, verifiedLeadAt: null, member: { tenantId } },
        select: { id: true, title: true, member: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.contactCreditLedger.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

  // プロモ・通知の案件タイトル
  const promoOfferingIds = Array.from(
    new Set([...pendingPromos, ...activePromos].map((p) => p.offeringId).concat(notices.map((n) => n.offeringId)))
  );
  const promoOfferings = promoOfferingIds.length
    ? await prisma.offering.findMany({
        where: { id: { in: promoOfferingIds } },
        select: { id: true, title: true },
      })
    : [];
  const titleMap = new Map(promoOfferings.map((o) => [o.id, o.title]));

  // 台帳の会員名
  const ledgerMemberIds = Array.from(new Set(ledger.map((l) => l.memberId)));
  const ledgerMembers = ledgerMemberIds.length
    ? await prisma.member.findMany({ where: { id: { in: ledgerMemberIds } }, select: { id: true, name: true } })
    : [];
  const memberNameMap = new Map(ledgerMembers.map((m) => [m.id, m.name]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className={aEyebrow}>ADMIN / BILLING</p>
        <h1 className={aH1}>課金管理</h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          商品の価格変更は過去の注文金額に影響しません（注文時スナップショット保存）。返金は Stripe ダッシュボードで実行すると注文へ自動同期されます。
        </p>
      </div>
      <AdminNav current="billing" />

      {/* 審査待ち（掲載オプション） */}
      <section>
        <h2 className={aH2}>審査待ちの掲載オプション（{pendingPromos.length}件）</h2>
        {pendingPromos.length === 0 ? (
          <p className="mt-2 text-[12px] text-[var(--muted)]">審査待ちはありません。</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {pendingPromos.map((p) => (
              <div key={p.id} className="rounded-[10px] border border-[var(--amber-line)] bg-[var(--amber-bg)] p-4">
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <b>{PROMO_LABEL[p.effectType] ?? p.effectType}</b>
                  <Link href={`/ledger/${p.offeringId}`} className="text-[var(--green-d)] underline">
                    {titleMap.get(p.offeringId) || p.offeringId}
                  </Link>
                  <span className="text-[11px] text-[var(--muted)]">
                    購入日 {p.createdAt.toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={adminApprovePromotion.bind(null, p.id)} className="flex items-center gap-2">
                    <input name="note" placeholder="メモ（任意）" className={`${inputCls} w-44`} />
                    <button className={btn("primary", "sm")}>承認して掲載開始</button>
                  </form>
                  {isSuper ? (
                    <form action={adminRejectPromotion.bind(null, p.id)} className="flex items-center gap-2">
                      <input name="note" required placeholder="否認理由（必須）" className={`${inputCls} w-44`} />
                      <button className={btn("danger", "sm")}>否認する</button>
                    </form>
                  ) : (
                    <span className="self-center text-[11px] text-[var(--muted)]">
                      否認（返金相当）は上位管理者のみ
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 案内メール一斉送信 */}
      <section>
        <h2 className={aH2}>案内メール一斉送信（審査待ち {notices.length}件）</h2>
        {notices.length === 0 ? (
          <p className="mt-2 text-[12px] text-[var(--muted)]">審査待ちはありません。</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {notices.map((n) => (
              <div key={n.id} className="rounded-[10px] border border-[var(--amber-line)] bg-[var(--amber-bg)] p-4">
                <div className="text-[13px]">
                  <Link href={`/ledger/${n.offeringId}`} className="text-[var(--green-d)] underline">
                    {titleMap.get(n.offeringId) || n.offeringId}
                  </Link>
                  <span className="ml-2 text-[11px] text-[var(--muted)]">
                    購入日 {n.createdAt.toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  送信対象：案内メール同意済みの承認会員（掲載者除く・最大100件）。送信は一度だけ実行されます。
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {isSuper ? (
                    <>
                      <form action={adminSendMatchedNotice.bind(null, n.id)}>
                        <button className={btn("primary", "sm")}>承認して送信する</button>
                      </form>
                      <form action={adminRejectMatchedNotice.bind(null, n.id)} className="flex items-center gap-2">
                        <input name="note" required placeholder="否認理由（必須）" className={`${inputCls} w-44`} />
                        <button className={btn("danger", "sm")}>否認する</button>
                      </form>
                    </>
                  ) : (
                    <span className="text-[11px] text-[var(--muted)]">
                      一斉送信・否認は上位管理者のみ実行できます
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 優良案件の確認 */}
      <section>
        <h2 className={aH2}>NAKAMA確認済み優良案件</h2>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          確認から30日で自動的に通常案件へ戻ります（再確認が必要）。確認の根拠（法人確認・数量・予算・期限・提案確認の意思など）を必ず記録してください。
        </p>
        {!isSuper ? (
          <p className="mt-2 rounded-md bg-[var(--canvas)] px-3 py-2 text-[11px] text-[var(--muted)]">
            この操作は提案時の消費クレジット（1→3クレジット＝1,100円→3,300円相当）を変えるため、上位管理者のみ実行できます。
          </p>
        ) : null}
        {verifiedLeads.length ? (
          <div className="mt-2 flex flex-col gap-2">
            {verifiedLeads.map((o) => {
              const expired =
                !!o.verifiedLeadAt && now.getTime() - o.verifiedLeadAt.getTime() > 30 * 24 * 60 * 60 * 1000;
              return (
                <div key={o.id} className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--line)] bg-white px-4 py-2.5 text-[12px]">
                  <Link href={`/ledger/${o.id}`} className="font-medium text-[var(--green-d)] underline">
                    {o.title || "（無題）"}
                  </Link>
                  <span className="text-[var(--muted)]">
                    確認 {o.verifiedLeadAt?.toLocaleDateString("ja-JP")}（{o.verifiedLeadBy}）
                  </span>
                  {expired ? <span className="rounded bg-[var(--red-soft)] px-2 py-0.5 text-[10px] text-[var(--red)]">期限切れ（要再確認）</span> : null}
                  {isSuper ? (
                    <form action={adminUnmarkVerifiedLead.bind(null, o.id)} className="ml-auto">
                      <button className={btn("secondary", "sm")}>解除</button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-[var(--muted)]">確認済みの案件はありません。</p>
        )}
        <h3 className="mt-4 text-[13px] font-semibold text-[var(--ink)]">公開中の「探している（調達したい）」案件（確認候補）</h3>
        <div className="mt-2 flex flex-col gap-2">
          {(isSuper ? wantListings : []).map((o) => (
            <form
              key={o.id}
              action={adminMarkVerifiedLead.bind(null, o.id)}
              className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--line)] bg-white px-4 py-2.5 text-[12px]"
            >
              <Link href={`/ledger/${o.id}`} className="font-medium text-[var(--green-d)] underline">
                {o.title || "（無題）"}
              </Link>
              <span className="text-[var(--muted)]">{o.member.name}</span>
              <input name="note" required placeholder="確認根拠（必須）" className={`${inputCls} ml-auto w-56`} />
              <button className={btn("secondary", "sm")}>優良案件として確認</button>
            </form>
          ))}
        </div>
      </section>

      {/* 適用中の掲載オプション */}
      <section>
        <h2 className={aH2}>適用中・予定の掲載オプション（{activePromos.length}件）</h2>
        {activePromos.length === 0 ? (
          <p className="mt-2 text-[12px] text-[var(--muted)]">適用中のオプションはありません。</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {activePromos.map((p, i) => (
              <div key={p.id} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 text-[12px] ${i > 0 ? "border-t border-[var(--line)]" : ""}`}>
                <b>{PROMO_LABEL[p.effectType] ?? p.effectType}</b>
                <Link href={`/ledger/${p.offeringId}`} className="text-[var(--green-d)] underline">
                  {titleMap.get(p.offeringId) || p.offeringId}
                </Link>
                <span className="text-[var(--muted)]">
                  {p.status === "scheduled" ? "開始予定" : "掲載中"}：
                  {p.startsAt?.toLocaleDateString("ja-JP")} 〜 {p.endsAt?.toLocaleDateString("ja-JP") ?? "無期限"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 注文一覧 */}
      <section>
        <h2 className={aH2}>注文（直近30件）</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-[12px] text-[var(--muted)]">注文はまだありません。</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {orders.map((o, i) => (
              <div key={o.id} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 text-[12px] ${i > 0 ? "border-t border-[var(--line)]" : ""}`}>
                <span className="text-[var(--muted)]">{o.createdAt.toLocaleString("ja-JP")}</span>
                <span className="font-medium">{memberNameMap.get(o.memberId) ?? o.memberId}</span>
                <span className="flex-1">{o.items.map((it) => it.name).join("、")}</span>
                <span>¥{o.totalAmount.toLocaleString()}</span>
                <span className="rounded-full bg-[var(--line)] px-2 py-0.5 text-[10px]">{ORDER_STATUS[o.status] ?? o.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* クレジット台帳 */}
      <section>
        <h2 className={aH2}>紹介クレジット台帳（直近30件）</h2>
        {ledger.length === 0 ? (
          <p className="mt-2 text-[12px] text-[var(--muted)]">記録はまだありません。</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {ledger.map((l, i) => (
              <div key={l.id} className={`flex flex-wrap items-center gap-3 px-4 py-2 text-[12px] ${i > 0 ? "border-t border-[var(--line)]" : ""}`}>
                <span className="text-[var(--muted)]">{l.createdAt.toLocaleString("ja-JP")}</span>
                <span className="font-medium">{memberNameMap.get(l.memberId) ?? l.memberId}</span>
                <span>{l.entryType}</span>
                <span>{l.creditType === "verified" ? "旧・優良枠" : "クレジット"}</span>
                <b className={l.quantity > 0 ? "text-[var(--green-d)]" : "text-[var(--red)]"}>
                  {l.quantity > 0 ? `+${l.quantity}` : l.quantity}
                </b>
                {l.note ? <span className="text-[var(--muted)]">{l.note}</span> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 商品マスター */}
      <section>
        <h2 className={aH2}>商品マスター（{products.length}件）</h2>
        {!isSuper ? (
          <p className="mt-1 text-[12px] text-[var(--muted)]">価格・公開状態の変更は上位管理者のみ行えます。</p>
        ) : null}
        {products.length === 0 ? (
          <div className="mt-2 rounded-[10px] border border-dashed border-[var(--line)] bg-white p-5">
            <p className="text-[12px] text-[var(--muted)]">
              商品マスターが未投入です。初期セットを投入してください（すべて非公開で投入されます。公開チェック後に有効化してください）。
            </p>
            {isSuper ? (
              <form action={adminSeedProducts} className="mt-3">
                <button className={btn("primary", "sm")}>初期商品セットを投入する</button>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-[10px] border border-[var(--line)] bg-white">
            <table className="w-full min-w-[760px] text-[12px]">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--green-soft)] text-left text-[11px] text-[var(--ink-2)]">
                  <th className="px-3 py-2 font-medium">商品</th>
                  <th className="px-3 py-2 font-medium">種別</th>
                  <th className="px-3 py-2 font-medium">対象</th>
                  <th className="px-3 py-2 font-medium">価格（税込）</th>
                  <th className="px-3 py-2 font-medium">会員割引%</th>
                  <th className="px-3 py-2 font-medium">公開</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--line-soft)] last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium text-[var(--ink)]">{p.name}</div>
                      <div className="text-[10px] text-[var(--muted)]">{p.code}</div>
                    </td>
                    <td className="px-3 py-2">{p.billingType}</td>
                    <td className="px-3 py-2">{p.audience}</td>
                    {isSuper ? (
                      <BillingProductRowForm key={`f-${p.id}`} p={p} />
                    ) : (
                      <>
                        <td className="px-3 py-2">¥{p.priceAmount.toLocaleString()}</td>
                        <td className="px-3 py-2">{p.memberDiscountPercent}%</td>
                        <td className="px-3 py-2">{p.active ? "公開" : "非公開"}</td>
                        <td className="px-3 py-2"></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// 商品行の編集フォーム（1行=1フォーム。tr内でformを使えないため、td内のformにform属性を使わずaction直付け）
function BillingProductRowForm({
  p,
}: {
  p: { id: string; priceAmount: number; memberDiscountPercent: number; active: boolean };
}) {
  const formId = `prod-${p.id}`;
  return (
    <>
      <td className="px-3 py-2">
        <input
          name="priceAmount"
          type="number"
          defaultValue={p.priceAmount}
          form={formId}
          className={inputCls}
        />
      </td>
      <td className="px-3 py-2">
        <input
          name="memberDiscountPercent"
          type="number"
          defaultValue={p.memberDiscountPercent}
          form={formId}
          className={`${input("xs")} w-16`}
        />
      </td>
      <td className="px-3 py-2">
        <input name="active" type="checkbox" defaultChecked={p.active} form={formId} className="accent-[var(--green)]" />
      </td>
      <td className="px-3 py-2">
        <ProductSaveForm formId={formId} action={adminUpdateProduct.bind(null, p.id)} />
      </td>
    </>
  );
}
