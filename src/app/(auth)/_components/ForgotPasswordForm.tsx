"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "../actions";
import { btn, h1Cls, input } from "@/lib/ui";

const initial: AuthState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initial);
  // 制御コンポーネントにして、action後のフォーム自動リセットでメールアドレスが消えないようにする
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className={h1Cls}>パスワードの再設定</h1>
      <p className="text-[12px] leading-6 text-[var(--ink-2)]">
        ご登録のメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
      </p>

      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        メールアドレス
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input()}
          placeholder="you@example.com"
        />
      </label>

      {state.error ? (
        <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="rounded-md bg-[var(--green-soft)] px-3 py-2 text-[12px] text-[var(--green-d)]">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`${btn("primary")} mt-1 w-full`}
      >
        {pending ? "送信中…" : "再設定メールを送る"}
      </button>

      <div className="pt-1 text-center text-[12px] text-[var(--muted)]">
        <Link href="/login" className="text-[var(--green)] underline">
          ログインに戻る
        </Link>
      </div>
    </form>
  );
}
