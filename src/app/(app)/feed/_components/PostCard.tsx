"use client";

// 1件の投稿（2026-11-21）。
// いいね・コメント・返信・紹介・編集・削除は、すべてサーバーアクションのフォームで送る。
// ⚠️ フォーム送信なので、JSが動かない環境でも「いいね・コメント・削除」は使える。
//    写真の拡大と、欄の開け閉めだけがJSに依る（押しても何も起きない、にはならない）。
// ⚠️ 見える範囲・書ける範囲の判定はサーバー（feed.ts）。ここは見た目だけ。
import Link from "next/link";
import { useState } from "react";
import { btn, input as inputCls } from "@/lib/ui";
import type { FeedPost, FeedComment, FeedAuthor } from "@/lib/feed";
import { relativeTime, COMMENT_VISIBLE, COMMENT_BODY_MAX, POST_BODY_MAX } from "@/lib/feed-core";
import { like, comment, removePost, removeComment, editPost, sharePostAction } from "../actions";
import { Lightbox, type LightboxState } from "./Lightbox";

export type Author = FeedAuthor;

function AuthorLine({ author, children }: { author: Author | undefined; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[#fcfcfb]">
        {author?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** 紹介された元の投稿（枠の中に出す） */
function SharedBlock({ post, author }: { post: FeedPost; author: Author | undefined }) {
  const s = post.shared;
  if (!s) return null;

  if (!s.visible) {
    return (
      <div className="mt-3 rounded-[8px] border border-[var(--line)] bg-[#fcfcfb] px-4 py-3">
        <p className="text-[12px] leading-5 text-[var(--muted)]">
          {s.deleted
            ? "もとの投稿は削除されました。"
            : "もとの投稿は、書いた方とカードを交換している方にだけ表示されます。"}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-[8px] border border-[var(--line)] bg-[#fcfcfb] px-4 py-3">
      <p className="text-[12px] font-semibold leading-5 text-[var(--ink)]">
        {author ? (
          <Link href={`/producers/${author.id}`} className="hover:underline">
            {author.name}
          </Link>
        ) : (
          "退会された方"
        )}
        {s.createdAt ? (
          <span className="ml-2 font-normal text-[var(--muted)]" suppressHydrationWarning>
            {relativeTime(s.createdAt)}
          </span>
        ) : null}
      </p>
      {s.body ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-[1.9] text-[var(--ink-2)]">
          {s.body}
        </p>
      ) : null}
      {s.imageCount ? (
        <ul className={`mt-2 grid gap-2 ${s.imageCount === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {Array.from({ length: s.imageCount }).map((_, i) => (
            <li key={i} className="overflow-hidden rounded-[6px] border border-[var(--line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/post-images/${s.id}?i=${i}`} alt="" loading="lazy" className="block w-full object-cover" />
            </li>
          ))}
        </ul>
      ) : null}
      {s.linkUrl ? (
        <a
          href={s.linkUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2 block truncate text-[12px] text-[var(--green-d)] hover:underline"
        >
          {s.linkTitle || s.linkUrl}
        </a>
      ) : null}
    </div>
  );
}

/** 記事リンクのカード（見出し画像つき） */
function LinkCard({ post }: { post: FeedPost }) {
  if (!post.linkUrl) return null;
  let host = "";
  try {
    host = new URL(post.linkUrl).hostname.replace(/^www\./, "");
  } catch {
    host = post.linkUrl;
  }
  return (
    <a
      href={post.linkUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="mt-3 block overflow-hidden rounded-[8px] border border-[var(--line)] bg-[#fcfcfb] hover:bg-white"
    >
      {post.hasLinkImage ? (
        // 外部URLは直に書かない。自分のところを通して配る（/api/link-image）
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/link-image/${post.id}`}
          alt=""
          loading="lazy"
          className="block max-h-[280px] w-full border-b border-[var(--line)] object-cover"
        />
      ) : null}
      <span className="block px-4 py-3">
        <span className="block text-[11px] uppercase tracking-wide text-[var(--muted)]">
          {post.linkSiteName || host}
        </span>
        <span className="mt-1 block text-[13px] font-semibold leading-5 text-[var(--ink)]">
          {post.linkTitle || post.linkUrl}
        </span>
      </span>
    </a>
  );
}

export function PostCard({
  post,
  author,
  comments,
  authorsById,
  isMine,
}: {
  post: FeedPost;
  author: Author | undefined;
  comments: FeedComment[];
  authorsById: Record<string, Author>;
  isMine: boolean;
}) {
  const [box, setBox] = useState<LightboxState>(null);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [editTitle, setEditTitle] = useState(post.linkTitle ?? "");
  const [sharing, setSharing] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const imageSrcs = post.imagePaths.map((_, i) => `/api/post-images/${post.id}?i=${i}`);

  // 枝は1段だけ。親ごとに返信をまとめる
  const tops = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);
  const shownTops = showAll || tops.length <= COMMENT_VISIBLE ? tops : tops.slice(-COMMENT_VISIBLE);
  const hiddenCount = tops.length - shownTops.length;

  return (
    <article
      id={`p-${post.id}`}
      className="scroll-mt-20 rounded-[10px] border border-[var(--line)] bg-white px-4 py-4 sm:px-5"
    >
      <AuthorLine author={author}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-5 text-[var(--ink)]">
              {author ? (
                <Link href={`/producers/${author.id}`} className="hover:underline">
                  {author.name}
                </Link>
              ) : (
                "退会された方"
              )}
              {post.shared ? (
                <span className="ml-1 whitespace-nowrap text-[12px] font-normal text-[var(--muted)]">が紹介しました</span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-[var(--muted)]" suppressHydrationWarning>
              {[author?.categoryL1, author?.prefecture].filter(Boolean).join("・")}
              {author ? "　" : ""}
              {relativeTime(post.createdAt)}
              {post.editedAt ? "・編集済み" : ""}
            </p>
          </div>
          {isMine ? (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => { setEditing((v) => !v); setEditBody(post.body); setEditTitle(post.linkTitle ?? ""); }}
                className="text-[11px] text-[var(--muted)] hover:underline"
              >
                {editing ? "やめる" : "編集"}
              </button>
              <form action={removePost}>
                <input type="hidden" name="postId" value={post.id} />
                <button type="submit" className="text-[11px] text-[var(--muted)] hover:underline">
                  削除
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </AuthorLine>

      {/* 本文（編集中は書き換え欄） */}
      {editing ? (
        <form action={editPost} className="mt-3">
          <input type="hidden" name="postId" value={post.id} />
          <textarea
            name="body"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value.slice(0, POST_BODY_MAX))}
            rows={4}
            className={`${inputCls()} w-full resize-y leading-[1.9]`}
          />
          {post.linkUrl ? (
            <input
              type="text"
              name="linkTitle"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="リンクの見出し"
              className={`${inputCls("sm")} mt-2 w-full`}
            />
          ) : null}
          <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
            写真とリンク先のURLは差し替えられません（読んだ方にとって別のものになってしまうため）。
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button type="submit" className={btn("primary", "sm")}>
              直す
            </button>
            <button type="button" onClick={() => setEditing(false)} className={btn("secondary", "sm")}>
              やめる
            </button>
          </div>
        </form>
      ) : post.body ? (
        <p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-[1.95] text-[var(--ink)]">
          {post.body}
        </p>
      ) : null}

      {/* 紹介された元の投稿 */}
      {post.shared ? (
        <SharedBlock
          post={post}
          author={post.shared.authorMemberId ? authorsById[post.shared.authorMemberId] : undefined}
        />
      ) : null}

      {/* 写真。非公開バケットなので配信口ごしに出す。押すと大きくなる */}
      {post.imagePaths.length ? (
        <ul className={`mt-3 grid gap-2 ${post.imagePaths.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {imageSrcs.map((src, i) => (
            <li key={i} className="overflow-hidden rounded-[8px] border border-[var(--line)]">
              <button
                type="button"
                onClick={() => setBox({ srcs: imageSrcs, index: i })}
                className="block w-full cursor-zoom-in"
                aria-label={`${i + 1}枚目の写真を大きく見る`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="block w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <LinkCard post={post} />

      {/* いいね・コメント数・紹介 */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--line-soft)] pt-3">
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
        {!isMine ? (
          <button
            type="button"
            onClick={() => setSharing((v) => !v)}
            className="text-[12px] text-[var(--muted)] hover:underline"
          >
            {sharing ? "紹介をやめる" : "紹介する"}
          </button>
        ) : null}
      </div>

      {/* 紹介（シェア）の欄 */}
      {sharing ? (
        <form action={sharePostAction} className="mt-3 rounded-[8px] bg-[#fcfcfb] px-3.5 py-3">
          <input type="hidden" name="postId" value={post.id} />
          <label className="block text-[12px] font-semibold text-[var(--ink)]" htmlFor={`s-${post.id}`}>
            ひとこと添えて、自分のつながりに紹介します
          </label>
          <textarea
            id={`s-${post.id}`}
            name="body"
            rows={2}
            placeholder="この取り組み、うちでも組めそうです"
            className={`${inputCls("sm")} mt-2 w-full resize-y leading-[1.9]`}
          />
          <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
            この投稿を読めるのは、もとの方とカードを交換している方だけです。読めない方には「表示できません」と出ます。
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button type="submit" className={btn("primary", "sm")}>
              紹介する
            </button>
            <button type="button" onClick={() => setSharing(false)} className={btn("secondary", "sm")}>
              やめる
            </button>
          </div>
        </form>
      ) : null}

      {/* コメント（返信は1段だけ下げる） */}
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 text-[12px] text-[var(--muted)] hover:underline"
        >
          前のコメント{hiddenCount}件を見る
        </button>
      ) : null}

      {shownTops.length ? (
        <ul className="mt-3 flex flex-col gap-3">
          {shownTops.map((c) => (
            <li key={c.id}>
              <CommentRow
                c={c}
                authorsById={authorsById}
                canDelete={isMine || c.authorMemberId === post.authorMemberId}
                onReply={(name) => setReplyTo({ id: c.id, name })}
              />
              {repliesOf(c.id).length ? (
                <ul className="mt-2 flex flex-col gap-2 border-l-2 border-[var(--line)] pl-3 sm:pl-4">
                  {repliesOf(c.id).map((r) => (
                    <li key={r.id}>
                      <CommentRow
                        c={r}
                        authorsById={authorsById}
                        canDelete={isMine || r.authorMemberId === post.authorMemberId}
                        onReply={(name) => setReplyTo({ id: c.id, name })}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <form action={comment} className="mt-3">
        <input type="hidden" name="postId" value={post.id} />
        <input type="hidden" name="parentId" value={replyTo?.id ?? ""} />
        {replyTo ? (
          <p className="mb-1.5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
            {replyTo.name}さんへの返信
            <button type="button" onClick={() => setReplyTo(null)} className="hover:underline">
              やめる
            </button>
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor={`c-${post.id}`}>
            コメントを書く
          </label>
          <textarea
            id={`c-${post.id}`}
            name="body"
            rows={1}
            maxLength={COMMENT_BODY_MAX}
            placeholder={replyTo ? "返信を書く" : "コメントを書く"}
            className="min-h-[40px] flex-1 resize-y rounded-[8px] border border-[var(--line)] bg-white px-3 py-2 text-[13px] leading-6"
          />
          <button type="submit" className={btn("secondary", "sm")}>
            送る
          </button>
        </div>
      </form>

      <Lightbox
        state={box}
        onClose={() => setBox(null)}
        onMove={(index) => setBox((b) => (b ? { ...b, index } : b))}
      />
    </article>
  );
}

function CommentRow({
  c,
  authorsById,
  canDelete,
  onReply,
}: {
  c: FeedComment;
  authorsById: Record<string, Author>;
  canDelete: boolean;
  onReply: (name: string) => void;
}) {
  const a = authorsById[c.authorMemberId];
  const name = a?.name ?? "会員";
  return (
    <div className="rounded-[8px] bg-[#fcfcfb] px-3.5 py-2.5">
      <p className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[var(--ink)]">
        {a ? (
          <Link href={`/producers/${a.id}`} className="hover:underline">
            {name}
          </Link>
        ) : (
          name
        )}
        <span className="font-normal text-[var(--muted)]" suppressHydrationWarning>
          {relativeTime(c.createdAt)}
        </span>
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-[1.9] text-[var(--ink-2)]">
        {c.body}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onReply(name)}
          className="text-[11px] text-[var(--muted)] hover:underline"
        >
          返信
        </button>
        {canDelete ? (
          <form action={removeComment}>
            <input type="hidden" name="commentId" value={c.id} />
            <button type="submit" className="text-[11px] text-[var(--muted)] hover:underline">
              削除
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
