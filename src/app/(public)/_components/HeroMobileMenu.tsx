"use client";

import { useState } from "react";
import Link from "next/link";

// 公開トップのヒーローヘッダー用ハンバーガーメニュー（モバイルのみ・左側）。
const ITEMS: { label: string; href: string }[] = [
  { label: "探している案件を見る", href: "/listings?type=want" },
  { label: "NAKAMAとは", href: "/about" },
  { label: "実績", href: "/cases" },
  { label: "販路開拓支援", href: "/hanro" },
  { label: "共創プロデュース", href: "/produce" },
  { label: "食品ロス支援", href: "/food-loss" },
  { label: "クラウドファンディング支援", href: "/crowdfunding" },
  { label: "利用料金・共創支援", href: "/pricing" },
  { label: "無料で登録する", href: "/signup" },
];

export function HeroMobileMenu({ className = "hidden max-[820px]:block" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        aria-label="メニューを開く"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid h-11 w-11 place-items-center rounded-md border border-[rgba(0,47,34,0.25)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#002f22" strokeWidth={2} strokeLinecap="round" className="h-6 w-6" aria-hidden>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute left-0 top-0 flex h-full w-[78%] max-w-[320px] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3.5">
              <span className="font-serif text-[14px] tracking-[0.08em] text-[var(--ink)]">
                FOOD JAPAN <span className="text-[var(--green-d)]">NAKAMA</span>
              </span>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5 text-[var(--ink)]" aria-hidden>
                  <path d="m6 6 12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col overflow-y-auto">
              {ITEMS.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-[var(--line)] px-5 py-4 text-[15px] font-bold text-[var(--ink)]"
                >
                  {it.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
