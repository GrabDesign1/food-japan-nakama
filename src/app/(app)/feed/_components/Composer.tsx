"use client";

// 投稿する欄。
// ⚠️ 入力は制御コンポーネントにする（React 19 はサーバーアクション完了時に form をリセットするため、
//    defaultValue 方式だと送信エラーで書いた文が消える。協賛フォームで踏んだ件）。
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { btn, input as inputCls } from "@/lib/ui";
import { POST_BODY_MAX, POST_IMAGE_MAX } from "@/lib/feed-core";
import { submitPost, peekLink, type PostState } from "../actions";

export function Composer({ myName }: { myName: string }) {
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // 貼ったURLから読んだ見出し（⑥リンクの見た目。2026-11-21）
  // ⚠️ 画像は外部URLをそのまま出さず「ありそう」の表示だけにする。
  //    実際の配信は投稿後に /api/link-image/[postId] を通す（CSP img-src 'self'）。
  const [peek, setPeek] = useState<{ siteName?: string | null; hasImage?: boolean; error?: string } | null>(null);
  const [peeking, startPeek] = useTransition();
  const peekedFor = useRef("");

  function readHeadline(url: string): void {
    const u = url.trim();
    if (!u || peekedFor.current === u) return;
    peekedFor.current = u;
    startPeek(async () => {
      const r = await peekLink(u);
      if (r.error) { setPeek({ error: r.error }); return; }
      setPeek({ siteName: r.siteName, hasImage: Boolean(r.imageUrl) });
      // 見出しを手で入れていなければ、読んだものを入れる
      setLinkTitle((prev) => (prev.trim() ? prev : r.title ?? ""));
    });
  }

  const [state, formAction, pending] = useActionState<PostState, FormData>(submitPost, {});

  // 送信に成功したときだけ空にする（失敗時は書いたものを残す）
  useEffect(() => {
    if (state?.ok) {
      setBody(""); setLinkUrl(""); setLinkTitle(""); setShowLink(false); setFiles([]);
      setPeek(null); peekedFor.current = "";
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [state]);

  const previews = files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  return (
    <form
      action={formAction}
      className="rounded-[10px] border border-[var(--line)] bg-white px-4 py-4 sm:px-5"
      noValidate
    >
      <label className="sr-only" htmlFor="post-body">
        投稿する内容
      </label>
      <textarea
        id="post-body"
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, POST_BODY_MAX))}
        rows={3}
        placeholder={`${myName}さん、いまどんな取り組みをしていますか`}
        className={`${inputCls()} w-full resize-y leading-[1.9]`}
      />

      {showLink ? (
        <div className="mt-3 flex flex-col gap-2">
          <input
            type="url"
            name="linkUrl"
            value={linkUrl}
            onChange={(e) => { setLinkUrl(e.target.value); setPeek(null); }}
            onBlur={(e) => readHeadline(e.target.value)}
            placeholder="https://… 記事やページのURL"
            className={`${inputCls("sm")} w-full`}
            inputMode="url"
            autoComplete="off"
          />
          <input
            type="text"
            name="linkTitle"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="リンクの見出し（空のままでもページから読みます）"
            className={`${inputCls("sm")} w-full`}
            autoComplete="off"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { peekedFor.current = ""; readHeadline(linkUrl); }}
              disabled={peeking || !linkUrl.trim()}
              className={btn("secondary", "sm")}
            >
              {peeking ? "読んでいます…" : "ページから見出しを読む"}
            </button>
            {peek?.error ? (
              <span className="text-[11px] leading-5 text-[var(--red)]">{peek.error}</span>
            ) : peek ? (
              <span className="text-[11px] leading-5 text-[var(--muted)]">
                {peek.siteName ? `${peek.siteName} から読みました。` : "読み取りました。"}
                {peek.hasImage ? "見出し画像つきで表示されます。" : "画像は見つかりませんでした。"}
              </span>
            ) : (
              <span className="text-[11px] leading-5 text-[var(--muted)]">
                URLを入れて欄の外を押すと、見出しを自動で読みます。
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          <input type="hidden" name="linkUrl" value="" />
          <input type="hidden" name="linkTitle" value="" />
        </>
      )}

      {previews.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {previews.map((p, i) => (
            <li key={p.url} className="relative">
              {/* 送信前のプレビュー。next/image は blob: を扱えないので img を使う */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-20 w-20 rounded-[6px] border border-[var(--line)] object-cover" />
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, n) => n !== i))}
                className="absolute -right-1.5 -top-1.5 h-6 w-6 rounded-full border border-[var(--line)] bg-white text-[12px] leading-none text-[var(--ink-2)]"
                aria-label={`${i + 1}枚目の写真を外す`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* 実際に送るファイル欄。見た目のボタンから開く */}
      <input
        ref={fileRef}
        type="file"
        name="images"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          setFiles((prev) => [...prev, ...picked].slice(0, POST_IMAGE_MAX));
        }}
      />

      {/* いたずら投稿よけ（人には見えない） */}
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {state?.error ? (
        <p className="mt-3 rounded-[8px] border border-[#E7C7BE] bg-[var(--red-soft)] px-3 py-2 text-[13px] leading-6 text-[var(--red)]">
          {state.error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={btn("secondary", "sm")}
          disabled={files.length >= POST_IMAGE_MAX}
        >
          写真を選ぶ{files.length ? `（${files.length}/${POST_IMAGE_MAX}）` : ""}
        </button>
        <button type="button" onClick={() => setShowLink((v) => !v)} className={btn("secondary", "sm")}>
          {showLink ? "リンクをやめる" : "記事のリンクを付ける"}
        </button>
        <span className="ml-auto text-[11px] text-[var(--muted)]">
          {body.length} / {POST_BODY_MAX}
        </span>
        <button type="submit" disabled={pending} className={btn("primary", "sm")}>
          {pending ? "送っています…" : "投稿する"}
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
        カードを交換した方にだけ表示されます。
      </p>
    </form>
  );
}
