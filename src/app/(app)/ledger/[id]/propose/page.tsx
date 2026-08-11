// 「探している（調達したい）」案件への提案ページ（初回紹介料の説明・クレジット残高・購入・提案送信）。
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { getCreditBalance } from "@/lib/contact-credits";
import { pricingTierFor, isVerifiedLeadActive, creditCostFor } from "@/lib/billing-core";
import { discountedUnitAmount } from "@/lib/billing-core";
import { eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";
import {
  SEEKING_TYPE_LABEL,
  REQUIREMENT_KIND_LABEL,
  REQUIREMENT_LEVEL_LABEL,
  formatPrice,
  formatAmount,
  formatDeadline,
} from "@/lib/offering-taxonomy";
import { ProposeForm } from "./ProposeForm";
import { OfferingDetailModal, type OfferingDetailData } from "./OfferingDetailModal";
import { FeeNotice } from "./FeeNotice";

// レンダー中のDate.now直呼びをlintが禁止しているため関数に切り出す
function isPastDeadline(d: Date | null): boolean {
  return !!d && d.getTime() < Date.now();
}

export default async function ProposePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const { paid } = await searchParams;
  const su = await getSessionUser();
  if (!su) redirect(`/login?next=${encodeURIComponent(`/ledger/${id}/propose`)}`);
  const me = await getOrCreateMemberForUser(su!);

  const offering = await prisma.offering.findFirst({
    where: {
      id,
      direction: "WANT",
      isPublic: true,
      title: { not: "" },
      // 非公開募集（有料オプション）は詳細ページと同じく存在ごと見せない
      visibility: { not: "private" },
      member: { tenantId: su!.app.tenantId, status: "APPROVED" },
    },
    include: {
      member: { select: { id: true, name: true } },
      requirements: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!offering || offering.memberId === me.id) notFound();

  // 応募者限定公開：掲載者が返信するまで社名を伏せる（この画面は提案前なので常に非開示）
  const memberDisplayName =
    offering.visibility === "applicant_only" ? "非公開（提案・承認後に開示）" : offering.member.name;

  const deadlinePassed = isPastDeadline(offering.applicationDeadline);

  const isMember = me.paymentStatus === "PAID";
  const verified = isVerifiedLeadActive(offering.verifiedLeadAt, new Date());
  const tier = pricingTierFor(offering.verifiedLeadAt, new Date());

  // 価格は商品マスターから（無効なら購入ボタンを出さない）。独立クエリは並列化（直列3往復→1往復）
  const codes = ["contact_unlock_standard", "contact_unlock_verified_lead", "contact_credits_5", "contact_credits_10"];
  const [existingUnlock, balance, products] = await Promise.all([
    prisma.contactUnlock.findUnique({
      where: { sellerMemberId_offeringId: { sellerMemberId: me.id, offeringId: offering.id } },
      select: { threadId: true },
    }),
    getCreditBalance(me.id),
    prisma.billingProduct.findMany({ where: { code: { in: codes }, active: true } }),
  ]);
  const creditCost = creditCostFor(tier);

  // 対象案件の要点（ヘッダー表示とモーダルで共用）
  const listingPrice = formatPrice(offering);
  const amount = formatAmount(offering);
  const deadlineText = formatDeadline(offering.applicationDeadline);
  const facts: [string, string][] = (
    [
      ["希望価格", listingPrice],
      ["必要数量", amount],
      ["最小取引量", offering.minOrderText],
      ["希望する納品時期", offering.timing],
      ["発送先・受取地域", offering.area],
      ["募集期限", deadlineText],
    ] as [string, string | null][]
  ).filter((r): r is [string, string] => !!r[1]);
  const detailData: OfferingDetailData = {
    title: offering.title,
    description: offering.description,
    usageContext: offering.usageContext,
    points: offering.points,
    seekingTypeLabel: offering.seekingType ? SEEKING_TYPE_LABEL[offering.seekingType] ?? null : null,
    category: offering.category,
    memberName: memberDisplayName,
    facts,
    requirements: offering.requirements.map((r) => ({
      kindLabel: REQUIREMENT_KIND_LABEL[r.kind] ?? r.kind,
      text: r.text,
      levelLabel: REQUIREMENT_LEVEL_LABEL[r.level] ?? r.level,
      level: r.level,
    })),
    tags: offering.tags,
  };
  const productMap = new Map(products.map((p) => [p.code, p]));
  // 単品はこの案件に必要な分（通常＝1クレジット／確認済み＝3クレジット）を1回で購入できる商品を出す。
  // クレジットは1種類なので、パックはどちらの案件でも購入できる。
  const singleCode = tier === "verified_lead" ? "contact_unlock_verified_lead" : "contact_unlock_standard";
  const single = productMap.get(singleCode);
  const pack5 = productMap.get("contact_credits_5");
  const pack10 = productMap.get("contact_credits_10");

  const price = (p: { priceAmount: number; memberDiscountPercent: number } | undefined) =>
    p ? discountedUnitAmount(p.priceAmount, p.memberDiscountPercent, isMember) : null;

  // ビジネス会員もクレジットを消費する（毎月50クレジット付与）。無料で送れるのは解放済みの案件だけ。
  const canSendFree = !!existingUnlock;

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6">
      <div>
        <p className={eyebrowCls}>PROPOSE</p>
        <h1 className={h1Cls}>この募集へ提案する</h1>
      </div>

      {/* 対象案件（提案の前に何を求められているかが分かるよう、概要と条件を出す） */}
      <div className="rounded-[12px] border-2 border-[var(--green)] bg-[var(--green-soft)] p-5">
        <div className="flex flex-wrap items-center gap-2">
          {verified ? (
            <span className="rounded-full bg-[var(--green)] px-2.5 py-1 text-[11px] font-bold text-white">
              NAKAMA確認済み優良案件
            </span>
          ) : null}
          <span className="rounded bg-[#B77F0B] px-2 py-0.5 text-[10px] font-bold text-white">探している</span>
          <span className="text-[11px] text-[var(--muted)]">
            {offering.category}
            {detailData.seekingTypeLabel ? `　/　${detailData.seekingTypeLabel}` : ""}
          </span>
        </div>

        <h2 className="mt-2 text-[20px] font-bold leading-7 text-[var(--ink)]">{offering.title}</h2>
        <div className="mt-1 text-[12px] text-[var(--ink-2)]">掲載者：{memberDisplayName}</div>

        {offering.description ? (
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[var(--ink-2)]">
            {offering.description.length > 160
              ? `${offering.description.slice(0, 160)}…`
              : offering.description}
          </p>
        ) : null}

        {facts.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {facts.slice(0, 4).map(([k, v]) => (
              <span
                key={k}
                className="rounded-full border border-[var(--green)] bg-white px-3 py-1 text-[12px] text-[var(--ink)]"
              >
                <span className="text-[var(--muted)]">{k}：</span>
                <b>{v}</b>
              </span>
            ))}
          </div>
        ) : null}

        {deadlinePassed ? (
          <p className="mt-2 text-[12px] font-bold text-[var(--red)]">この案件は募集を終了しています。</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <OfferingDetailModal data={detailData} />
          <Link href={`/ledger/${offering.id}`} className="text-[11px] text-[var(--muted)] underline">
            案件ページを開く
          </Link>
        </div>
      </div>

      {paid ? (
        <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-5 py-3 text-[13px] text-[var(--green-d)]">
          お支払いを確認しました。クレジットの反映まで数十秒かかる場合があります（下の残高をご確認ください）。
        </div>
      ) : null}

      {deadlinePassed ? (
        <div className="rounded-[10px] border border-[var(--line)] bg-white p-5 text-[13px] text-[var(--muted)]">
          この案件は募集を終了しています。新しい提案は送信できません。
        </div>
      ) : (
        <>
          {/* 料金と条件の事前明示。初回は開いた状態、2回目以降は畳んで表示する */}
          <FeeNotice
            summary={
              canSendFree ? (
                <span className="font-semibold text-[var(--green-d)]">
                  この案件は解放済みです（継続メッセージ無料）
                </span>
              ) : (
                <>
                  <span>
                    この案件の紹介料：
                    <b className="text-[var(--green-d)]">{creditCost}クレジット</b>
                  </span>
                  <span className="text-[var(--muted)]">
                    残高：{balance}クレジット
                    {isMember ? "（ビジネス会員：毎月50クレジット付与・繰越なし）" : ""}
                  </span>
                </>
              )
            }
          >
            <ul className="flex flex-col gap-1 text-[12px] leading-6 text-[var(--ink-2)]">
              <li>・この案件への<b>最初の提案メッセージ</b>に紹介料（{creditCost}クレジット）がかかります。</li>
              <li>・同じ案件・同じ相手との<b>継続メッセージは無料</b>です。</li>
              <li>・買い手から問い合わせを受けた場合の返信に、紹介料はかかりません。</li>
              <li>・紹介料はメッセージ送信と連絡経路の解放に対する料金で、<b>返信・商談・成約を保証しません</b>。</li>
              <li>・送信後<b>14日間相手が一度も開封しなかった場合のみ</b>、消費したクレジットを自動返還します（開封済みで返信がない場合は返還しません）。</li>
              <li>・有償クレジットの有効期限は<b>購入日から180日</b>です。期限を過ぎたクレジットは失効し、未読返還の対象にもなりません（期限の延長・再発行は行いません）。</li>
            </ul>
          </FeeNotice>

          {/* クレジット購入（残高がない場合の導線。無料導線は隠さない） */}
          {!canSendFree ? (
            <div className="rounded-[10px] border border-[var(--line)] bg-white p-5">
              <h2 className={h2Cls}>クレジットを購入する</h2>
              {products.length === 0 ? (
                <p className="mt-2 text-[12px] text-[var(--muted)]">
                  現在オンライン購入は準備中です。事務局（info@grab-design.com）までお問い合わせください。
                </p>
              ) : (
                <ProposeForm
                  mode="buy"
                  offeringId={offering.id}
                  buyOptions={[
                    single
                      ? {
                          code: single.code,
                          label: `${creditCost}クレジット購入（${price(single)!.toLocaleString()}円・税込／この案件1件分）`,
                        }
                      : null,
                    pack5
                      ? { code: pack5.code, label: `5クレジットパック（${price(pack5)!.toLocaleString()}円・税込／180日有効）` }
                      : null,
                    pack10
                      ? { code: pack10.code, label: `10クレジットパック（${price(pack10)!.toLocaleString()}円・税込／180日有効）` }
                      : null,
                  ].filter((x): x is { code: string; label: string } => !!x)}
                />
              )}
              <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
                NAKAMAビジネス会員（22,000円・税込／月）は毎月50クレジットが付与され（1クレジットあたり440円・繰越なし）、追加クレジット（単品購入）と掲載オプションが20%割引になります。
                <Link href="/billing" className="ml-1 text-[var(--green-d)] underline">詳しく見る →</Link>
              </p>
            </div>
          ) : null}

          {/* 提案フォーム */}
          <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-5">
            <h2 className={h2Cls}>提案内容</h2>
            <p className="mt-1 text-[12px] text-[var(--ink-2)]">
              提案できる商品・原料や対応できる条件を書いて送ると、募集企業と相談できます（提案を送信 → 相手が確認 → 条件を相談）。
            </p>
            <ProposeForm
              mode="send"
              offeringId={offering.id}
              needsCredit={!canSendFree}
              creditBalance={balance}
              creditCost={creditCost}
            />
          </div>
        </>
      )}
    </div>
  );
}
