// 掲載オプション選択（おすすめセット→4分類。無料公開の導線は隠さない）。
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { discountedUnitAmount } from "@/lib/billing-core";
import { getActiveEffectsFor } from "@/lib/billing";
import { btn, eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";
import { BuyOptionButton } from "./BuyOptionButton";

const EFFECT_LABEL: Record<string, string> = {
  featured: "注目表示",
  top_pr: "最上部PR",
  urgent: "急募",
  private: "非公開募集",
  applicant_only: "応募者限定公開",
};

export default async function ListingOptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const { paid } = await searchParams;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su!);

  const offering = await prisma.offering.findFirst({
    where: { id, memberId: me.id },
    select: { id: true, title: true, direction: true, isPublic: true },
  });
  if (!offering) notFound();

  const audience = offering.direction === "GIVE" ? "sell" : "seek";
  const isMember = me.paymentStatus === "PAID";

  const [products, effectsMap, optInCount] = await Promise.all([
    prisma.billingProduct.findMany({
      where: { active: true, audience: { in: [audience, "both"] } },
      orderBy: { sortOrder: "asc" },
    }),
    getActiveEffectsFor([offering.id]),
    // 条件一致通知の予定件数（案内メール同意者のみ・自社を除く）
    prisma.user.count({
      where: {
        tenantId: su!.app.tenantId,
        marketingOptInAt: { not: null },
        status: "ACTIVE",
        member: { status: "APPROVED", id: { not: me.id } },
      },
    }),
  ]);

  const activeEffects = effectsMap.get(offering.id) ?? new Set<string>();
  const price = (p: { priceAmount: number; memberDiscountPercent: number }) =>
    discountedUnitAmount(p.priceAmount, p.memberDiscountPercent, isMember);

  const oneTime = products.filter((p) => p.billingType === "one_time");
  const bundles = oneTime.filter((p) => p.effectType === "bundle");
  const highlight = oneTime.filter((p) => ["featured", "top_pr", "urgent"].includes(p.effectType));
  const reach = oneTime.filter((p) => p.effectType === "matched_notice");
  const restrict = oneTime.filter((p) => ["private", "applicant_only"].includes(p.effectType));
  const quotes = products.filter((p) => p.billingType === "quote");

  const card = (p: (typeof products)[number], extra?: React.ReactNode) => {
    const discounted = price(p);
    const dup = p.effectType !== "bundle" && activeEffects.has(p.effectType);
    return (
      <div key={p.code} className="flex flex-col rounded-[10px] border border-[var(--line)] bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[14px] font-bold text-[var(--ink)]">{p.name}</div>
          {p.requiresReview ? (
            <span className="shrink-0 rounded bg-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--ink-2)]">審査あり</span>
          ) : null}
        </div>
        {p.description ? (
          <p className="mt-1 flex-1 text-[12px] leading-5 text-[var(--muted)]">{p.description}</p>
        ) : null}
        <div className="mt-2 text-[14px] font-semibold text-[var(--green-d)]">
          {discounted < p.priceAmount ? (
            <>
              <span className="mr-1 text-[12px] font-normal text-[var(--muted)] line-through">
                ¥{p.priceAmount.toLocaleString()}
              </span>
              ¥{discounted.toLocaleString()}
              <span className="ml-1 rounded bg-[#F7EED9] px-1 py-0.5 text-[10px] font-bold text-[#A87F2F]">Premium会員20%OFF</span>
            </>
          ) : (
            <>¥{discounted.toLocaleString()}</>
          )}
          <span className="ml-1 text-[11px] font-normal text-[var(--muted)]">
            税込{p.durationDays ? `・${p.durationDays}日間` : ""}
            {p.unitLimit && p.effectType === "matched_notice" ? `・最大${p.unitLimit}件` : ""}
          </span>
        </div>
        {dup ? (
          <p className="mt-1 rounded bg-[#FFFBF0] px-2 py-1 text-[11px] text-[#7A5A0B]">
            ⚠ 「{EFFECT_LABEL[p.effectType] ?? p.effectType}」は現在適用中です。追加購入すると期間が延長されます。
          </p>
        ) : null}
        {extra}
        <BuyOptionButton offeringId={offering.id} code={p.code} label="購入する（Stripe決済へ）" />
      </div>
    );
  };

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div>
        <p className={eyebrowCls}>OPTIONS</p>
        <h1 className={h1Cls}>有料オプションを追加する</h1>
        <p className="mt-1 text-[13px] text-[var(--ink-2)]">
          対象案件：<b>{offering.title || "（無題）"}</b>
        </p>
      </div>

      {paid ? (
        <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-5 py-3 text-[13px] text-[var(--green-d)]">
          お支払いを確認しました。掲載オプションの状態はこのページと「プラン・お支払い」で確認できます。
          審査ありの商品は、内容を確認後に掲載開始日をお知らせします。
        </div>
      ) : null}

      {/* 無料導線を隠さない */}
      <div className="rounded-[10px] border border-[var(--line)] bg-[var(--green-soft)] px-5 py-3 text-[13px] text-[var(--ink-2)]">
        基本掲載は<b>無料</b>です。より早く、より多くの相手へ届けたい場合は、有料オプションを追加できます。
        {!offering.isPublic ? (
          <Link href={`/ledger/${offering.id}/edit`} className="ml-2 text-[var(--green-d)] underline">
            無料で公開する（編集画面へ）→
          </Link>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
          現在、購入できるオプションはありません（準備中）。事務局にご相談ください。
        </div>
      ) : null}

      {/* おすすめセット（先に表示） */}
      {bundles.length ? (
        <section>
          <h2 className={h2Cls}>おすすめセット</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">{bundles.map((p) => card(p))}</div>
        </section>
      ) : null}

      {/* 個別にオプションを選ぶ */}
      {highlight.length ? (
        <section>
          <h2 className={h2Cls}>1. 目立たせる</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">{highlight.map((p) => card(p))}</div>
        </section>
      ) : null}

      {reach.length ? (
        <section>
          <h2 className={h2Cls}>2. 条件に合う相手へ届ける</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {reach.map((p) =>
              card(
                p,
                <p key="count" className="mt-1 text-[11px] text-[var(--ink-2)]">
                  現在の配信予定：<b>{Math.min(optInCount, p.unitLimit ?? 100)}件</b>
                  （案内メールに同意した会員のみ。審査後に送信します）
                </p>
              )
            )}
          </div>
        </section>
      ) : null}

      {restrict.length ? (
        <section>
          <h2 className={h2Cls}>3. 情報を限定する</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">{restrict.map((p) => card(p))}</div>
        </section>
      ) : null}

      {quotes.length ? (
        <section>
          <h2 className={h2Cls}>4. NAKAMA事務局へ依頼する（相談・個別見積）</h2>
          <div className="mt-2 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {quotes.map((p, i) => (
              <div
                key={p.code}
                className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center ${i > 0 ? "border-t border-[var(--line)]" : ""}`}
              >
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[var(--ink)]">{p.name}</div>
                  {p.description ? <div className="text-[11px] text-[var(--muted)]">{p.description}</div> : null}
                </div>
                <div className="shrink-0 text-[13px] font-semibold text-[var(--green-d)]">
                  ¥{p.priceAmount.toLocaleString()}〜
                </div>
                <Link href="/consultation" className={`${btn("secondary", "sm")} shrink-0`}>
                  相談する
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            相談フォームの「解決したい課題」欄に、対象案件名「{offering.title || "（無題）"}」をご記入ください。
          </p>
        </section>
      ) : null}

      <p className="text-[11px] leading-5 text-[var(--muted)]">
        ・有料オプションは表示機会を増やすサービスであり、閲覧数、問い合わせ、取引成立、売上を保証するものではありません。
        <br />
        ・決済の確定後に掲載効果を適用します（審査ありの商品は、支払い済み・審査待ちとなります）。
        <br />
        ・キャンセル・返金：掲載開始前は原則キャンセル申請が可能です。掲載開始後は原則返金しません（NAKAMA側の事情で提供できない場合は全額または未提供分を返金します）。審査で否認された場合は全額返金します。
        <br />
        ・購入により<Link href="/terms" className="underline">利用規約</Link>に同意したものとみなします。
      </p>
    </div>
  );
}
