// Food Japan Summit のイベント用フォーム（協賛申込など）のレイアウト。
//
// ⚠️ (public) グループから独立させている理由＝**NAKAMAのフッター（ナビ5列＋ログイン/登録CTA）を
//    出さないため**（ユーザー指示 2026-08-17）。サミットの申込フォームに NAKAMA の
//    サイトナビが付くと、どこの何を申し込んでいるのか分からなくなる。
//    ルートグループなのでURLは変わらない（/sponsor のまま）。
//
// 運営者の表示は各ページの末尾（page.tsx 側）で出す＝申込内容の受け取り先を示すため必要。

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* キーボードで本文へ飛べるようにする（普段は見えない） */}
      <a href="#main" className="skip-link">
        本文へスキップ
      </a>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
