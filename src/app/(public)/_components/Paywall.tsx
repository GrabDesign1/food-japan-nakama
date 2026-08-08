import Link from "next/link";
import { btn } from "@/lib/ui";

// 「続きは会員限定」の壁。概要の下に置く。
export function Paywall({ remaining }: { remaining?: number }) {
  return (
    <div className="relative">
      {/* 上のコンテンツからのフェード */}
      <div className="pointer-events-none absolute -top-24 left-0 h-24 w-full bg-gradient-to-b from-transparent to-white" />
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--green-soft)] px-6 py-8 text-center">
        <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-white text-[16px]">🔒</div>
        <div className="text-[15px] font-bold text-[var(--ink)]">この続きは会員限定です</div>
        <p className="mt-1 text-[13px] text-[var(--ink-2)]">
          月額会員（22,000円・税込／月）になると、詳細の閲覧と、メッセージでの問い合わせができます。
        </p>
        {remaining && remaining > 0 ? (
          <p className="mt-2 text-[12px] text-[var(--muted)]">残り約 {remaining} 文字</p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={btn("primary", "lg")}>月額会員に申し込む</Link>
          <Link href="/login" className={btn("secondary", "lg")}>ログイン</Link>
        </div>
      </div>
    </div>
  );
}
