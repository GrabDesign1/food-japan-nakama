// 特設ページの写真・リンク画像の配信口（2026-11-26）。
//
// ⚠️⚠️ **公開してよいのは featured のものだけ。** それ以外はログインしている会員にしか返さない。
//    写真は非公開バケットに置き、ここで判定してから短命（60秒）の署名付きURLへ送る。
// ⚠️ 問い合わせ側からURLを受け取らない（受け取ると社内ネットワークの偵察に使える）。
//    取りに行くのは、その行に保存済みのものだけ。
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadShareMedia } from "@/lib/summit-share";
import { fetchLinkImage } from "@/lib/link-preview";

const BUCKET = "post-images";
const SIGNED_URL_TTL_SEC = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const wantLink = sp.get("link") === "1";
  const index = Number(sp.get("i") ?? "0");

  const media = await loadShareMedia(id);
  if (!media) return new NextResponse("not found", { status: 404 });

  // 公開されていないものは、ログインしている方にだけ返す
  if (!media.featured) {
    const su = await getSessionUser();
    if (!su) return new NextResponse("unauthorized", { status: 401 });
  }

  if (wantLink) {
    if (!media.linkImageUrl) return new NextResponse("not found", { status: 404 });
    const img = await fetchLinkImage(media.linkImageUrl);
    if (!img) return new NextResponse("not found", { status: 404 });
    return new NextResponse(img.body, {
      headers: {
        "Content-Type": img.contentType,
        "Cache-Control": media.featured ? "public, max-age=3600" : "private, max-age=3600",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const path = media.imagePaths[Number.isFinite(index) ? index : 0];
  if (!path) return new NextResponse("not found", { status: 404 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) {
    console.error("[summit-media] 署名付きURLの発行に失敗:", error);
    return new NextResponse("not found", { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
