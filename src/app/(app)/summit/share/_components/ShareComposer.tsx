"use client";

// 特設ページへ出す欄（写真・動画URL・記事URL）。2026-11-26
// ⚠️ 入力は制御コンポーネントにする（React 19 はサーバーアクション完了時に form をリセットするため、
//    defaultValue 方式だと送信エラーで書いた文が消える）。
import { useActionState, useEffect, useRef, useState } from "react";
import { btn, input as inputCls } from "@/lib/ui";
import { SHARE_BODY_MAX, SHARE_IMAGE_MAX } from "@/lib/summit-share-shared";
import { submitShare, type ShareState } from "../actions";

export function ShareComposer() {
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [state, formAction, pending] = useActionState<ShareState, FormData>(submitShare, {});

  useEffect(() => {
    if (state?.ok) {
      setBody(""); setUrl(""); setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [state]);

  const previews = files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  return (
    <form action={formAction} className="rounded-[12px] border border-[var(--line)] bg-white p-5" noValidate>
      <p className="text-[14px] font-bold text-[var(--ink)]">当日の写真・動画・記事を共有する</p>
      <p className="mt-1 text-[12px] leading-6 text-[var(--ink-2)]">
        会場の写真、撮った動画のURL（YouTube・Instagramなど）、取り上げられた記事のURL。どれでも構いません。
      </p>

      <label className="sr-only" htmlFor="share-body">ひとこと</label>
      <textarea
        id="share-body"
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, SHARE_BODY_MAX))}
        rows={3}
        placeholder="ひとこと（どの場面か、どなたと写っているか など）"
        className={`${inputCls()} mt-4 w-full resize-y leading-[1.9]`}
      />

      <label className="sr-only" htmlFor="share-url">動画・記事のURL</label>
      <input
        id="share-url"
        type="url"
        name="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://… 動画や記事のURL（任意）"
        className={`${inputCls("sm")} mt-2 w-full`}
        inputMode="url"
        autoComplete="off"
      />

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

      <input
        ref={fileRef}
        type="file"
        name="images"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          setFiles((prev) => [...prev, ...picked].slice(0, SHARE_IMAGE_MAX));
        }}
      />
      {/* いたずらよけ（人には見えない） */}
      <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" />

      {state?.error ? (
        <p className="mt-3 rounded-[8px] border border-[#E7C7BE] bg-[var(--red-soft)] px-3 py-2 text-[13px] leading-6 text-[var(--red)]">
          {state.error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={btn("secondary", "sm")}
          disabled={files.length >= SHARE_IMAGE_MAX}
        >
          写真を選ぶ{files.length ? `（${files.length}/${SHARE_IMAGE_MAX}）` : ""}
        </button>
        <span className="ml-auto text-[11px] text-[var(--muted)]">{body.length} / {SHARE_BODY_MAX}</span>
        <button type="submit" disabled={pending} className={btn("primary", "sm")}>
          {pending ? "送っています…" : "共有する"}
        </button>
      </div>

      {/* ⚠️ ここを消さない。出すか出さないかを、書く前に伝える */}
      <p className="mt-3 border-t border-[var(--line)] pt-3 text-[11px] leading-6 text-[var(--muted)]">
        共有したものは、まず<strong className="text-[var(--ink-2)]">会員だけが見られます</strong>。
        誰でも見られる公開ページに出すのは、事務局が選んだものだけです（写っている方の同意を確かめてから出します）。
        自分が出したものは、いつでも消せます。
      </p>
    </form>
  );
}
