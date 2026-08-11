// 案件ごとのやり取り画面（クラウドワークス型・2026-08-11 ユーザー指示）。
// 「案件 → 届いた提案 → 相手を選ぶ → その場でやり取り」を1本の線でつなぐ。
// これまでは提案するとメッセージ画面へ飛ばされ、案件とやり取りが分断されていた。
// 既存の /messages/[threadId] はそのまま残す（案件に紐づかない直接連絡があるため）。
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { markThreadRead } from "../../../../messages/actions";
import { reconcileDealPhase } from "@/lib/deal";
import { isChargeableLead, isLeadUnlocked, LEAD_PREVIEW_CHARS } from "@/lib/lead-unlock";
import { getCreditBalance } from "@/lib/contact-credits";
import { LeadGate } from "./LeadGate";
import { Composer } from "../../../../messages/_components/Composer";
import { MessageList } from "../../../../messages/_components/MessageList";
import { ThreadHeader } from "../../../../messages/_components/ThreadHeader";
import { DIRECTION_SHORT, formatPrice, formatAmount, formatDeadline } from "@/lib/offering-taxonomy";
import { ContractPanel, type OfferRow } from "./ContractPanel";
import { defaultTaxRate, normalizeTaxRate, sellerBuyerIds } from "@/lib/invoice";
import { ThreadTools } from "./ThreadTools";
import { ndaBody } from "@/lib/nda";
import { btn, eyebrowCls, h1Cls } from "@/lib/ui";

