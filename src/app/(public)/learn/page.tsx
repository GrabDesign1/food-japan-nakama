import Link from "next/link";
import { InfoPage } from "../_components/InfoPage";
import { btn } from "@/lib/ui";

export const metadata = {
  title: "学び・セミナー｜FOOD JAPAN NAKAMA",
  description: "食のトップリーダーや現場の実践者から、商品開発、販路、地域共創、食品ロスなどを学べます。",
};

export default function LearnPage() {
  return (
    <InfoPage
      eyebrow="LEARN"
      title="学び・セミナー"
      lead="食のトップリーダーや現場の実践者から、商品開発、販路、地域共創、食品ロスなどを学べます。開催予定は順次公開します。"
    >
      <div className="rounded-[10px] border border-dashed border-[var(--line)] bg-white p-8 text-center text-[13px] text-[var(--muted)]">
        現在、公開中のセミナーはありません。開催が決まり次第、こちらに掲載します。
      </div>
      <div>
        <Link href="/signup" className={btn("primary")}>NAKAMA会員に申し込む</Link>
      </div>
    </InfoPage>
  );
}
