// 全リクエストでセッションを更新し、保護ページの未ログインアクセスを弾く。
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ログイン不要で見られるパス（"/" は公開LP、"/preview" は記事プレビュー、以下は情報・法務ページ）
const PUBLIC_PATHS = [
  "/login", "/signup", "/auth", "/forgot-password", "/reset-password", "/preview",
  "/about", "/pricing", "/flow", "/faq", "/company", "/contact",
  "/terms", "/privacy", "/tokushoho",
  "/produce", "/crowdfunding", "/consultation", "/learn", "/food-loss", "/hanro", "/cases", "/listings", "/suspended",
  // Food Japan Summit の協賛申込フォーム（NAKAMAからはリンクせず、URLを直接案内する）
  "/sponsor",
  // 共創フィールドワークの記入ページ（当日の参加者向け。参加コードで入口を守る・noindex）
  "/fieldwork",
  // 「このサービス、使いますか？」のご案内（合言葉つきの個人宛・noindex・2026-11-23）
  "/join",
  // 宮崎2026の特設ページ（公開側。2026-11-26）
  // ⚠️⚠️ **"/summit" を丸ごと公開にしないこと。** /summit・/summit/share・/summit/reports は
  //    会員だけが見るページ。ここは**この1本だけ**を通す（配下に会員向けを作らない）。
  "/summit/2026-miyazaki",
  // 特設ページの写真・リンク画像の配信口（公開に出したものだけ返す。判定はルート側）
  "/api/summit-media",
  // SEO/AIO: クローラ向けファイル（要公開）
  "/robots.txt", "/sitemap.xml", "/llms.txt", "/og.jpg", "/BingSiteAuth.xml",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // 完全一致 or 「/」区切りの配下のみ公開扱い（"/produce" が "/producers" に誤マッチしないように）
  const isPublic =
    path === "/" || PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  // 未ログインで保護ページ → /login へ
  // next にはクエリも含める（/ledger/new?direction=WANT 等でログイン後に同じフォームへ戻すため）
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // ログイン済みで /login や /signup → /dashboard へ
  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // 静的アセット・画像・APIヘルスチェックは対象外
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/stripe|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
