"use client";

import { useActionState, useEffect, useRef } from "react";
import { createArticle, type ArticleState } from "../article-actions";
import { btn } from "@/lib/ui";

const INIT: ArticleState = {};
const inputCls =
  "rounded-md border border-[var(--line)] px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]";

export function ArticleManager() {
  const [state, action, pending] = useActionState(createArticle, INIT);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok, state.message]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-[10px] border border-[var(--line)] bg-white p-4"
    >
      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        記事タイトル
        <input name="title" required placeholder="例：規格外野菜のアップサイクルが加速" className={inputCls} />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
          出典
          <input name="source" required placeholder="PR TIMES / note / 日本経済新聞 など" className={inputCls} list="article-sources" />
          <datalist id="article-sources">
            <option value="PR TIMES" />
            <option value="note" />
            <option value="日本経済新聞" />
            <option value="その他" />
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
          記事URL
          <input name="url" required placeholder="https://prtimes.jp/..." className={inputCls} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        サムネイル画像URL（任意）
        <input name="imageUrl" placeholder="https://.../ogp.jpg" className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        概要（任意）
        <textarea name="excerpt" rows={2} placeholder="記事の要約を1〜2行で" className={inputCls} />
      </label>

      <div className="flex items-center gap-3">
        <button disabled={pending} className={`${btn("primary", "sm")} ml-auto`}>
          {pending ? "追加中…" : "記事を追加"}
        </button>
      </div>
      {state.error ? <p className="text-[12px] text-[var(--red)]">{state.error}</p> : null}
      {state.ok ? <p className="text-[12px] text-[var(--green-d)]">{state.message}</p> : null}
    </form>
  );
}
