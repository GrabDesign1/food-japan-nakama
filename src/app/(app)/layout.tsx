// ログイン後の共通レイアウト（左サイドメニュー ＋ 上部バー）。
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signOut } from "../(auth)/actions";

type NavItem = { label: string; href: string; ready?: boolean; admin?: boolean };

const NAV: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard", ready: true },
  { label: "共創パートナーを探す", href: "/search", ready: true },
  { label: "会員プロフィール", href: "/profile", ready: true },
  { label: "持ち寄り（売りたい・買いたい）", href: "/ledger", ready: true },
  { label: "商談管理", href: "/deals", ready: true },
  { label: "商談ステータス", href: "/deals/board", ready: true },
  { label: "共創プロジェクトを企画する", href: "/projects", ready: true },
  { label: "メッセージ", href: "/messages", ready: true },
  { label: "プラン・お支払い", href: "/billing", ready: true },
  { label: "事務局管理", href: "/admin", admin: true, ready: true },
];

const ROLE_LABEL: Record<string, string> = {
  TENANT_ADMIN: "テナント管理者",
  ADMIN: "事務局",
  REVIEWER: "審査担当",
  VIEWER: "閲覧",
  MEMBER: "会員",
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const su = await getSessionUser();
  if (!su) redirect("/login");

  const admin = isAdminRole(su.app.role);
  const items = NAV.filter((i) => (i.admin ? admin : true));
  const initial = (su.app.name?.[0] ?? "?").toUpperCase();

  const member = su.app.memberId
    ? await prisma.member.findUnique({
        where: { id: su.app.memberId },
        select: { avatarUrl: true },
      })
    : null;

  // 未読メッセージ数（サイドバーのバッジ用）
  let unread = 0;
  if (su.app.memberId) {
    const myThreads = await prisma.thread.findMany({
      where: {
        OR: [{ fromMemberId: su.app.memberId }, { toMemberId: su.app.memberId }],
      },
      select: { id: true },
    });
    if (myThreads.length) {
      unread = await prisma.message.count({
        where: {
          threadId: { in: myThreads.map((t) => t.id) },
          senderMemberId: { not: su.app.memberId },
          readAt: null,
        },
      });
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-[238px_1fr]">
      {/* サイドバー */}
      <aside className="sticky top-0 flex h-screen flex-col overflow-y-auto bg-[var(--ink)] py-6 text-[#E7EBE4]">
        <div className="flex items-center gap-2.5 border-b border-white/12 px-5 pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" width={32} height={32} />
          <div>
            <div className="font-serif text-[15px] tracking-[0.1em]">
              FOOD JAPAN <span className="text-[#9FC7B0]">NAKAMA</span>
            </div>
            <div className="mt-0.5 text-[10px] tracking-[0.2em] text-[#8F9BAB]">
              FOOD JAPAN SUMMIT
            </div>
          </div>
        </div>

        <nav className="mt-3 flex flex-col gap-0.5 px-3">
          {items.map((item) =>
            item.ready ? (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition hover:bg-white/8 ${
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
            ) : (
              <span
                key={item.href}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-[13px] text-[var(--muted)] ${
                  item.admin ? "mt-3 border-t border-white/12 pt-3.5" : ""
                }`}
                title="準備中"
              >
                {item.label}
                <span className="rounded bg-white/8 px-1.5 py-0.5 text-[9px] tracking-wider">
                  準備中
                </span>
              </span>
            )
          )}
        </nav>
      </aside>

      {/* メイン */}
      <div className="flex min-h-screen flex-col bg-[var(--canvas)]">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-[var(--line)] bg-white px-8 py-3">
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right text-[12px] leading-tight">
              <div className="text-[var(--ink)]">{su.app.name}</div>
              <div className="text-[11px] text-[var(--muted)]">
                {ROLE_LABEL[su.app.role] ?? su.app.role}
              </div>
            </div>
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white font-serif text-[15px] text-[var(--green-d)]">
              {member?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-[var(--line)] px-3 py-1.5 text-[11px] text-[var(--ink-2)] transition hover:bg-[var(--canvas)]"
              >
                ログアウト
              </button>
            </form>
          </div>
        </header>

        <main className="max-w-[1200px] px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
