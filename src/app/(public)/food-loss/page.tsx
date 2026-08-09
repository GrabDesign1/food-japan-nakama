import Link from "next/link";
import { InfoPage } from "../_components/InfoPage";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "食品ロス支援｜FOOD JAPAN NAKAMA",
  description:
    "余っている食材、規格外品、活用先の決まっていない在庫を、必要とする相手との共創で価値に変える支援です。掲載・マッチングから事業化の個別支援までご相談いただけます。",
};

export default function FoodLossPage() {
  return (
    <InfoPage
      eyebrow="FOOD LOSS"
      title="食品ロス支援"
      lead="余っている食材、規格外品、活用先の決まっていない在庫。捨てるしかなかったものを、必要とする相手との共創で価値に変えるための支援です。"
    >
      <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
        <h2 className="font-serif text-[18px] text-[var(--ink)]">NAKAMAでできること</h2>
        <p className="mt-2 text-[14px] leading-7 text-[var(--ink-2)]">
          規格外品や余剰在庫を「売りたい」として掲載し、活用したい企業・料理人・自治体とつながれます。
          原料として探している相手が見つかれば、廃棄コストが新しい取引に変わります。
        </p>
      </div>

      <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
        <h2 className="font-serif text-[18px] text-[var(--ink)]">事業化までの個別支援</h2>
        <p className="mt-2 text-[14px] leading-7 text-[var(--ink-2)]">
          商品化・販路づくりまで踏み込みたい場合は、共創プロデュースが企画・実証・事業化まで伴走します。
          まずは個別相談で状況をお聞かせください。
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/consultation" className={btn("primary")}>個別相談する</Link>
        <Link href="/signup" className={btn("secondary")}>月額会員に申し込む</Link>
      </div>
    </InfoPage>
  );
}
