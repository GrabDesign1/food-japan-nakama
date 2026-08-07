import Link from "next/link";
import { InfoPage } from "../_components/InfoPage";
import { btn } from "@/lib/ui";

export const metadata = { title: "FOOD JAPAN NAKAMAとは｜FOOD JAPAN NAKAMA" };

const ITEMS = [
  { icon: "🥬", title: "売りたい", body: "食材・規格外品・商品・設備・技術などを掲載できます。" },
  { icon: "🔎", title: "買いたい・探したい", body: "必要な原料・商品・技術・パートナーを募集できます。" },
  { icon: "🤝", title: "共創したい", body: "新商品開発、地域課題、食品ロスなどの協業相手を募集できます。" },
];

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="ABOUT"
      title="FOOD JAPAN NAKAMAとは"
      lead="FOOD JAPAN NAKAMAは、生産者・食品メーカー・小売・飲食店・流通・自治体など、食に関わる人と企業をつなぐ共創プラットフォームです。売りたい食材、探している原料、解決したい課題、いっしょに取り組みたいプロジェクトを掲載し、新しい取引や事業の仲間と出会えます。"
    >
      <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
        <h2 className="font-serif text-[18px] text-[var(--ink)]">食の課題を、全国のNAKAMAと解決する</h2>
        <p className="mt-2 text-[14px] leading-7 text-[var(--ink-2)]">
          余っている食材を活かしたい。新しい原料や商品を探したい。地域の食を全国へ届けたい。異業種と新しい事業を始めたい。
          FOOD JAPAN NAKAMAでは、企業や地域が持つ「提供できるもの」と「求めているもの」を公開し、具体的な商談や共創プロジェクトにつなげます。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ITEMS.map((it) => (
          <div key={it.title} className="rounded-[10px] border border-[var(--line)] bg-white p-5">
            <div className="text-[24px]">{it.icon}</div>
            <h3 className="mt-1 text-[15px] font-semibold text-[var(--ink)]">{it.title}</h3>
            <p className="mt-1 text-[13px] leading-6 text-[var(--ink-2)]">{it.body}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/signup" className={btn("primary")}>月額会員に申し込む</Link>
        <Link href="/flow" className={btn("secondary")}>利用の流れを見る</Link>
      </div>
    </InfoPage>
  );
}
