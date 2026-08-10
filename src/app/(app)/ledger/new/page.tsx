// 台帳の新規登録。画面を開くだけではDBレコードを作らない（初回保存時に作成）。
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { OfferingForm, type OfferingData } from "../_components/OfferingForm";
import { btn, h1Cls } from "@/lib/ui";

export default async function NewOfferingPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");

  const sp = await searchParams;
  const direction = sp.direction === "WANT" ? "WANT" : "GIVE";

  const empty: OfferingData = {
    id: null,
    direction,
    category: "食材・原料",
    title: "",
    description: null,
    points: null,
    tags: [],
    amountValue: null,
    amountUnit: null,
    amountPeriod: null,
    amountText: null,
    timing: null,
    area: null,
    imageUrls: [],
    descriptionImageUrl: null,
    pointsImageUrl: null,
    priceType: null,
    priceAmount: null,
    priceUnit: null,
    minOrderText: null,
    itemCondition: null,
    storageType: null,
    shelfLifeText: null,
    specification: null,
    supplyFrequency: null,
    deliveryMethods: [],
    shippingCostBearer: null,
    applicationDeadline: null,
    desiredPartner: null,
    listingPurpose: null,
    tagline: null,
    featureDiff: null,
    backgroundStory: null,
    usageIdeas: null,
    challengeCurrent: null,
    challengeScale: null,
    challengeTried: null,
    challengeAsk: null,
    challengeValue: null,
    sampleAvailability: null,
    priceTaxType: null,
    seekingType: null,
    usageContext: null,
    requirements: [],
  };

  return (
    <div className="flex max-w-[1100px] flex-col gap-5">
      <div>
        <Link href="/ledger" className={btn("secondary", "sm")}>
          ← 案件一覧へ戻る
        </Link>
        <h1 className={`${h1Cls} mt-2`}>
          {direction === "GIVE" ? "「売りたい」を登録する" : "探している商品・原料を登録する"}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--ink-2)]">
          {direction === "GIVE"
            ? "買い手が検討しやすいように、価格・量・状態・受け渡し条件をご登録ください。未確定の項目は「応相談」を選べます。"
            : "仕入れたい商品や原料、希望条件を登録すると、対応できる生産者や食品事業者から提案を受けられます。商品名が決まっていなくても、用途や希望から相談できます。"}
        </p>
      </div>

      <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
        <OfferingForm offering={empty} />
      </div>
    </div>
  );
}
