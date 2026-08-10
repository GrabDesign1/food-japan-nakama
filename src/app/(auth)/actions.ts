"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail, notifyPasswordChanged } from "@/lib/email";
import {
  safeInternalPath,
  isAuthRateLimited,
  recordAuthAttempt,
  requestIp,
  PW_RECOVERY_COOKIE,
} from "@/lib/security";

// email: エラー時に入力値を保持してフォームへ戻す（React 19はaction後にフォームを既定値へリセットするため）
export type AuthState = { error?: string; message?: string; email?: string };

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeInternalPath(formData.get("next"));

  // 総当たり対策：ログインはサーバー側から Supabase を叩くため、送信元IPは常に Vercel になる。
  // Supabase 側のIP制限が効かないので、アプリ側で失敗回数を数える。
  const ip = await requestIp();
  if (await isAuthRateLimited("signin_failed", { email, ip })) {
    return {
      error: "ログインの失敗が続いたため、一時的に受け付けを停止しています。しばらく時間をおいてお試しください。",
      email,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordAuthAttempt("signin_failed", { email, ip });
    return { error: "メールアドレスまたはパスワードが違います。", email };
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
    return { error: "パスワードは8文字以上にしてください。", email };
  }
  if (password !== passwordConfirm) {
    return { error: "パスワードが一致しません。もう一度ご確認ください。", email };
  }
  if (!formData.get("businessPurpose")) {
    return { error: "事業目的での申込みであることをご確認ください。", email };
  }

  // 案内メール同意（任意。特電法の同意記録として user_metadata に日時つきで保存し、
  // 初回ログイン時に users.marketing_opt_in_at へ引き継ぐ）
  const marketingOptIn = !!formData.get("marketingOptIn");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        marketing_opt_in: marketingOptIn,
        marketing_opt_in_at: marketingOptIn ? new Date().toISOString() : null,
      },
    },
  });

  if (error) {
    return { error: error.message, email };
  }

  // メール確認が無効なら即セッションが張られる → マイページへ（登録・掲載は無料。決済誘導はしない）
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
  redirect("/");
}

/** パスワード再設定メールを送る。 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "正しいメールアドレスを入力してください。", email };
  }

  // メール爆撃対策：自前送信（Resend）のため Supabase 側の送信制限が効かない。
  // 制限中もアカウントの有無を漏らさないよう、成功時と同じ文面を返す。
  const ip = await requestIp();
  if (await isAuthRateLimited("password_reset", { email, ip })) {
    return {
      message:
        "パスワード再設定用のメールを送信しました。メール内のリンクを開いて、新しいパスワードを設定してください。",
    };
  }
  await recordAuthAttempt("password_reset", { email, ip });

  // Supabaseのメールテンプレに頼らず、リカバリー用リンクを生成してアプリから日本語で送る。
  const admin = createSupabaseAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (!error && data?.properties?.hashed_token) {
    const url = `${appUrl}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/reset-password`;
    await sendPasswordResetEmail(email, url);
  }

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
  const currentPassword = String(formData.get("currentPassword") ?? "");

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

  // 再設定リンク経由（＝メール受信を証明済み）でなければ、現在のパスワードで本人確認する。
  // これが無いと、セッションを奪われた側が旧パスワードを知らないまま乗っ取りを固定化できる。
  const jar = await cookies();
  const viaRecoveryLink = jar.get(PW_RECOVERY_COOKIE)?.value === "1";
  if (!viaRecoveryLink) {
    if (!currentPassword) {
      return { error: "現在のパスワードを入力してください。" };
    }
    const check = await createSupabaseServerClient();
    const { error: reauthError } = await check.auth.signInWithPassword({
      email: user.email ?? "",
      password: currentPassword,
    });
    if (reauthError) {
      return { error: "現在のパスワードが違います。" };
    }
  }

  // 管理者権限で確実に更新（リカバリーセッションの制約を回避）。
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) {
    return { error: "パスワードの更新に失敗しました。時間をおいて再度お試しください。" };
  }

  if (user.email) {
    // 身に覚えのない変更に気づけるよう通知（失敗しても更新自体は成立）
    notifyPasswordChanged(user.email).catch((e) =>
      console.error("[auth] パスワード変更通知の送信失敗:", e)
    );
  }

  // リカバリーセッションを終了し、新パスワードでログインし直してもらう。
  jar.delete(PW_RECOVERY_COOKIE);
  await supabase.auth.signOut();
  redirect("/login?reset=done");
}
