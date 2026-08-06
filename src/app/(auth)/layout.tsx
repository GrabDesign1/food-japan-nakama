// ログイン・登録画面の共通レイアウト（中央寄せのカード）。
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--canvas)] px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="FOOD JAPAN NAKAMA" width={56} height={56} />
          <div className="font-serif text-[22px] tracking-[0.14em] text-[var(--ink)]">
            FOOD JAPAN <span className="text-[var(--green)]">NAKAMA</span>
          </div>
          <div className="text-[10px] tracking-[0.2em] text-[var(--muted)]">
            FOOD JAPAN SUMMIT
          </div>
          <p className="mt-1 max-w-[340px] text-[12px] leading-6 text-[var(--ink-2)]">
            生産者、食品メーカー、小売、飲食店、流通、物流、サービスを繋ぐ！「譲りたい」「あったらいいな」を登録して共創事業を作ろう！
          </p>
        </div>
        <div className="rounded-[10px] border border-[var(--line)] bg-white p-7 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
