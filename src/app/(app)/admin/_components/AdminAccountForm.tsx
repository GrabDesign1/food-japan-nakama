"use client";

import { useActionState, useEffect, useRef } from "react";
import { createAdminAccount, type AdminAccountState } from "../admin-account-actions";
import { btn } from "@/lib/ui";

const INIT: AdminAccountState = {};

export function AdminAccountForm() {
  const [state, action, pending] = useActionState(createAdminAccount, INIT);
  const formRef = useRef<HTMLFormElement>(null);

  // 作成成功したら入力欄をクリア
  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state.message]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-2 rounded-[10px] border border-[var(--line)] bg-white p-4"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="name"
          required
          placeholder="お名前（例：山田 太郎）"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]"
        />
        <select
          name="role"
          defaultValue="REVIEWER"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]"
        >
          <option value="REVIEWER">審査担当（会員審査・お知らせ投稿）</option>
          <option value="ADMIN">事務局管理者（すべての管理機能）</option>
        </select>
      </div>
      <input
        name="email"
        type="email"
        required
        placeholder="メールアドレス（ログインID）"
        className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]"
      />
      <input
        name="password"
        type="text"
        required
        minLength={8}
        placeholder="初期パスワード（8文字以上）"
        className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]"
      />

      {state.error ? (
        <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="rounded-md bg-[var(--green-soft)] px-3 py-2 text-[12px] text-[var(--green-d)]">{state.message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <p className="text-[11px] text-[var(--muted)]">
          初期パスワードは本人へ安全な方法でお伝えください。
        </p>
        <button
          disabled={pending}
          className={`${btn("primary")} ml-auto`}
        >
          {pending ? "作成中…" : "管理者を追加"}
        </button>
      </div>
    </form>
  );
}
