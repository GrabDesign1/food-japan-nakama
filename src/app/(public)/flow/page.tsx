import Link from "next/link";
import { InfoPage } from "../_components/InfoPage";
import { btn } from "@/lib/ui";

export const metadata = { title: "利用の流れ｜FOOD JAPAN NAKAMA" };

const STEPS = [
  { n: 1, title: "NAKAMA会員に申し込む", body: "メールアドレスで登録し、月額会員（22,000円・税込）にお申し込みください。決済後すぐにご利用いただけます。" },
  { n: 2, title: "プロフィール・案件を掲載", body: "自社の事業内容や、売りたい・買いたい・共創したい案件を掲載します。" },
  { n: 3, title: "パートナーを探して問い合わせ", body: "掲載案件を検索し、気になる相手へメッセージで問い合わせます。" },
  { n: 4, title: "商談・共創へ", body: "やり取りを重ね、具体的な取引や共創プロジェクトにつなげます。" },
];

export default function FlowPage() {
  return (
    <InfoPage eyebrow="HOW IT WORKS" title="利用の流れ">
      <div className="flex flex-col gap-3">
        {STEPS.map((s) => (
          <div key={s.n} className="flex gap-4 rounded-[10px] border border-[var(--line)] bg-white p-5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--green)] text-[15px] font-bold text-white">{s.n}</span>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--ink)]">{s.title}</h2>
              <p className="mt-1 text-[13px] leading-6 text-[var(--ink-2)]">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div>
        <Link href="/signup" className={btn("primary")}>NAKAMA会員に申し込む</Link>
      </div>
    </InfoPage>
  );
}
