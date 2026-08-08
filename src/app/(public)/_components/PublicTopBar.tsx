import Link from "next/link";
import { btn } from "@/lib/ui";

// 公開ゾーンの下層ページ（プレビュー等）用の軽量ヘッダー。
// トップページのヒーローは独自のヘッダーを内蔵しているため使わない。
export function PublicTopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" width={30} height={30} />
          <div className="leading-tight">
            <div className="font-serif text-[15px] tracking-[0.08em] text-[var(--ink)]">
              FOOD JAPAN <span className="text-[var(--green-d)]">NAKAMA</span>
            </div>
            <div className="text-[9px] tracking-[0.2em] text-[var(--muted)]">FOOD JAPAN SUMMIT</div>
          </div>
        </Link>
        <nav className="ml-auto hidden items-center gap-5 text-[13px] font-medium text-[var(--ink-2)] lg:flex">
          <Link href="/about" className="hover:text-[var(--green-d)]">NAKAMAとは</Link>
          <Link href="/produce" className="hover:text-[var(--green-d)]">共創プロデュース</Link>
          <Link href="/crowdfunding" className="hover:text-[var(--green-d)]">クラファン支援</Link>
          <Link href="/pricing" className="hover:text-[var(--green-d)]">料金</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <Link href="/login" className={btn("secondary", "sm")}>
            ログイン
          </Link>
          <Link href="/signup" className={btn("primary", "sm")}>
            月額会員に申し込む
          </Link>
        </div>
      </div>
    </header>
  );
}
