// コミュニティの流れ（2026-11-21）。
//
// なぜ作るか（ユーザー指示 2026-11-21）:
//   「食の大きなコミュニティを実現したい」「名刺交換だけで終わらせず、共創事業を生み出す仕組み」
//
// ⚠️ **ここが関係性を維持する唯一の装置**。card-relationship.ts の計算では、交換しただけの関係は
//    約93日で「そろそろご連絡を」、約418日で「切れている」に落ちる。投稿への反応が接触として
//    数えられて初めて、名刺の枚数が「生きている関係」になる。
//    加点は actions.ts から relationship.ts の recordContact() を呼んで記録する
//    （いいね +15 / コメント +35。2026-11-21 実装済み）。
//
// ⚠️ 公開範囲は**カードを交換した相手＋自分**だけ（ユーザー判断「参加者同士だけで十分」）。
//    判定は feed.ts（サーバー）で行う。
//
// ⚠️ 「もっと読む」は**件数を増やして読み直す**作り（?shown=40）。
//    クライアント側で継ぎ足すと、いいねを押したあとの作り直しで継ぎ足した分が古いまま残る。
//    URLに出しておけば、戻ってきても同じところが開く。
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import {
  loadFeedPage, connectionIds, normalizeShown, FEED_PAGE_SIZE, FEED_MAX_SHOWN,
} from "@/lib/feed";
import { feedEmailEnabled } from "@/lib/feed-notify";
import { EmptyState } from "@/components/EmptyState";
import { eyebrowCls, h1Cls, btn } from "@/lib/ui";
import { Composer } from "./_components/Composer";
import { PostCard, type Author } from "./_components/PostCard";
import { toggleFeedEmail } from "./actions";

export const metadata = { title: "みんなの取り組み" };

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ shown?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const { shown: shownRaw } = await searchParams;
  const shown = normalizeShown(shownRaw);

  const [page, connections, mailOn] = await Promise.all([
    loadFeedPage(me.id, { take: shown }),
    connectionIds(me.id),
    feedEmailEnabled(su.app.id),
  ]);

  const byId: Record<string, Author> = {};
  for (const a of page.authors) byId[a.id] = a;

  const lastId = page.posts[page.posts.length - 1]?.id;

  return (
    <div className="mx-auto max-w-[680px] px-4 py-8">
      <div className={eyebrowCls}>COMMUNITY</div>
      <h1 className={`${h1Cls} mt-1`}>みんなの取り組み</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-2)]">
        いまやっていること、記事、現場の写真を書いてください。
        カードを交換した{connections.length ? `${connections.length}名の` : ""}方にだけ表示されます。
      </p>

      <div className="mt-6">
        <Composer myName={me.contactName || me.name} />
      </div>

      {page.posts.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={connections.length === 0 ? "まだつながっている方がいません" : "まだ投稿がありません"}
            description={
              connections.length === 0
                ? "交換カードで名刺を交換すると、その方の取り組みがここに流れます。"
                : "最初の1本を書いてみてください。現場の写真1枚でも、十分に伝わります。"
            }
            actions={
              connections.length === 0
                ? [{ label: "交換カードへ", href: "/cards", variant: "primary" as const }]
                : undefined
            }
          />
        </div>
      ) : (
        <>
          <ul className="mt-6 flex flex-col gap-4">
            {page.posts.map((p) => (
              <li key={p.id}>
                <PostCard
                  post={p}
                  author={byId[p.authorMemberId]}
                  comments={page.comments[p.id] ?? []}
                  authorsById={byId}
                  isMine={p.authorMemberId === me.id}
                />
              </li>
            ))}
          </ul>

          {page.hasMore ? (
            <div className="mt-6 text-center">
              {/* 読み込んだ最後の投稿に戻るので、押しても見ていた場所を失わない */}
              <Link
                href={`/feed?shown=${shown + FEED_PAGE_SIZE}${lastId ? `#p-${lastId}` : ""}`}
                className={btn("secondary", "md")}
                scroll={false}
              >
                もっと読む
              </Link>
            </div>
          ) : shown >= FEED_MAX_SHOWN ? (
            <p className="mt-6 text-center text-[12px] text-[var(--muted)]">
              ここまでが直近{FEED_MAX_SHOWN}件です。
            </p>
          ) : null}
        </>
      )}

      {/* 通知メールの受け取り（ユーザー指示 2026-11-21「書き込んだらメールが飛ぶようにしてよ」）。
          ⚠️ 止める手段を必ず画面に置く。止められないお知らせは、やがて迷惑メール扱いになる。 */}
      <form
        action={toggleFeedEmail}
        className="mt-10 rounded-[10px] border border-[var(--line)] bg-[#fcfcfb] px-4 py-4"
      >
        <p className="text-[13px] font-semibold text-[var(--ink)]">お知らせメール</p>
        <p className="mt-1 text-[12px] leading-6 text-[var(--ink-2)]">
          自分の投稿へのコメント・いいね・紹介と、自分のコメントへの返信を
          {mailOn ? "メールでお知らせしています。" : "いまはお知らせしていません。"}
          <br />
          いいねは、同じ投稿について1日1通までにしています。
        </p>
        <input type="hidden" name="enabled" value={mailOn ? "0" : "1"} />
        <button type="submit" className={`${btn("secondary", "sm")} mt-3`}>
          {mailOn ? "お知らせメールを止める" : "お知らせメールを受け取る"}
        </button>
      </form>
    </div>
  );
}
