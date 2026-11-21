// コミュニティの流れ（2026-11-21）。
//
// なぜ作るか（ユーザー指示 2026-11-21）:
//   「食の大きなコミュニティを実現したい」「名刺交換だけで終わらせず、共創事業を生み出す仕組み」
//
// ⚠️ **ここが関係性を維持する唯一の装置**。card-relationship.ts の計算では、交換しただけの関係は
//    約93日で「そろそろご連絡を」、約418日で「切れている」に落ちる。投稿への反応が接触として
//    数えられて初めて、名刺の枚数が「生きている関係」になる。
//    ⚠️ 接触としての加点はまだ入っていない（ContactLog の実装が先。2026-11-21時点では未着手）。
//
// ⚠️ 公開範囲は**カードを交換した相手＋自分**だけ（ユーザー判断「参加者同士だけで十分」）。
//    判定は feed.ts（サーバー）で行う。
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { listFeed, listComments, connectionIds } from "@/lib/feed";
import { EmptyState } from "@/components/EmptyState";
import { eyebrowCls, h1Cls } from "@/lib/ui";
import { Composer } from "./_components/Composer";
import { PostCard, type Author } from "./_components/PostCard";

export const metadata = { title: "みんなの取り組み" };

export default async function FeedPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const [posts, connections] = await Promise.all([listFeed(me.id), connectionIds(me.id)]);

  // コメントは表示する投稿のぶんだけ読む
  const commentsByPost = new Map(
    await Promise.all(
      posts.map(async (p) => [p.id, await listComments(me.id, p.id)] as const)
    )
  );

  // 書いた人の表示内容は Member から都度引く（投稿に複製していないため）
  const authorIds = [
    ...new Set([
      ...posts.map((p) => p.authorMemberId),
      ...[...commentsByPost.values()].flat().map((c) => c.authorMemberId),
    ]),
  ];
  const authors: Author[] = authorIds.length
    ? await prisma.member.findMany({
        where: { id: { in: authorIds } },
        select: {
          id: true, name: true, avatarUrl: true,
          categoryL1: true, prefecture: true, contactName: true,
        },
      })
    : [];
  const byId = new Map(authors.map((a) => [a.id, a]));

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

      {posts.length === 0 ? (
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
        <ul className="mt-6 flex flex-col gap-4">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard
                post={p}
                author={byId.get(p.authorMemberId)}
                comments={commentsByPost.get(p.id) ?? []}
                isMine={p.authorMemberId === me.id}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
