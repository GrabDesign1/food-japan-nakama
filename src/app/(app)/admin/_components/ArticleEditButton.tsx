"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateArticle, type ArticleState } from "../article-actions";
import { btn } from "@/lib/ui";
import { ArticleFields, type ArticleDefaults } from "./ArticleFields";

// 記事1件を編集するモーダル。
//
// ⚠️ モーダル本体は**行の中に置かない**。管理画面の行は横並びのボタンが密集していて、
//    中に置くとモーダル内のクリックが行側のボタンに当たる。トリガーとモーダルを同じ
//    コンポーネントに閉じ込め、モーダルは position:fixed で画面全体に出す。
// ⚠️ 保存に成功したら閉じる。閉じるときに state を捨てるため、フォームは開くたびに
//    作り直している（key を付け替える必要がないよう、開いているときだけ描画する）。

const INIT: ArticleState = {};

export function ArticleEditButton({
  id,
  title,
  defaults,
  active,
}: {
  id: string;
  title: string;
  defaults: ArticleDefaults;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn("secondary", "sm")}>
        編集
      </button>
      {open ? (
        <ArticleEditModal
          id={id}
          title={title}
          defaults={defaults}
          active={active}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ArticleEditModal({
  id,
  title,
  defaults,
  active,
  onClose,
}: {
  id: string;
  title: string;
  defaults: ArticleDefaults;
  active: boolean;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(updateArticle.bind(null, id), INIT);

  // ⚠️ React 19 はサーバーアクション完了時に form をリセットする。エラーで開いたままだと
  //    入力中の内容が消えるので、**返ってきた values で form を作り直して入れ直す**。
  //    key を変えることで React に別要素として再マウントさせている。
  const seq = useRef(0);
  const lastError = useRef<string | undefined>(undefined);
  if (state.error && state.error !== lastError.current) {
    lastError.current = state.error;
    seq.current += 1;
  }
  const v = state.values;
  const d: ArticleDefaults = v
    ? {
        source: String(v.source ?? ""),
        author: String(v.author ?? ""),
        url: String(v.url ?? ""),
        title: String(v.title ?? ""),
        imageUrl: String(v.imageUrl ?? ""),
        excerpt: String(v.excerpt ?? ""),
        fromSummit: Boolean(v.fromSummit),
        publishStart: String(v.publishStart ?? ""),
        publishEnd: String(v.publishEnd ?? ""),
      }
    : defaults;
  const activeChecked = v ? Boolean(v.active) : active;

  // 保存できたら閉じる。Esc でも閉じ、開いている間は背後をスクロールさせない。
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="記事を編集"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/60 p-4"
    >
      <form
        key={seq.current}
        action={action}
        onClick={(e) => e.stopPropagation()}
        className="my-6 flex w-full max-w-[680px] flex-col gap-3 rounded-[12px] bg-white p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-[var(--ink)]">記事を編集</h2>
            <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{title}</p>
          </div>
          <button type="button" onClick={onClose} className={`${btn("secondary", "sm")} shrink-0`}>
            閉じる
          </button>
        </div>

        <ArticleFields d={d} mode="edit" />

        {/* 表示・非表示も編集の中で切り替える（行のボタンを減らすため） */}
        <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-[var(--line)] bg-white px-3 py-2.5">
          <input
            type="checkbox"
            name="active"
            defaultChecked={activeChecked}
            className="h-4 w-4 shrink-0 accent-[var(--green)]"
          />
          <span className="text-[12px] text-[var(--ink)]">
            <b>公開トップに表示する</b>
            <span className="ml-2 text-[var(--muted)]">外すと非表示になります（削除ではありません）</span>
          </span>
        </label>

        {state.error ? <p className="text-[12px] text-[var(--red)]">{state.error}</p> : null}

        <div className="flex items-center gap-3">
          <button disabled={pending} className={`${btn("primary", "sm")} ml-auto`}>
            {pending ? "保存中…" : "保存する"}
          </button>
        </div>
      </form>
    </div>
  );
}
