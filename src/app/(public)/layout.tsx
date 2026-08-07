import Link from "next/link";

// 公開ゾーン（未ログイン向け）の共通レイアウト。
// ヘッダーはページ側で用意する（トップはヒーロー内蔵ヘッダー、下層は PublicTopBar）。
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
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
