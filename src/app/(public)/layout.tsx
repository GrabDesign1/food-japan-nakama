import Link from "next/link";
import { btn } from "@/lib/ui";

// 公開ゾーン（未ログイン向け）の共通レイアウト。
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ヘッダー */}
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
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className={btn("secondary", "sm")}>
              ログイン
            </Link>
            <Link href="/signup" className={btn("primary", "sm")}>
              無料登録
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* フッター */}
      <footer className="mt-16 border-t border-[var(--line)] bg-[var(--green-soft)]">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3 px-4 py-8 text-[12px] text-[var(--ink-2)] sm:flex-row sm:items-center">
          <div className="font-serif text-[14px] text-[var(--ink)]">FOOD JAPAN NAKAMA</div>
          <div className="sm:ml-auto flex items-center gap-4">
            <Link href="/login" className="hover:underline">ログイン</Link>
            <Link href="/signup" className="hover:underline">無料会員登録</Link>
          </div>
        </div>
        <div className="border-t border-white/60 py-3 text-center text-[11px] text-[var(--muted)]">
          © FOOD JAPAN SUMMIT
        </div>
      </footer>
    </div>
  );
}
