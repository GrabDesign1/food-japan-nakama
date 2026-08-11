// 納品書・請求書の作成画面（2026-08-12）。
// **NAKAMAは当事者にならず代金も預からない**ため、ここで作るのは売り手名義の書類であり、
// NAKAMAが請求・回収するものではない。発行済みPDFはサーバーに保存しない
// （保存すると電子帳簿保存法の検索・訂正削除防止の要件を負うため）。
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { btn } from "@/lib/ui";
import {
  defaultTaxRate,
  documentNo,
  formatAddress,
  formatJpDate,
  normalizeInvoiceRegNo,
  normalizeTaxRate,
  sellerBuyerIds,
  taxBreakdown,
} from "@/lib/invoice";
import { DocumentSheet, type DocumentData } from "./DocumentSheet";

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; threadId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id, threadId } = await params;
  const { type } = await searchParams;
  const kind: "invoice" | "delivery" | "receipt" =
    type === "delivery" ? "delivery" : type === "receipt" ? "receipt" : "invoice";

  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  // 当事者であること＋案件が一致することの両方を確かめる
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread || thread.offeringId !== id) notFound();
  if (thread.fromMemberId !== me.id && thread.toMemberId !== me.id) notFound();

  const offering = await prisma.offering.findUnique({
    where: { id },
    select: { id: true, title: true, direction: true, category: true, memberId: true },
  });
  if (!offering) notFound();

  // 帳票は「合意済み＋発送・受け渡し完了」のものだけ作れる
  const offer = await prisma.contractOffer.findFirst({
    where: { threadId, status: "accepted", completedAt: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  const { sellerId, buyerId } = sellerBuyerIds({
    direction: offering.direction,
    offeringMemberId: offering.memberId,
    participantAId: thread.fromMemberId,
    participantBId: thread.toMemberId,
  });

  const [seller, buyer] = await Promise.all([
    prisma.member.findUnique({
      where: { id: sellerId },
      select: {
        name: true, contactName: true, postalCode: true, prefecture: true, city: true,
        address: true, invoiceRegNo: true, bankAccount: true,
      },
    }),
    prisma.member.findUnique({
      where: { id: buyerId },
      select: { name: true, postalCode: true, prefecture: true, city: true, address: true },
    }),
  ]);

  const backHref = `/ledger/${id}/proposals/${threadId}`;

  if (!offer || !offer.completedAt) {
    return (
      <div className="mx-auto max-w-[820px]">
        <Link href={backHref} className="text-[12px] text-[var(--green-d)] underline">
          ← やり取りに戻る
        </Link>
        <div className="mt-4 rounded-[10px] border border-[var(--line)] bg-white p-6 text-[13px] leading-7 text-[var(--ink-2)]">
          <b className="text-[var(--ink)]">まだ帳票を作成できません。</b>
          <p className="mt-2">
            条件に合意したあと、<b>お渡しする側の「発送しました」と、受け取る側の「受け取りました」の両方</b>
            が記録されると、その内容から納品書・請求書を作成できます。
          </p>
          <Link href={backHref} className={`${btn("primary", "sm")} mt-4`}>
            やり取りの画面へ
          </Link>
        </div>
      </div>
    );
  }

  const rate = normalizeTaxRate(offer.taxRate, defaultTaxRate(offering.category));
  const amounts = taxBreakdown(offer.amount, rate);
  const issuedAt = new Date();
  const regNo = normalizeInvoiceRegNo(seller?.invoiceRegNo);

  const data: DocumentData = {
    kind,
    docNo: documentNo(kind, offer.id, offer.completedAt),
    issuedAt: formatJpDate(issuedAt),
    completedAt: formatJpDate(offer.completedAt),
    deliveryDate: offer.deliveryDate ? formatJpDate(offer.deliveryDate) : null,
    seller: {
      name: seller?.name || "（名称未設定）",
      address: formatAddress(seller ?? {}),
      contactName: seller?.contactName ?? null,
      regNo,
      bank: seller?.bankAccount ?? null,
    },
    buyer: {
      name: buyer?.name || "（名称未設定）",
      address: formatAddress(buyer ?? {}),
    },
    itemName: offering.title || "（案件名なし）",
    quantityText: offer.quantityText,
    terms: offer.terms,
    rate: amounts.rate,
    excluding: amounts.excluding,
    tax: amounts.tax,
    including: amounts.including,
    viewerIsSeller: me.id === sellerId,
    regNoOk: !!regNo,
  };

  return (
    <div>
      <div className="print:hidden mx-auto mb-4 flex max-w-[820px] flex-wrap items-center gap-3">
        <Link href={backHref} className="text-[12px] text-[var(--green-d)] underline">
          ← やり取りに戻る
        </Link>
        <div className="ml-auto flex gap-2">
          <Link
            href={`${backHref}/document?type=invoice`}
            className={btn(kind === "invoice" ? "primary" : "secondary", "sm")}
          >
            請求書
          </Link>
          <Link
            href={`${backHref}/document?type=delivery`}
            className={btn(kind === "delivery" ? "primary" : "secondary", "sm")}
          >
            納品書
          </Link>
          <Link
            href={`${backHref}/document?type=receipt`}
            className={btn(kind === "receipt" ? "primary" : "secondary", "sm")}
          >
            領収書
          </Link>
        </div>
      </div>
      <DocumentSheet data={data} />
    </div>
  );
}
