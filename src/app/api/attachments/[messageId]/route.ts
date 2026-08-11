// メッセージ添付の配信口（2026-08-11 Phase 6）。
// 添付は非公開バケットに置き、ここで「スレッド参加者か」を確かめてから、
// 短命（60秒）の署名付きURLへリダイレクトする。
// 以前は公開バケットの恒久URLだったため、URLを知る第三者や退会後の閲覧が可能だった。
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "message-attachments";
const SIGNED_URL_TTL_SEC = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  // ?download=1 のときは、ブラウザで開かずに保存させる（署名付きURLに Content-Disposition を付ける）
  const wantsDownload = req.nextUrl.searchParams.get("download") === "1";
  // ?i=<attachmentId> で複数添付の1件を指定する。省略時は旧列（1件目）を返す
  const attachmentId = req.nextUrl.searchParams.get("i");

  const su = await getSessionUser();
  if (!su) return new NextResponse("unauthorized", { status: 401 });
  const me = await getOrCreateMemberForUser(su);

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      attachmentUrl: true,
      attachmentName: true,
      threadId: true,
      // 指定された添付が「このメッセージのもの」であることを、ここで一緒に確かめる
      attachments: attachmentId
        ? { where: { id: attachmentId }, select: { path: true, name: true } }
        : false,
    },
  });
  if (!message) return new NextResponse("not found", { status: 404 });

  const target = attachmentId
    ? message.attachments?.[0] && {
        path: message.attachments[0].path,
        name: message.attachments[0].name,
      }
    : message.attachmentUrl && { path: message.attachmentUrl, name: message.attachmentName };
  if (!target) return new NextResponse("not found", { status: 404 });

  const thread = await prisma.thread.findUnique({ where: { id: message.threadId } });
  if (!thread || (thread.fromMemberId !== me.id && thread.toMemberId !== me.id)) {
    return new NextResponse("not found", { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(
      target.path,
      SIGNED_URL_TTL_SEC,
      wantsDownload ? { download: target.name || true } : undefined
    );
  if (error || !data?.signedUrl) {
    console.error("[attachments] 署名付きURLの発行に失敗:", error);
    return new NextResponse("not found", { status: 404 });
  }

  // 署名付きURLは短命なのでキャッシュさせない
  return NextResponse.redirect(data.signedUrl, {
    headers: { "Cache-Control": "no-store" },
  });
}
