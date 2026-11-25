// 「サービスが出来ました、利用しますか？」専用のレイアウト（2026-11-26）。
//
// ⚠️⚠️ **(auth) の中に置かないこと。** (auth)/layout.tsx は 400px の白いカードで
//    中身を包む（ログイン用）。/join のページは自分でカードを描くので、
//    中に入れるとカードが二重になり、1200px の画面でも中身が 310px まで潰れる。
//    2026-11-26 にユーザーから「レイアウトが壊れまくっている」との指摘で発覚。
// ⚠️ ログインしていない方が開く画面（middleware の PUBLIC_PATHS に /join を入れてある）。
import type { ReactNode } from "react";

export default function JoinLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] px-4 py-10">
      <div className="mx-auto w-full max-w-[560px]">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="FOOD JAPAN NAKAMA" width={56} height={56} />
          <div className="font-serif text-[22px] tracking-[0.14em] text-[var(--ink)]">
            FOOD JAPAN <span className="text-[var(--green)]">NAKAMA</span>
          </div>
          <div className="text-[10px] tracking-[0.2em] text-[var(--muted)]">FOOD JAPAN SUMMIT</div>
        </div>
        {children}
      </div>
    </div>
  );
}
