"use client";

import { useState } from "react";
import Link from "next/link";

type Item = { label: string; href: string; admin?: boolean; section?: string };

// 下部固定ナビ（スマホ）。ホーム・探す・活動・メッセージの4項目＋その他（ドロワー）。タップ領域44px以上。
const BOTTOM_ITEMS = [
  { href: "/dashboard", icon: "⌂", label: "ホーム" },
  { href: "/search", icon: "🔍", label: "探す" },
  { href: "/deals", icon: "🤝", label: "活動" },
  { href: "/messages", icon: "✉️", label: "メッセージ" },
];

export function MobileNav({ items, unread }: { items: Item[]; unread: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ハンバーガー（スマホのみ） */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
        className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)] text-[var(--ink)] md:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>

      {/* 下部固定ナビ（スマホのみ） */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[var(--line)] bg-white pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 md:hidden">
        {BOTTOM_ITEMS.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="relative flex min-h-[44px] min-w-[52px] flex-col items-center justify-center gap-0.5 px-2 text-[var(--ink-2)]"
          >
            <span className="text-[16px] leading-none">
              {b.icon}
              {b.href === "/messages" && unread > 0 ? (
                <span className="absolute right-1 top-0 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-[var(--red)] px-1 text-[9px] font-bold text-white">
                  {unread}
                </span>
              ) : null}
            </span>
            <span className="text-[10px]">{b.label}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-[44px] min-w-[52px] flex-col items-center justify-center gap-0.5 px-2 text-[var(--ink-2)]"
        >
          <span className="text-[16px] leading-none">☰</span>
          <span className="text-[10px]">その他</span>
        </button>
      </nav>

      {/* ドロワー */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[264px] max-w-[82%] flex-col overflow-y-auto bg-[var(--ink)] py-5 text-[#E7EBE4]">
            <div className="flex items-center justify-between border-b border-white/12 px-5 pb-4">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-mark.png" alt="" width={28} height={28} />
                <div className="font-serif text-[14px] tracking-[0.1em]">
                  FOOD JAPAN <span className="text-[#9FC7B0]">NAKAMA</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="grid h-11 w-11 place-items-center text-[20px] leading-none text-white/70"
              >
                ×
              </button>
            </div>

            <nav className="mt-3 flex flex-col gap-0.5 px-3">
              {items.map((item, idx) => {
                const prev = idx > 0 ? items[idx - 1] : undefined;
                const showLabel = item.section && item.section !== prev?.section;
                return (
                  <div key={item.href} className="flex flex-col gap-0.5">
                    {showLabel ? (
                      <div className="mb-0.5 mt-4 px-3 text-[10px] tracking-[0.18em] text-[#8F9BAB]">
                        {item.section}
                      </div>
                    ) : null}
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2.5 text-[14px] transition hover:bg-white/8"
                    >
                      <span>{item.label}</span>
                      {item.href === "/messages" && unread > 0 ? (
                        <span className="ml-auto rounded-full bg-[var(--red)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {unread}
                        </span>
                      ) : null}
                    </Link>
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