export default async function OfferingThreadPage({
  params,
}: {
  params: Promise<{ id: string; threadId: string }>;
}) {
  const { id, threadId } = await params;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  // このスレッドが「この案件のもの」で、かつ自分が当事者であることを確かめる
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread || thread.offeringId !== id) notFound();
  if (thread.fromMemberId !== me.id && thread.toMemberId !== me.id) notFound();

  const otherId = thread.fromMemberId === me.id ? thread.toMemberId : thread.fromMemberId;
  // 段階は手で動かせないので、記録された事実とずれていたらここで直す
  await reconcileDealPhase(thread.id);

  const [other, messages, draft, templates, offering, deal, contractOffers, nda, issuedDocs] = await Promise.all([
    prisma.member.findUnique({
      where: { id: otherId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        companyLogoUrl: true,
        prefecture: true,
        city: true,
        categoryL1: true,
        categoryL2: true,
      },
    }),
    prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      include: { attachments: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.messageDraft.findUnique({
      where: { threadId_memberId: { threadId: thread.id, memberId: me.id } },
    }),
    prisma.messageTemplate.findMany({
      where: { memberId: me.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, body: true },
    }),
    prisma.offering.findUnique({
      where: { id },
      select: {
        id: true,
        memberId: true,
        direction: true,
        category: true,
        title: true,
        description: true,
        usageContext: true,
        imageUrls: true,
        priceType: true,
        priceAmount: true,
        priceUnit: true,
        amountValue: true,
        amountUnit: true,
        amountPeriod: true,
        amountText: true,
        minOrderText: true,
        applicationDeadline: true,
      },
    }),
    prisma.deal.findFirst({ where: { threadId: thread.id }, select: { id: true, phase: true } }),
    prisma.contractOffer.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ndaAgreement.findUnique({ where: { threadId: thread.id } }),
    prisma.issuedDocument.findMany({ where: { threadId: thread.id }, select: { kind: true } }),
  ]);
  if (!offering) notFound();

  // 「売りたい」に届いたリードは、初回だけ1クレジットで開封する（開封後の往復は無料）。
  // 未開封のときは**本文をサーバーから返さない**（画面で隠すだけでは読めてしまう）。
  const firstInbound = messages.find((m) => m.senderMemberId !== me.id) ?? null;
  const chargeable = isChargeableLead({
    direction: offering.direction,
    offeringMemberId: offering.memberId,
    viewerMemberId: me.id,
    threadFromMemberId: thread.fromMemberId,
    firstInboundAt: firstInbound?.createdAt ?? null,
  });
  const gated = chargeable && !(await isLeadUnlocked(me.id, thread.id));
  // 未開封のうちは既読にしない（読んでいないのに「未返信」が消えると対応漏れになる）
  if (!gated) await markThreadRead(thread.id);
  const balance = gated ? await getCreditBalance(me.id) : 0;
  const firstMessage = firstInbound ?? messages[0];

  const isOwner = offering.memberId === me.id;
  const lastMessageId = messages[messages.length - 1]?.id ?? "none";
  const otherPlace = [other?.prefecture, other?.city].filter(Boolean).join(" ");
  const otherIndustry = [other?.categoryL1, other?.categoryL2].filter(Boolean).join(" / ");

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={isOwner ? `/ledger/${offering.id}/proposals` : `/ledger/${offering.id}`}
          className={btn("secondary", "sm")}
        >
          {isOwner
            ? `← ${offering.direction === "GIVE" ? "届いた問い合わせ" : "届いた提案"}一覧`
            : "← 案件ページ"}
        </Link>
        <Link href={`/messages/${thread.id}`} className="text-[12px] text-[var(--muted)] underline">
          メッセージ画面で開く
        </Link>
      </div>

      <div>
        <p className={eyebrowCls}>
          {DIRECTION_SHORT[offering.direction] ?? "案件"} ・ {isOwner ? "届いたやり取り" : "自分の提案"}
        </p>
        <h1 className={h1Cls}>{offering.title}</h1>
      </div>

      <div className="flex flex-col overflow-hidden rounded-[12px] border border-[var(--line)] bg-white">
        {/* 相手の事業者 */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-6 py-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--canvas)] font-serif text-[16px] text-[var(--green-d)]">
            {other?.companyLogoUrl || other?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={other.companyLogoUrl || other.avatarUrl || ""}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              (other?.name?.[0] ?? "?").toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <Link
              href={`/producers/${otherId}?from=${encodeURIComponent(`/ledger/${id}/proposals/${threadId}`)}`}
              className="text-[16px] font-semibold text-[var(--ink)] hover:underline"
            >
              {other?.name || "（名称未設定）"}
            </Link>
            <div className="text-[12px] text-[var(--muted)]">
              {[otherPlace, otherIndustry].filter(Boolean).join("　/　") || "事業者情報は未登録です"}
            </div>
          </div>
        </div>

        {/* 対象案件の要点と進捗（メッセージ画面と同じ表示） */}
        <ThreadHeader offering={offering} dealId={deal?.id ?? null} phase={deal?.phase ?? 0} />

        {gated ? (
          <LeadGate
            offeringId={offering.id}
            threadId={thread.id}
            buyerName={other?.name ?? "お相手"}
            preview={(firstMessage?.body ?? "").slice(0, LEAD_PREVIEW_CHARS)}
            receivedAt={
              firstMessage
                ? `${firstMessage.createdAt.getFullYear()}/${firstMessage.createdAt.getMonth() + 1}/${firstMessage.createdAt.getDate()}`
                : "―"
            }
            balance={balance}
          />
        ) : (
          <>
        {/* 取引の条件（提示と合意の記録。お金は動かさない） */}
        <ContractPanel
          offeringId={offering.id}
          threadId={thread.id}
          offers={contractOffers.map<OfferRow>((o) => ({
            id: o.id,
            amount: o.amount,
            quantityText: o.quantityText,
            deliveryDate: o.deliveryDate
              ? `${o.deliveryDate.getFullYear()}/${o.deliveryDate.getMonth() + 1}/${o.deliveryDate.getDate()}`
              : null,
            terms: o.terms,
            status: o.status,
            createdAt: `${o.createdAt.getFullYear()}/${o.createdAt.getMonth() + 1}/${o.createdAt.getDate()}`,
            respondedAt: o.respondedAt
              ? `${o.respondedAt.getFullYear()}/${o.respondedAt.getMonth() + 1}/${o.respondedAt.getDate()}`
              : null,
            shippedAt: o.shippedAt
              ? `${o.shippedAt.getFullYear()}/${o.shippedAt.getMonth() + 1}/${o.shippedAt.getDate()}`
              : null,
            receivedAt: o.receivedAt
              ? `${o.receivedAt.getFullYear()}/${o.receivedAt.getMonth() + 1}/${o.receivedAt.getDate()}`
              : null,
            completedAt: o.completedAt
              ? `${o.completedAt.getFullYear()}/${o.completedAt.getMonth() + 1}/${o.completedAt.getDate()}`
              : null,
            taxRate: normalizeTaxRate(o.taxRate, defaultTaxRate(offering.category)),
            fromMe: o.proposerMemberId === me.id,
            proposerName: o.proposerMemberId === me.id ? me.name : other?.name ?? "相手",
          }))}
          defaultTaxRate={String(defaultTaxRate(offering.category)) as "8" | "10"}
          dealPhase={deal?.phase ?? 0}
          issuedKinds={issuedDocs.map((d) => d.kind)}
          listingTerms={
            [
              formatPrice(offering) ? `希望価格：${formatPrice(offering)}` : null,
              formatAmount(offering) ? `数量：${formatAmount(offering)}` : null,
              offering.minOrderText ? `最小取引量：${offering.minOrderText}` : null,
              formatDeadline(offering.applicationDeadline)
                ? `募集期限：${formatDeadline(offering.applicationDeadline)}`
                : null,
            ]
              .filter(Boolean)
              .join("　/　") || null
          }
          viewerRole={
            sellerBuyerIds({
              direction: offering.direction,
              offeringMemberId: offering.memberId,
              participantAId: thread.fromMemberId,
              participantBId: thread.toMemberId,
            }).sellerId === me.id
              ? "seller"
              : "buyer"
          }
        />

        {/* 募集の内容（クラウドワークスと同じく、やり取りの上に依頼内容を置く） */}
        {offering.description || offering.usageContext ? (
          <details className="border-b border-[var(--line)] px-6 py-4" open>
            <summary className="cursor-pointer text-[13px] font-bold text-[var(--ink)]">
              {offering.direction === "GIVE" ? "この案件の内容" : "募集の内容"}
            </summary>
            {offering.description ? (
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-7 text-[var(--ink-2)]">
                {offering.description}
              </p>
            ) : null}
            {offering.usageContext ? (
              <>
                <div className="mt-3 text-[12px] font-bold text-[var(--ink)]">使用目的・販売先</div>
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-7 text-[var(--ink-2)]">
                  {offering.usageContext}
                </p>
              </>
            ) : null}
            <Link
              href={`/ledger/${offering.id}`}
              className="mt-3 inline-block text-[12px] text-[var(--green-d)] underline"
            >
              案件ページで全部を見る →
            </Link>
          </details>
        ) : null}

        {/* やり取り */}
        <div className="flex max-h-[62vh] flex-col">
          <MessageList
            messages={messages}
            meId={me.id}
            otherName={other?.name ?? "相手"}
            myName={me.name || "自分"}
            myAvatarUrl={me.avatarUrl || me.companyLogoUrl}
            otherAvatarUrl={other?.avatarUrl || other?.companyLogoUrl}
            variant="card"
            emptyText="まだやり取りはありません。下の入力欄から送れます。"
          />
        </div>

        {/* 返信（下書き・テンプレート・面談日程・添付。メッセージ画面と同じ） */}
        <Composer
          key={lastMessageId}
          threadId={thread.id}
          otherName={other?.name ?? "相手"}
          initialDraft={draft?.body ?? ""}
          initialTemplates={templates}
          myCompanyName={me.name}
          myPersonName={me.contactName || su.app.name}
        />
        {/* 見送り・秘密保持契約・違反報告 */}
        <ThreadTools
          offeringId={offering.id}
          threadId={thread.id}
          closed={!!thread.closedAt}
          closedReason={thread.closedReason}
          otherName={other?.name ?? "お相手"}
          nda={
            nda
              ? {
                  status: nda.status,
                  partyAName: nda.partyAName,
                  partyBName: nda.partyBName,
                  specialTerms: nda.specialTerms,
                  agreedAt: nda.agreedAt
                    ? `${nda.agreedAt.getFullYear()}/${nda.agreedAt.getMonth() + 1}/${nda.agreedAt.getDate()}`
                    : null,
                  mine: nda.requestedBy === me.id,
                  ...ndaBody({
                    aName: nda.partyAName,
                    aAddress: nda.partyAAddress ?? "",
                    bName: nda.partyBName,
                    bAddress: nda.partyBAddress ?? "",
                  }),
                }
              : null
          }
        />
          </>
        )}
      </div>
    </div>
  );
}
