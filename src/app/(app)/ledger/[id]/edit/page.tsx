import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { DIRECTION_LABEL } from "@/lib/offering-taxonomy";
import { OfferingForm, type OfferingData } from "../../_components/OfferingForm";
import { togglePublish, deleteOffering } from "../../actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { btn, h1Cls } from "@/lib/ui";

function toDateInput(d: Date | null): string | null {
  if (!d) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function OfferingEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ missing?: string; created?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
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
    priceType: offering.priceType,
    priceAmount: offering.priceAmount,
    priceUnit: offering.priceUnit,
    minOrderText: offering.minOrderText,
    itemCondition: offering.itemCondition,
    storageType: offering.storageType,
    shelfLifeText: offering.shelfLifeText,
    specification: offering.specification,
    supplyFrequency: offering.supplyFrequency,
    deliveryMethods: offering.deliveryMethods,
    shippingCostBearer: offering.shippingCostBearer,
    applicationDeadline: toDateInput(offering.applicationDeadline),
    desiredPartner: offering.desiredPartner,
  };

  return (
    <div className="flex max-w-[1100px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/ledger" className={btn("secondary", "sm")}>
            ← 台帳一覧
          </Link>
          <h1 className={`${h1Cls} mt-1`}>
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

      {sp.created ? (
        <p className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3 text-[13px] text-[var(--green-d)]">
          下書きを保存しました。写真を追加し、内容を確認できたら右上の「公開する」で掲載できます。
        </p>
      ) : null}
      {sp.missing ? (
        <p className="rounded-[10px] border border-[#E7C7BE] bg-[#FBF1EE] px-4 py-3 text-[13px] leading-6 text-[var(--red)]">
          公開するには、次の項目の入力が必要です：<b>{sp.missing}</b>
        </p>
      ) : null}

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
        <ConfirmDeleteButton
          action={deleteOffering.bind(null, offering.id)}
          buttonLabel="この台帳を削除"
          title="本当に削除しますか？"
          description={`「${offering.title || "（無題）"}」と登録済みの写真がすべて削除されます。この操作は元に戻せません。`}
        />
      </div>
    </div>
  );
}
