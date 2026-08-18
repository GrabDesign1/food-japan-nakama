"use client";

import { useActionState, useEffect, useRef } from "react";
import { createArticle, type ArticleState } from "../article-actions";
import { btn } from "@/lib/ui";
import { ArticleFields } from "./ArticleFields";

const INIT: ArticleState = {};

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
      <div className="rounded-md bg-[var(--green-soft)] px-3 py-2 text-[11px] leading-5 text-[var(--green-d)]">
        記事URLと出典を入れて「記事を追加」すると、<b>タイトル・サムネイル画像・概要はURLから自動取得</b>します。
        うまく取得できない場合だけ、下の欄に手入力してください。
      </div>

      <ArticleFields mode="add" />

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
