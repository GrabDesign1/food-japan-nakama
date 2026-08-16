"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "../actions";
import { GoogleButton } from "./GoogleButton";
import { btn, h1Cls, input } from "@/lib/ui";

const initial: AuthState = {};

export function AuthForm({
  mode,
  next,
  notice,
  success,
}: {
  mode: "login" | "signup";
  next?: string;
  notice?: string;
  success?: string;
}) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initial);
  // 制御コンポーネントにして、action後のフォーム自動リセットでメールアドレスが消えないようにする
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className={h1Cls}>
        {mode === "login" ? "ログイン" : "新規登録（登録無料）"}
      </h1>

      {next ? <input type="hidden" name="next" value={next} /> : null}

      {notice ? (
        <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">
          {notice}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-md bg-[var(--green-soft)] px-3 py-2 text-[12px] text-[var(--green-d)]">
          {success}
        </p>
      ) : null}

      <GoogleButton next={next} />

      <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
        <div className="h-px flex-1 bg-[var(--line)]" />
        または
        <div className="h-px flex-1 bg-[var(--line)]" />
      </div>

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

      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        パスワード{mode === "signup" ? "（8文字以上）" : ""}
        <input
          type="password"
          name="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={input()}
          placeholder="••••••••"
        />
      </label>

      {mode === "signup" ? (
        <>
          <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
            パスワード（確認）
            <input
              type="password"
              name="passwordConfirm"
              required
              minLength={8}
              autoComplete="new-password"
              className={input()}
              placeholder="••••••••"
            />
          </label>
          <div className="flex items-start gap-2 text-[12px] leading-5 text-[var(--ink-2)]">
            <input
              type="checkbox"
              id="businessPurpose"
              name="businessPurpose"
              required
              className="mt-0.5 accent-[var(--green)]"
            />
            <label htmlFor="businessPurpose">
              <Link
                href="/terms"
                target="_blank"
                rel="noopener"
                className="text-[var(--green-d)] underline"
              >
                利用規約
              </Link>
              を読み、本サービスを事業として、または事業のために申し込みます。
              {/* 特定電子メール法の同意記録。規約第27条の2に案内メールの定めを置き、
                  ここにチェックすることをもって同意とする（同意した事実が分かるよう文面に明示する） */}
              <span className="mt-1 block text-[var(--muted)]">
                あわせて、案件・イベント・共創支援などの
                <b className="text-[var(--ink-2)]">案内メール（広告・宣伝を含む）の受信に同意</b>
                します（規約第27条の2）。配信停止は、いつでもプロフィール画面またはメール本文の案内から行えます。
              </span>
            </label>
          </div>
        </>
      ) : null}

      {mode === "login" ? (
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-[12px] text-[var(--green-d)] underline">
            パスワードをお忘れの方
          </Link>
        </div>
      ) : null}

      {state.error ? (
        <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="rounded-md bg-[var(--green-soft)] px-3 py-2 text-[12px] text-[var(--green-d)]">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`${btn("primary")} mt-1 w-full`}
      >
        {pending
          ? "処理中…"
          : mode === "login"
            ? "ログイン"
            : "登録する"}
      </button>

      <div className="pt-1 text-center text-[12px] text-[var(--muted)]">
        {mode === "login" ? (
          <>
            アカウントがない場合{" "}
            <Link href="/signup" className="text-[var(--green)] underline">
              新規登録
            </Link>
          </>
        ) : (
          <>
            すでに登録済みの場合{" "}
            <Link href="/login" className="text-[var(--green)] underline">
              ログイン
            </Link>
          </>
        )}
      </div>
    </form>
  );
}
