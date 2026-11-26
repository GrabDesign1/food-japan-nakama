// 宮崎2026 特設ページ（会員側）。2026-11-26 ユーザー指示
//   「2026 宮崎 の特設サイトを作って、皆からの写真の共有、動画の共有、記事の共有をするページを準備して」
//
// ⚠️⚠️ ここは**集める場所**。出すのは事務局が選んだものだけ（公開側は /summit/2026-miyazaki）。
// ⚠️ 会員だけが見る（(app) の中なのでログインが要る）。
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { listShares, countShares } from "@/lib/summit-share";
import { SUMMIT_EVENTS, findSummitEvent, normalizeEventSlug } from "@/lib/summit-share-shared";
import { EmptyState } from "@/components/EmptyState";
import { btn, eyebrowCls, h1Cls } from "@/lib/ui";
import { ShareComposer } from "./_components/ShareComposer";
import { ShareCard } from "./_components/ShareCard";
import { removeMyShare, toggleFeatured, removeShareAsAdmin } from "./actions";

export const metadata: Metadata = {
  title: "みんなの記録",
  robots: { index: false, follow: false },
};

export default async function SummitSharePage({
  searchParams,
}: {
  searchParams?: Promise<{ e?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const admin = isAdminRole(su.app.role);

  // ⚠️ 知らない値が来ても落とさない。既定の開催に寄せる
  const slug = normalizeEventSlug((await searchParams)?.e);
  const ev = findSummitEvent(slug)!;

  const [shares, publicCount] = await Promise.all([
    listShares({ eventSlug: slug, viewerMemberId: me.id }),
    countShares(slug, true),
  ]);

  return (
    <div className="mx-auto max-w-[680px] px-4 py-8">
      <div className={eyebrowCls}>{ev.name}</div>
      <h1 className={`${h1Cls} mt-1`}>{ev.shortName} みんなの記録</h1>
      <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
        {ev.dates}／{ev.place}。写真・動画・記事を持ち寄る場所です。
        当日の様子、登壇の記録、紹介された記事。お持ちのものを共有してください。
      </p>

      {/* 開催の切り替え。⚠️ 開催を増やすときは summit-share-shared.ts に1行足すだけ */}
      {SUMMIT_EVENTS.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUMMIT_EVENTS.map((o) => (
            <Link
              key={o.slug}
              href={`/summit/share?e=${o.slug}`}
              aria-current={o.slug === slug ? "page" : undefined}
              className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold ${
                o.slug === slug
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--ink)]"
              }`}
            >
              {o.shortName}
            </Link>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
        <Link href="/summit/reports" className="font-bold text-[var(--green-d)] hover:underline">
          セッションごとの開催報告を読む →
        </Link>
      </p>

      <div className="mt-6">
        <ShareComposer eventSlug={slug} eventName={ev.shortName} />
      </div>

      {publicCount > 0 ? (
        <p className="mt-4 text-[12px] text-[var(--muted)]">
          このうち {publicCount}件 を
          <a href={`/summit/${slug}`} target="_blank" rel="noreferrer" className="ml-1 underline">
            公開ページ
          </a>
          に出しています。
        </p>
      ) : null}

      {shares.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="まだ1件もありません"
            description="最初の1枚を上げてみてください。会場の写真1枚でも、その日を思い出す手がかりになります。"
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-5">
          {shares.map((s) => (
            <li key={s.id}>
              <ShareCard
                s={s}
                actions={
                  <>
                    {s.featured ? (
                      <span className="rounded-full bg-[var(--green-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--green-d)]">
                        公開ページに出ています
                      </span>
                    ) : null}
                    {s.mine ? (
                      <form action={removeMyShare}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className={btn("secondary", "sm")}>消す</button>
                      </form>
                    ) : null}
                    {admin ? (
                      <>
                        {/* ⚠️⚠️ 写っている方の同意を確かめてから押すこと */}
                        <form action={toggleFeatured}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="on" value={s.featured ? "0" : "1"} />
                          <button className={btn(s.featured ? "secondary" : "primary", "sm")}>
                            {s.featured ? "公開をやめる" : "公開ページに出す"}
                          </button>
                        </form>
                        {!s.mine ? (
                          <form action={removeShareAsAdmin}>
                            <input type="hidden" name="id" value={s.id} />
                            <button className={btn("danger", "sm")}>事務局として消す</button>
                          </form>
                        ) : null}
                      </>
                    ) : null}
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
