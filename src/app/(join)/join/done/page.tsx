// 「いいえ」のあとのお礼（2026-11-23）。
// ⚠️ 引き止めない。考え直してもらう導線も置かない。
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "承知しました",
  robots: { index: false, follow: false },
};

export default function JoinDonePage() {
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-white p-6 sm:p-8">
        <h1 className="text-[18px] font-bold text-[var(--ink)]">承知しました</h1>
        <p className="mt-3 text-[14px] leading-7 text-[var(--ink-2)]">
          お預かりしていた情報は削除しました。
          こちらからご連絡することはありません。
        </p>
        <p className="mt-4 text-[13px] leading-7 text-[var(--muted)]">
          FOOD JAPAN SUMMIT にご参加いただき、ありがとうございました。
        </p>
    </div>
  );
}
