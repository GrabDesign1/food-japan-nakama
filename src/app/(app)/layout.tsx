// ログイン後の共通レイアウト（左サイドメニュー ＋ 上部バー）。
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signOut } from "../(auth)/actions";
import { MobileNav } from "./_components/MobileNav";
import { MessagePeek } from "./_components/MessagePeek";
import { TopBarNav } from "./_components/TopBarNav";
import { NavIcon } from "./_components/NavIcon";
import { incomingRequestCount } from "@/lib/connections";
import { btn } from "@/lib/ui";

type NavItem = { label: string; href: string; ready?: boolean; admin?: boolean; section?: string };

// 上位＝利用者の主要行動。商談と商談ステータスの併記はやめ「進行中の活動」に一本化
// （ボードは /deals 内の「ボードで見る」から到達）。
const NAV: NavItem[] = [
  // ── よく使う4つ（見出しなし）。2026-11-27 ユーザー指示「機能の整理とわかりやすさを最大限」。
  //    ⚠️⚠️ **ここを5つ以上に増やさないこと。** 増やすと「よく使う」が意味を失い、
  //       結局どれも探すことになる（20項目が平らに並んでいたのが元の状態）。
  { label: "ホーム", href: "/dashboard", ready: true },
  { label: "案件を探す", href: "/search", ready: true },
  { label: "メッセージ", href: "/messages", ready: true },
  // 仲間の申請（2026-11-27）。⚠️ 承認はこの1か所だけ。プロフィール側に増やさないこと
  { label: "つながり", href: "/connections", ready: true },

  // ── 人を見つける
  // 生産者×流通の突き合わせ（2026-11-26）
  { label: "オススメの仲間", href: "/matching", ready: true, section: "人を見つける" },
  // ⚠️ 会員を見る入口がナビに1つも無く「探してもない」とご指摘（2026-11-25）
  { label: "メンバーを見る", href: "/members", ready: true, section: "人を見つける" },
  { label: "交換カード", href: "/cards", ready: true, section: "人を見つける" },

  // ── 商いを動かす
  { label: "売りたい・探している", href: "/ledger", ready: true, section: "商いを動かす" },
  { label: "進行中の活動", href: "/deals", ready: true, section: "商いを動かす" },
  { label: "共創プロジェクト", href: "/projects", ready: true, section: "商いを動かす" },
  { label: "お気に入り", href: "/favorites", ready: true, section: "商いを動かす" },

  // ── 集まる・読む
  // ⚠️ 「みんなの取り組み」はホームに一本化した（2026-11-26）。入口を2つに戻さないこと
  { label: "集まりたい", href: "/gatherings", ready: true, section: "集まる・読む" },
  // 仲間が共有した記事＋事務局ピック（2026-11-25）
  { label: "食のキュレーション", href: "/curation", ready: true, section: "集まる・読む" },
  // サミットで会った方の一覧（2026-11-25 ユーザー指示「参加した人のページをつくりたい」）
  { label: "サミットで会った人", href: "/summit", ready: true, section: "集まる・読む" },
  // 開催報告（セッションごとの記事）。会員だけが読む（2026-11-25）
  { label: "開催報告を読む", href: "/summit/reports", ready: true, section: "集まる・読む" },
  // 宮崎2026の写真・動画・記事を持ち寄る場所（2026-11-26）
  { label: "みんなの記録（写真・動画）", href: "/summit/share", ready: true, section: "集まる・読む" },

  // ── アカウント
  { label: "プロフィール", href: "/profile", ready: true, section: "アカウント" },
  { label: "プラン・お支払い", href: "/billing", ready: true, section: "アカウント" },
  // ⚠️⚠️ 2026-11-27 実測：**/report（違反報告）は作ってあるのに、どこからも行けなかった**
  //    （ソース全体で参照0件）。作った機能をUIに繋ぐ、の原則どおりここに出す。
  //    ⚠️ 相手や案件を指定して報告する場合は `/report?targetType=member&targetId=...`。
  //       プロフィール側からの導線は producers/[id] にある。
  { label: "違反を報告する", href: "/report", ready: true, section: "アカウント" },
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
  const [member, unread, pendingConnections, pendingReview] = await Promise.all([
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
    // 届いている仲間の申請（2026-11-27）。⚠️ 未読と同じく、ナビのバッジに出す
    memberId ? incomingRequestCount(memberId) : Promise.resolve(0),
    // 事務局向け：審査待ち会員の件数（「事務局管理」にバッジ表示）
    admin
      ? prisma.member.count({ where: { tenantId: su.app.tenantId, status: "PENDING" } })
      : Promise.resolve(0),
  ]);

  return (
    // minmax(0,1fr)：中身が広くても列を押し広げない＝ページ全体の横スクロールを防ぐ
    // ⚠️ app-tone＝ログイン後だけのトーン（globals.css）。外すと会員画面が元の緑に戻る
    <div className="app-tone grid min-h-screen grid-cols-1 md:grid-cols-[238px_minmax(0,1fr)]">
      {/* キーボードでナビを飛ばして本文へ（普段は見えない） */}
      <a href="#main" className="skip-link">
        本文へスキップ
      </a>
      {/* サイドバー（PCのみ。スマホはヘッダーのメニューから） */}
      <aside className="on-dark sticky top-0 hidden h-screen flex-col overflow-y-auto bg-[var(--ink)] py-6 text-[#E7EBE4] md:flex print:hidden">
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
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] transition hover:bg-white/8"
                >
                  {/*
                    ⚠️ 絵柄は行き先で決まる（NavIcon.tsx）。⚠️ 無い行き先は何も出ない。
                    ⚠️⚠️ 絵柄のぶん幅が減り、「みんなの記録（写真・動画）」が2行に折れた（実測）。
                       16px＋`gap-2`＋左右の余白を詰めて1行に戻している。⚠️ これ以上広げないこと。
                  */}
                  <NavIcon href={item.href} size={16} />
                  <span>{item.label}</span>
                  {item.href === "/messages" && unread > 0 ? (
                    <span className="ml-auto rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  ) : null}
                  {item.href === "/connections" && pendingConnections > 0 ? (
                    <span className="ml-auto rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pendingConnections}
                    </span>
                  ) : null}
                  {item.href === "/admin" && pendingReview > 0 ? (
                    <span className="ml-auto rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pendingReview}
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
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--line)] bg-white px-4 py-3 md:px-8 print:hidden">
          {/* スマホ用：メニュー＋ブランド */}
          <MobileNav items={items.filter((i) => i.ready).map((i) => ({ label: i.label, href: i.href, admin: i.admin, section: i.section }))} unread={unread} />
          <Link href="/" className="flex items-center gap-2 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" width={24} height={24} />
            <span className="font-serif text-[13px] tracking-[0.08em] text-[var(--ink)]">
              FOOD JAPAN <span className="text-[var(--green-d)]">NAKAMA</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right text-[12px] leading-tight sm:block">
              <div className="text-[var(--ink)]">{su.app.name}</div>
              <div className="text-[11px] text-[var(--muted)]">
                {ROLE_LABEL[su.app.role] ?? su.app.role}
              </div>
            </div>
            {/*
              メッセージの入口と、届いている件数（2026-11-27 ユーザーご指示）。
              ⚠️⚠️ **アバターとは別の丸**（同日「アイコンわけてよ。」）。重ねると顔写真が読みにくい。
              ⚠️ 件数はここで数えた `unread` を渡す（⚠️⚠️ 中の一覧は、押したときにだけ読みに行く）。
            */}
            {/*
              よく行く画面の丸いアイコン（2026-11-27 ユーザーご指示・Facebook の上の帯に合わせた）。
              ⚠️ つながりの丸には、届いている申請の件数を出す。
            */}
            <TopBarNav pending={pendingConnections} />
            <MessagePeek unread={unread} />
            {/* ⚠️ 狭い画面では出さない（メッセージの丸が増え、ロゴが3行に折れたため・375px で実測） */}
            {/*
              ⚠️ 2026-11-27：ただの丸から、プロフィールへのリンクにした
                 （ユーザー指示「ボタンリンクも表示して」。Facebook の右上のアカウントと同じ）。
            */}
            <Link
              href="/profile"
              title="プロフィール"
              aria-label="プロフィール"
              className="hidden h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white font-serif text-[15px] text-[var(--green-d)] transition hover:border-[var(--ink)] sm:grid"
            >
              {member?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </Link>
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
        <main id="main" className="max-w-[1200px] px-4 py-6 pb-24 md:px-8 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
