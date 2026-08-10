// ログイン後の共通レイアウト（左サイドメニュー ＋ 上部バー）。
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signOut } from "../(auth)/actions";
import { MobileNav } from "./_components/MobileNav";
import { btn } from "@/lib/ui";

type NavItem = { label: string; href: string; ready?: boolean; admin?: boolean; section?: string };

// 上位＝利用者の主要行動。商談と商談ステータスの併記はやめ「進行中の活動」に一本化
// （ボードは /deals 内の「ボードで見る」から到達）。
const NAV: NavItem[] = [
  { label: "ホーム", href: "/dashboard", ready: true },
  { label: "案件を探す", href: "/search", ready: true },
  { label: "案件を登録する", href: "/ledger", ready: true },
  { label: "進行中の活動", href: "/deals", ready: true },
  { label: "メッセージ", href: "/messages", ready: true },
  { label: "共創プロジェクト", href: "/projects", ready: true, section: "その他" },
  { label: "お気に入り", href: "/favorites", ready: true, section: "その他" },
  { label: "プロフィール", href: "/profile", ready: true, section: "アカウント" },
  { label: "プラン・お支払い", href: "/billing", ready: true, section: "アカウント" },
  { label: "事務局管理", href: "/admin", admin: true, ready: true, section: "アカウント" },
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

  // アバターと未読バッジは並列で取得。未読はリレーション条件で1クエリにまとめる
  const memberId = su.app.memberId;
  const [member, unread] = await Promise.all([
    memberId
      ? prisma.member.findUnique({
          where: { id: memberId },
          select: { avatarUrl: true },
        })
      : Promise.resolve(null),
    memberId
      ? prisma.message.count({
          where: {
            thread: { OR: [{ fromMemberId: memberId }, { toMemberId: memberId }] },
            senderMemberId: { not: memberId },
            readAt: null,
          },
        })
      : Promise.resolve(0),
  ]);

  return (
    // minmax(0,1fr)：中身が広くても列を押し広げない＝ページ全体の横スクロールを防ぐ
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[238px_minmax(0,1fr)]">
      {/* サイドバー（PCのみ。スマホはヘッダーのメニューから） */}
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto bg-[var(--ink)] py-6 text-[#E7EBE4] md:flex">
        <Link
          href="/"
          className="flex items-center gap-2.5 border-b border-white/12 px-5 pb-4 transition hover:opacity-80"
        >
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
        </Link>

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
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition hover:bg-white/8"
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

      {/* メイン */}
      <div className="flex min-h-screen min-w-0 flex-col bg-[var(--canvas)]">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--line)] bg-white px-4 py-3 md:px-8">
          {/* スマホ用：メニュー＋ブランド */}
          <MobileNav items={items.filter((i) => i.ready).map((i) => ({ label: i.label, href: i.href, admin: i.admin, section: i.section }))} unread={unread} />
          <Link href="/" className="flex items-center gap-2 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" width={24} height={24} />
            <span className="font-serif text-[13px] tracking-[0.08em] text-[var(--ink)]">
              FOOD JAPAN <span className="text-[var(--green-d)]">NAKAMA</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right text-[12px] leading-tight sm:block">
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
                className={btn("secondary", "sm")}
              >
                ログアウト
              </button>
            </form>
          </div>
        </header>

        {/* スマホは下部固定ナビ分の余白を確保 */}
        <main className="max-w-[1200px] px-4 py-6 pb-24 md:px-8 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
