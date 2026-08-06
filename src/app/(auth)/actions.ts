"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  // オープンリダイレクト防止：自サイト内の絶対パスのみ許可
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "メールアドレスまたはパスワードが違います。" };
  }
  redirect(next);
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 8) {
    return { error: "パスワードは8文字以上にしてください。" };
  }
  if (password !== passwordConfirm) {
    return { error: "パスワードが一致しません。もう一度ご確認ください。" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // メール確認が無効なら即セッションが張られる → ダッシュボードへ
  if (data.session) {
    redirect("/dashboard");
  }

  // メール確認が有効な場合
  return {
    message:
      "確認メールを送信しました。メール内のリンクを開くと登録が完了します。",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** パスワード再設定メールを送る。 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { error: "正しいメールアドレスを入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email);

  // メールの有無に関わらず同じ表示（アカウント存在を漏らさない）
  return {
    message:
      "パスワード再設定用のメールを送信しました。メール内のリンクを開いて、新しいパスワードを設定してください。",
  };
}

/** ログイン後（再設定リンク経由）に新しいパスワードを設定する。 */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 8) {
    return { error: "パスワードは8文字以上にしてください。" };
  }
  if (password !== passwordConfirm) {
    return { error: "パスワードが一致しません。もう一度ご確認ください。" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "リンクの有効期限が切れているか、無効です。お手数ですが、もう一度パスワード再設定をやり直してください。",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "パスワードの更新に失敗しました。時間をおいて再度お試しください。" };
  }

  redirect("/dashboard");
}
