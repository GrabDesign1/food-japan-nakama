// 投稿画像の配信口（2026-11-21）。
// 画像は非公開バケットに置き、ここで「この投稿を見てよい人か」を確かめてから、
// 短命（60秒）の署名付きURLへリダイレクトする。公開URLは作らない。
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canSeePost } from "@/lib/feed";

const BUCKET = "post-images";
const SIGNED_URL_TTL_SEC = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const index = Number(req.nextUrl.searchParams.get("i") ?? "0");

  const su = await getSessionUser();
  if (!su) return new NextResponse("unauthorized", { status: 401 });
  const me = await getOrCreateMemberForUser(su);

  // 見てよい人かをここで確かめる（画面の判定を信じない）
  if (!(await canSeePost(me.id, postId))) return new NextResponse("not found", { status: 404 });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { imagePaths: true },
  });
  const path = post?.imagePaths?.[Number.isFinite(index) ? index : 0];
  if (!path) return new NextResponse("not found", { status: 404 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) {
    console.error("[post-images] 署名付きURLの発行に失敗:", error);
    return new NextResponse("not found", { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
