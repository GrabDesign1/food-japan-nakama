import Link from "next/link";
import { btn } from "@/lib/ui";

// 公開ゾーンの下層ページ（プレビュー等）用の軽量ヘッダー。
// トップページのヒーローは独自のヘッダーを内蔵しているため使わない。
export function PublicTopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1100px] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" width={30} height={30} className="h-7 w-7 sm:h-[30px] sm:w-[30px]" />
          <div className="leading-tight">
            <div className="whitespace-nowrap font-serif text-[13px] tracking-[0.06em] text-[var(--ink)] sm:text-[15px] sm:tracking-[0.08em]">
              FOOD JAPAN <span className="text-[var(--green-d)]">NAKAMA</span>
            </div>
            <div className="hidden text-[9px] tracking-[0.2em] text-[var(--muted)] sm:block">FOOD JAPAN SUMMIT</div>
          </div>
        </Link>
        <nav className="ml-auto hidden items-center gap-5 text-[13px] font-medium text-[var(--ink-2)] lg:flex">
          <Link href="/about" className="hover:text-[var(--green-d)]">NAKAMAとは</Link>
          <Link href="/produce" className="hover:text-[var(--green-d)]">共創プロデュース</Link>
          <Link href="/food-loss" className="hover:text-[var(--green-d)]">食品ロス支援</Link>
          <Link href="/crowdfunding" className="hover:text-[var(--green-d)]">クラウドファンディング支援</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <Link href="/login" className={`${btn("secondary", "sm")} max-sm:hidden`}>
            ログイン
          </Link>
          <Link href="/login" className="px-1 text-[13px] font-medium text-[var(--ink-2)] sm:hidden">
            ログイン
          </Link>
          <Link href="/signup" className={btn("primary", "sm")}>
            <span className="sm:hidden">申し込む</span>
            <span className="hidden sm:inline">月額会員に申し込む</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
