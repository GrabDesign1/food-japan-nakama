// OAuth（Googleログイン等）の受け口。code をセッションに交換してダッシュボードへ。
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const nextParam = searchParams.get("next") ?? "/dashboard";
  // オープンリダイレクト防止：自サイト内パスのみ許可
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // 失敗 → ログインへ
  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}
