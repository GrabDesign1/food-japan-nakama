import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS, stripe } from "@/lib/stripe";
import { PlanButton } from "./_components/PlanButton";
import { PortalButton } from "./_components/PortalButton";
import { eyebrowCls, h1Cls } from "@/lib/ui";

const PAY_LABEL: Record<string, { label: string; cls: string }> = {
  FREE: { label: "無料", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
  UNPAID: { label: "未決済", cls: "bg-[var(--red-soft)] text-[var(--red)]" },
  PAID: { label: "課金中", cls: "bg-[var(--green-soft)] text-[var(--green-d)]" },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const member = su.app.memberId
    ? await prisma.member.findUnique({ where: { id: su.app.memberId }, select: { paymentStatus: true, status: true } })
    : null;
  const { success } = await searchParams;

  const pay = member ? PAY_LABEL[member.paymentStatus] ?? PAY_LABEL.FREE : PAY_LABEL.FREE;
  const isPaid = member?.paymentStatus === "PAID";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={eyebrowCls}>BILLING</p>
        <h1 className={h1Cls}>プラン・お支払い</h1>
      </div>

      {success ? (
        <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-5 py-3 text-[14px] text-[var(--green-d)]">
          お支払いの手続きが完了しました。反映まで少し時間がかかる場合があります。
        </div>
      ) : null}

      {/* 現在の状態 */}
      <div className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] bg-white px-5 py-4">
        <span className="text-[13px] text-[var(--muted)]">現在の課金状態</span>
        <span className={`rounded-full px-3 py-1 text-[12px] ${pay.cls}`}>{pay.label}</span>
        {member?.status === "AWAITING_PAYMENT" ? (
          <span className="text-[12px] text-[#B77F0B]">事務局よりお支払いのご案内が届いています。下記からお手続きください。</span>
        ) : null}
      </div>

      {isPaid ? (
        <div className="rounded-[10px] border border-[var(--line)] bg-white px-5 py-4">
          <p className="mb-2 text-[12px] text-[var(--muted)]">
            解約・領収書のダウンロード・お支払い方法の変更は、こちらから行えます。
          </p>
          <PortalButton />
        </div>
      ) : null}

      {!stripe ? (
        <div className="rounded-[10px] border border-dashed border-[var(--line)] bg-white p-4 text-[12px] text-[var(--muted)]">
          ※ 現在オンライン決済（Stripe）は準備中です。設定が完了すると、下記のプランからお支払いいただけます。銀行振込をご希望の場合は事務局までご連絡ください。
        </div>
      ) : null}

      {/* プラン */}
      <div className="grid max-w-[760px] gap-4 sm:grid-cols-2">
        {PLANS.map((p) => {
          const paid = p.amount != null && p.amount > 0;
          // このカードが利用者の「現在のプラン」か（有料枠は課金中なら現在、無料枠は未課金なら現在）
          const isCurrent = paid ? isPaid : !isPaid;
          return (
            <div key={p.code} className={`relative flex flex-col rounded-[12px] border bg-white p-6 ${paid ? "border-[var(--green)]" : "border-[var(--line)]"}`}>
              {isCurrent ? (
                <span className="absolute right-4 top-4 rounded-full bg-[var(--green-soft)] px-2.5 py-1 text-[10px] font-medium text-[var(--green-d)]">
                  現在のプラン
                </span>
              ) : null}
              <div className="text-[15px] font-semibold text-[var(--ink)]">{p.name}</div>
              {p.tagline ? <div className="mt-0.5 text-[11px] text-[var(--muted)]">{p.tagline}</div> : null}
              <div className="mt-2 font-serif text-[26px] text-[var(--ink)]">
                {p.amount == null ? "個別見積" : p.amount === 0 ? "¥0" : `¥${p.amount.toLocaleString()}`}
                {paid ? <span className="text-[12px] text-[var(--muted)]">/{p.unit}（税別）</span> : null}
              </div>
              <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-[12px] text-[var(--ink-2)]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-1.5"><span className="text-[var(--green)]">✓</span>{f}</li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <div className="rounded-md border border-[var(--green)] bg-[var(--green-soft)] py-2 text-center text-[12px] font-medium text-[var(--green-d)]">
                    現在ご利用中のプラン
                  </div>
                ) : paid ? (
                  <PlanButton planCode={p.code} label="アップグレードする" />
                ) : (
                  <div className="rounded-md bg-[var(--canvas)] py-2 text-center text-[12px] text-[var(--muted)]">無料プラン</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--muted)]">
        ※ 価格は税別です。自治体・JA・大学など請求書払いをご希望の場合は、事務局が個別に対応します（銀行振込・年額可）。協賛プランとの併用も可能です。
      </p>
    </div>
  );
}
