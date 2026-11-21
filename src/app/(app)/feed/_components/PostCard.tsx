// 1件の投稿。いいね・コメントはサーバーアクションのフォームで送る（JSが無くても動く）。
import Link from "next/link";
import { btn } from "@/lib/ui";
import type { FeedPost, FeedComment } from "@/lib/feed";
import { like, comment, removePost } from "../actions";

export type Author = {
  id: string;
  name: string;
  avatarUrl: string | null;
  categoryL1: string;
  prefecture: string | null;
  contactName: string | null;
};

function when(d: Date): string {
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}日前`;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

export function PostCard({
  post,
  author,
  comments,
  isMine,
}: {
  post: FeedPost;
  author: Author | undefined;
  comments: FeedComment[];
  isMine: boolean;
}) {
  const authorsById = new Map<string, Author>();
  if (author) authorsById.set(author.id, author);

  return (
    <article className="rounded-[10px] border border-[var(--line)] bg-white px-4 py-4 sm:px-5">
      {/* 書いた人 */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[#fcfcfb]">
          {author?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-5 text-[var(--ink)]">
            {author ? (
              <Link href={`/producers/${author.id}`} className="hover:underline">
                {author.name}
              </Link>
            ) : (
              "退会された方"
            )}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--muted)]">
            {[author?.categoryL1, author?.prefecture].filter(Boolean).join("・")}
            {author ? "　" : ""}
            {when(post.createdAt)}
          </p>
        </div>
        {isMine ? (
          <form action={removePost}>
            <input type="hidden" name="postId" value={post.id} />
            <button type="submit" className="text-[11px] text-[var(--muted)] hover:underline">
              削除
            </button>
          </form>
        ) : null}
      </div>

      {/* 本文 */}
      {post.body ? (
        <p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-[1.95] text-[var(--ink)]">
          {post.body}
        </p>
      ) : null}

      {/* 写真。非公開バケットなので配信口ごしに出す */}
      {post.imagePaths.length ? (
        <ul className={`mt-3 grid gap-2 ${post.imagePaths.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.imagePaths.map((_, i) => (
            <li key={i} className="overflow-hidden rounded-[8px] border border-[var(--line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/post-images/${post.id}?i=${i}`}
                alt=""
                loading="lazy"
                className="block w-full object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}

      {/* 記事リンク */}
      {post.linkUrl ? (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 block rounded-[8px] border border-[var(--line)] bg-[#fcfcfb] px-4 py-3 hover:bg-white"
        >
          <span className="block text-[13px] font-semibold leading-5 text-[var(--ink)]">
            {post.linkTitle || post.linkUrl}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">{post.linkUrl}</span>
        </a>
      ) : null}

      {/* いいね */}
      <div className="mt-3 flex items-center gap-3 border-t border-[var(--line-soft)] pt-3">
        <form action={like}>
          <input type="hidden" name="postId" value={post.id} />
          <button
            type="submit"
            aria-pressed={post.likedByMe}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
              post.likedByMe
                ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-d)]"
                : "border-[var(--line)] bg-white text-[var(--ink-2)]"
            }`}
          >
            いいね{post.likeCount ? ` ${post.likeCount}` : ""}
          </button>
        </form>
        <span className="text-[12px] text-[var(--muted)]">
          コメント{post.commentCount ? ` ${post.commentCount}` : ""}
        </span>
      </div>

      {/* コメント */}
      {comments.length ? (
        <ul className="mt-3 flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-[8px] bg-[#fcfcfb] px-3.5 py-2.5">
              <p className="text-[12px] font-semibold text-[var(--ink)]">
                {authorsById.get(c.authorMemberId)?.name ?? "会員"}
                <span className="ml-2 font-normal text-[var(--muted)]">{when(c.createdAt)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-[1.9] text-[var(--ink-2)]">
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={comment} className="mt-3 flex items-end gap-2">
        <input type="hidden" name="postId" value={post.id} />
        <label className="sr-only" htmlFor={`c-${post.id}`}>
          コメントを書く
        </label>
        <textarea
          id={`c-${post.id}`}
          name="body"
          rows={1}
          placeholder="コメントを書く"
          className="min-h-[40px] flex-1 resize-y rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-[13px] leading-6"
        />
        <button type="submit" className={btn("secondary", "sm")}>
          送る
        </button>
      </form>
    </article>
  );
}
