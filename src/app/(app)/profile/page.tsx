import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { ProfileForm, type MemberData } from "./_components/ProfileForm";
import { ReviewStatus } from "./_components/ReviewStatus";
import { WithdrawalSection } from "./_components/WithdrawalSection";
import { MailPreference } from "./_components/MailPreference";
import { eyebrowCls, h1Cls } from "@/lib/ui";
import { AI_ENABLED } from "@/lib/ai";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { btn } from "@/lib/ui";

export default async function ProfilePage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");

  const member = await getOrCreateMemberForUser(su);

  // 発信しているところ（保存済み）。フォームの初期値に渡す
  const linkRows = await prisma.memberLink.findMany({
    where: { memberId: member.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { kind: true, label: true, url: true },
  });

  const data: MemberData = {
    name: member.name,
    avatarUrl: member.avatarUrl,
    companyLogoUrl: member.companyLogoUrl,
    brandLogoUrl: member.brandLogoUrl,
    contactName: member.contactName,
    contactKana: member.contactKana,
    contactMobile: member.contactMobile,
    contactRole: member.contactRole,
    contactBio: member.contactBio,
    contactPhotoUrl: member.contactPhotoUrl,
    links: linkRows.map((r) => ({ kind: r.kind, label: r.label ?? "", url: r.url })),
    categoryL1: member.categoryL1,
    categoryL2: member.categoryL2,
    prefecture: member.prefecture,
    city: member.city,
    postalCode: member.postalCode,
    address: member.address,
    website: member.website,
    founded: member.founded,
    size: member.size,
    description: member.description,
    imageUrls: member.imageUrls,
    featureText: member.featureText,
    hasLicense: member.hasLicense,
    licenseName: member.licenseName,
    invoiceRegNo: member.invoiceRegNo,
    bankAccount: member.bankAccount,
    productItems: member.productItems,
    productVolume: member.productVolume,
    equipmentText: member.equipmentText,
    salesAreaText: member.salesAreaText,
    logisticsText: member.logisticsText,
    foodlossText: member.foodlossText,
    challengeText: member.challengeText,
    collabStyle: member.collabStyle,
    startTiming: member.startTiming,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className={eyebrowCls}>
            MEMBER PROFILE
          </p>
          <h1 className={h1Cls}>
            会員プロフィール
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[var(--muted)]">記入率</div>
          <div className="font-serif text-[24px] text-[var(--green-d)]">
            {member.completionRate}
            <span className="text-[13px]">%</span>
          </div>
        </div>
      </div>

      {/* 自分のページ（仲間から見える姿）への入口。
          ⚠️ 2026-11-25 ユーザー指示「自分のプロフィール＋タイムラインを書いてよ」。
             編集画面しか無かったので、見える側への道をここに置く。 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-4">
        <p className="text-[12.5px] leading-6 text-[var(--ink-2)]">
          仲間からは、こう見えています。顔写真・ひとこと・発信しているところ・あなたの投稿が並びます。
        </p>
        <Link className={btn("ghost")} href={`/producers/${member.id}?from=/profile`}>
          自分のページを見る
        </Link>
      </div>

      <ReviewStatus status={member.status} />

      <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
        <ProfileForm aiEnabled={AI_ENABLED} member={data} />
      </div>

      <MailPreference optIn={!!su.app.marketingOptInAt} />

      <WithdrawalSection requestedAt={member.withdrawalRequestedAt} />
    </div>
  );
}
