import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { DIRECTION_LABEL } from "@/lib/offering-taxonomy";
import { OfferingForm, type OfferingData } from "../../_components/OfferingForm";
import { togglePublish, deleteOffering } from "../../actions";
import { btn } from "@/lib/ui";

export default async function OfferingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const member = await getOrCreateMemberForUser(su);

  const offering = await prisma.offering.findUnique({ where: { id } });
  if (!offering || offering.memberId !== member.id) notFound();

  const data: OfferingData = {
    id: offering.id,
    direction: offering.direction,
    category: offering.category,
    title: offering.title,
    description: offering.description,
    points: offering.points,
    tags: offering.tags,
    amountValue: offering.amountValue,
    amountUnit: offering.amountUnit,
    amountPeriod: offering.amountPeriod,
    amountText: offering.amountText,
    timing: offering.timing,
    area: offering.area,
    imageUrls: offering.imageUrls,
    descriptionImageUrl: offering.descriptionImageUrl,
    pointsImageUrl: offering.pointsImageUrl,
  };

  return (
    <div className="flex max-w-[720px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/ledger" className={btn("secondary", "sm")}>
            ← 台帳一覧
          </Link>
          <h1 className="mt-1 font-serif text-[20px] text-[var(--ink)]">
            {DIRECTION_LABEL[offering.direction]}の登録
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {offering.isPublic ? (
            <>
              <span className="rounded-full bg-[var(--green-soft)] px-3 py-1 text-[11px] text-[var(--green-d)]">
                公開中
              </span>
              <form action={togglePublish.bind(null, offering.id, false)}>
                <button className={btn("secondary", "sm")}>
                  非公開にする
                </button>
              </form>
            </>
          ) : (
            <>
              <span className="rounded-full bg-[var(--line)] px-3 py-1 text-[11px] text-[var(--ink-2)]">
                下書き
              </span>
              <form action={togglePublish.bind(null, offering.id, true)}>
                <button className={btn("primary", "sm")}>
                  公開する
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
        {/* updatedAt を key にして、保存後に最新値で再表示する */}
        <OfferingForm key={offering.updatedAt.getTime()} offering={data} />
      </div>

      <div className="flex items-center justify-between">
        {offering.isPublic ? (
          <Link
            href={`/ledger/${offering.id}`}
            className="text-[13px] text-[var(--green-d)] underline"
          >
            公開ページを見る →
          </Link>
        ) : (
          <span />
        )}
        <form action={deleteOffering.bind(null, offering.id)}>
          <button className="text-[12px] text-[var(--red)] underline">
            この台帳を削除
          </button>
        </form>
      </div>
    </div>
  );
}
