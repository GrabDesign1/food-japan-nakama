// 事務局の各画面へ移動するボタン列（2026-08-16）。事務局管理トップと下層ページの全てに同じものを置く。
// 「→」＝別ページ、「↓」＝事務局管理トップの中のセクション（下層ページからはトップへ移動してからスクロールする）。
// 件数（審査待ちなど）はこのコンポーネント自身が数えるので、置くページ側は current を渡すだけでよい。
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aTab, aTabBar, aTabCurrent } from "./adminUi";

/** 画面のキー。current に渡すと、その項目は押せない表示になる */
export type AdminNavKey =
  | "top"
  | "members"
  | "listings"
  | "inquiries"
  | "consultations"
  | "billing"
  | "reports"
  | "audit"
  | "crm";

const PAGES: { key: AdminNavKey; label: string; href: string }[] = [
  { key: "top", label: "事務局管理", href: "/admin" },
  { key: "members", label: "会員管理", href: "/admin/members" },
  { key: "listings", label: "掲載の監視", href: "/admin/listings" },
  { key: "inquiries", label: "問い合わせ・応募の状況", href: "/admin/inquiries" },
  { key: "consultations", label: "個別相談の管理", href: "/admin/consultations" },
  { key: "billing", label: "課金管理", href: "/admin/billing" },
  { key: "reports", label: "違反報告", href: "/admin/reports" },
  { key: "audit", label: "監査ログ", href: "/admin/audit" },
];

const SECTIONS: { hash: string; label: string }[] = [
  { hash: "#announcements", label: "お知らせ" },
  { hash: "#banners", label: "バナー" },
  { hash: "#articles", label: "記事キュレーション" },
  { hash: "#admin-accounts", label: "管理者アカウント" },
];

export async function AdminNav({ current }: { current: AdminNavKey }) {
  const su = await getSessionUser();
  const tenantId = su?.app.tenantId ?? "";

  // 件数つきで出す項目だけ数える（いずれも1件のcount。全ページで走るため軽いものに限る）
  const [pendingMembers, pendingProjects, sentBackProjects] = await Promise.all([
    prisma.member.count({ where: { tenantId, status: "PENDING" } }),
    prisma.project.count({ where: { tenantId, status: "pending" } }),
    prisma.project.count({ where: { tenantId, status: "draft", reviewNote: { not: null } } }),
  ]);

  // トップにいるときはページ内アンカー、下層ページからはトップへ移動してから同じ場所へ
  const sectionHref = (hash: string) => (current === "top" ? hash : `/admin${hash}`);

  return (
    <div className="flex flex-col gap-2">
      {/* 画面の移動＝タブ。今いる場所が1つだけ白く浮く */}
      <nav className={aTabBar}>
        {PAGES.map((p) =>
          p.key === current ? (
            <span key={p.key} className={aTabCurrent} aria-current="page">
              {p.label}
            </span>
          ) : (
            <Link key={p.key} href={p.href} className={aTab}>
              {p.label}
              {p.key === "members" && pendingMembers > 0 ? (
                <span className="ml-1.5 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--red)] px-1 text-[10px] font-bold text-white">
                  {pendingMembers}
                </span>
              ) : null}
            </Link>
          )
        )}
      </nav>

      {/* 事務局管理トップの中のセクションへ（該当が0件の承認まわりは出さない） */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
        {pendingProjects > 0 ? (
          <Link href={sectionHref("#pj-review")} className="text-[var(--red)] underline">
            プロジェクト承認 {pendingProjects}
          </Link>
        ) : null}
        {sentBackProjects > 0 ? (
          <Link href={sectionHref("#pj-sentback")} className="text-[var(--red)] underline">
            差し戻し中 {sentBackProjects}
          </Link>
        ) : null}
        {SECTIONS.map((s) => (
          <Link key={s.hash} href={sectionHref(s.hash)} className="underline hover:text-[var(--green-d)]">
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
