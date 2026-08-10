"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword, type AuthState } from "../actions";
import { btn, h1Cls } from "@/lib/ui";

const initial: AuthState = {};

export function ResetPasswordForm({
  requireCurrentPassword = false,
}: {
  requireCurrentPassword?: boolean;
}) {
  const [state, formAction, pending] = useActionState(updatePassword, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className={h1Cls}>新しいパスワードの設定</h1>
      <p className="text-[12px] leading-6 text-[var(--ink-2)]">
        新しいパスワード（8文字以上）を入力してください。
      </p>

      {requireCurrentPassword ? (
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
          現在のパスワード
          <input
            type="password"
            name="currentPassword"
            required
            autoComplete="current-password"
            className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
            placeholder="••••••••"
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        新しいパスワード（8文字以上）
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
          placeholder="••••••••"
        />
      </label>

      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        新しいパスワード（確認）
        <input
          type="password"
          name="passwordConfirm"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
          placeholder="••••••••"
        />
      </label>

      {state.error ? (
        <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`${btn("primary")} mt-1 w-full`}
      >
        {pending ? "更新中…" : "パスワードを更新する"}
      </button>

      <div className="pt-1 text-center text-[12px] text-[var(--muted)]">
        <Link href="/login" className="text-[var(--green)] underline">
          ログインに戻る
        </Link>
      </div>
    </form>
  );
}
