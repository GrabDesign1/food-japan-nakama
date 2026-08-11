import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser, isSuperAdminRole } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { OfferingForm, type OfferingData } from "../../_components/OfferingForm";
import { togglePublish, deleteOffering } from "../../actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ConfirmActionButton } from "@/components/ConfirmActionButton";
import { missingForPublish, recommendedMissingForWant } from "@/lib/offering-publish";
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
  searchParams: Promise<{ missing?: string; created?: string; copied?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const member = await getOrCreateMemberForUser(su);

  const offering = await prisma.offering.findUnique({
    where: { id },
    include: {
      requirements: { orderBy: { sortOrder: "asc" } },
      member: { select: { id: true, name: true, tenantId: true } },
    },
  });
  if (!offering) notFound();

  // 掲載代行：同一テナントの上位管理者（事務局）は他社の案件も編集できる
  // （サーバー側の許可は src/app/(app)/ledger/actions.ts の ownOfferingOr404 と対）。
  const isOwner = offering.memberId === member.id;
  const isProxy =
    !isOwner && isSuperAdminRole(su.app.role) && offering.member.tenantId === su.app.tenantId;
  if (!isOwner && !isProxy) notFound();

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
    tagline: offering.tagline,
    featureDiff: offering.featureDiff,
    backgroundStory: offering.backgroundStory,
    usageIdeas: offering.usageIdeas,
    sampleAvailability: offering.sampleAvailability,
    priceTaxType: offering.priceTaxType,
    seekingType: offering.seekingType,
    usageContext: offering.usageContext,
    requirements: offering.requirements.map((r) => ({ kind: r.kind, text: r.text, level: r.level })),
  };

  return (
    <div className="flex max-w-[1100px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/ledger" className={btn("secondary", "sm")}>
            ← 台帳一覧
          </Link>
          <h1 className={`${h1Cls} mt-1`}>
            {offering.direction === "GIVE" ? "売りたい（提供したい）の登録" : "探している（調達したい）商品・原料の登録"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {offering.isPublic ? (
            <>
              <span className="flex items-center gap-2 rounded-full bg-[#F59E0B] px-4 py-2 text-[14px] font-bold text-white shadow-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                公開中
              </span>
              <Link href={`/ledger/${offering.id}/options`} className={btn("amber", "sm")}>
                有料オプションを追加する
              </Link>
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
              {/* 基本掲載は無料。有料オプションは任意（無料導線を隠さない） */}
              <ConfirmActionButton
                action={togglePublish.bind(null, offering.id, true)}
                buttonLabel="無料で公開する"
                title="公開しますか？"
                description="基本掲載は無料です。公開すると、会員の検索結果と公開プレビューに表示されます。より早く、より多くの相手へ届けたい場合は、公開後に「有料オプションを追加する」から追加できます。"
                confirmLabel="無料で公開する"
                cancelLabel="公開しない"
              />
              <Link href={`/ledger/${offering.id}/options`} className={btn("amber", "sm")}>
                有料オプションを追加する
              </Link>
            </>
          )}
        </div>
      </div>

      {isProxy ? (
        <div className="rounded-[10px] border-2 border-[#F59E0B] bg-[#FEF6E7] px-4 py-3">
          <p className="text-[13px] font-bold text-[var(--amber)]">
            事務局として「{offering.member.name}」の案件を代理で編集しています
          </p>
          <p className="mt-1 text-[12px] leading-6 text-[var(--ink-2)]">
            この画面での保存・公開・削除は、すべて監査ログに記録されます。
            公開する前に、必ず掲載者ご本人に内容をご確認ください。
          </p>
        </div>
      ) : null}

      {sp.created ? (
        <p className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3 text-[13px] text-[var(--green-d)]">
          下書きを保存しました。写真を追加し、内容を確認できたら右上の「公開する」で掲載できます。
        </p>
      ) : null}
      {sp.copied ? (
        <p className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3 text-[13px] leading-6 text-[var(--green-d)]">
          前回の内容をコピーしました。<b>数量・希望価格・募集期限（出荷できる日）</b>を今回の分に直してから、
          右上の「公開する」で掲載できます。写真もコピー済みです。
        </p>
      ) : null}
      {/* 公開前チェック：URLのパラメータではなく、保存済みの現在値から毎回判定する（揃ったら消える） */}
      {sp.missing && !offering.isPublic ? (
        (() => {
          const missingNow = missingForPublish(offering);
          return missingNow.length ? (
            <p className="rounded-[10px] border border-[#E7C7BE] bg-[#FBF1EE] px-4 py-3 text-[13px] leading-6 text-[var(--red)]">
              公開するには、次の項目の入力が必要です：<b>{missingNow.join("・")}</b>
              <span className="mt-1 block text-[12px] text-[var(--ink-2)]">
                入力したら「保存する」を押すと、この表示が更新されます。
              </span>
            </p>
          ) : (
            <p className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3 text-[13px] text-[var(--green-d)]">
              ✓ 必須項目がすべて入力されました。右上の「公開する」から公開できます。
            </p>
          );
        })()
      ) : null}

      {/* 探している：公開はできるが、書いてあると提案が集まりやすい項目（公開は止めない） */}
      {(() => {
        const rec = recommendedMissingForWant(offering);
        return rec.length ? (
          <div className="rounded-[10px] border border-[var(--amber-line)] bg-[var(--amber-bg)] px-4 py-3 text-[13px] leading-6 text-[var(--amber-ink)]">
            <b>未入力の項目があります：{rec.join("・")}</b>
            <span className="mt-1 block text-[12px] leading-6 text-[var(--ink-2)]">
              これらが空でも公開できます。ただし提案する側は<b>クレジットを使って</b>提案するため、
              数量・時期・予算が分からないと提案をためらいます。分かる範囲で書いておくと、
              条件に合う提案が届きやすくなります。
            </span>
          </div>
        ) : null;
      })()}

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
