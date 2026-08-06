import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { ProfileForm, type MemberData } from "./_components/ProfileForm";
import { ReviewStatus } from "./_components/ReviewStatus";
import { eyebrowCls, h1Cls } from "@/lib/ui";

export default async function ProfilePage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");

  const member = await getOrCreateMemberForUser(su);

  const data: MemberData = {
    name: member.name,
    avatarUrl: member.avatarUrl,
    companyLogoUrl: member.companyLogoUrl,
    brandLogoUrl: member.brandLogoUrl,
    contactName: member.contactName,
    contactKana: member.contactKana,
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

      <ReviewStatus status={member.status} />

      <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
        <ProfileForm member={data} />
      </div>
    </div>
  );
}
