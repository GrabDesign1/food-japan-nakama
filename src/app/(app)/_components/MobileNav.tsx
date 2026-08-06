"use client";

import { useState } from "react";
import Link from "next/link";

type Item = { label: string; href: string; admin?: boolean };

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
                className="text-[20px] leading-none text-white/70"
              >
                ×
              </button>
            </div>

            <nav className="mt-3 flex flex-col gap-0.5 px-3">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-[14px] transition hover:bg-white/8 ${
                    item.admin ? "mt-3 border-t border-white/12 pt-3.5" : ""
                  }`}
                >
                  <span>{item.label}</span>
                  {item.href === "/messages" && unread > 0 ? (
                    <span className="ml-auto rounded-full bg-[var(--red)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
