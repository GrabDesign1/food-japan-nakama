// 記事リンクの見出し画像の配信口（2026-11-21）。
//
// なぜ自分のところを通すのか:
//   外部サイトの画像URLを <img src> にそのまま書くと、
//     ① CSP の img-src 'self' を崩す（next.config.ts）
//     ② 会員が記事を読んだことが、その外部サイトに毎回伝わる
//   そのため、ここで取りに行って中身だけを返す。
//
// ⚠️ **誰でも使える画像の中継所にしない**。取りに行くURLは「その投稿に保存済みのもの」だけ。
//    問い合わせ側からURLを受け取らない（受け取ると、社内ネットワークの偵察に使える）。
// ⚠️ 取りに行く先の点検（私用アドレス・転送・大きさ）は link-preview.ts で行う。
// ⚠️ 見てよい人かをここで必ず確かめる（投稿そのものと同じ範囲に限る）。
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { canSeePost } from "@/lib/feed";
import { fetchLinkImage } from "@/lib/link-preview";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  const su = await getSessionUser();
  if (!su) return new NextResponse("unauthorized", { status: 401 });
  const me = await getOrCreateMemberForUser(su);

  if (!(await canSeePost(me.id, postId))) return new NextResponse("not found", { status: 404 });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { linkImageUrl: true },
  });
  if (!post?.linkImageUrl) return new NextResponse("not found", { status: 404 });

  const img = await fetchLinkImage(post.linkImageUrl);
  if (!img) return new NextResponse("not found", { status: 404 });

  return new NextResponse(img.body, {
    headers: {
      "Content-Type": img.contentType,
      // 記事の見出し画像は変わらない。会員ごとに違うものでもないので、少し持たせる
      "Cache-Control": "private, max-age=3600",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
