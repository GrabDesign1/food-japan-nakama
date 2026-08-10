// メール確認リンクの受け口。token_hash を検証してセッションを張り、ダッシュボードへ。
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/security";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // オープンリダイレクト防止：自サイト内パスのみ許可（バックスラッシュ等も弾く）
  const next = safeInternalPath(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // 失敗（リンク期限切れなど）→ ログインへ
  return NextResponse.redirect(new URL("/login?error=confirm", request.url));
}
