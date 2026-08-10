// メッセージ添付の配信口（2026-08-11 Phase 6）。
// 添付は非公開バケットに置き、ここで「スレッド参加者か」「引き合い課金でマスクされていないか」を
// 確かめてから、短命（60秒）の署名付きURLへリダイレクトする。
// 以前は公開バケットの恒久URLだったため、URLを知る第三者や退会後の閲覧が可能だった。
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getInquiryGate } from "@/lib/inquiry-gate";

const BUCKET = "message-attachments";
const SIGNED_URL_TTL_SEC = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;

  const su = await getSessionUser();
  if (!su) return new NextResponse("unauthorized", { status: 401 });
  const me = await getOrCreateMemberForUser(su);

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, attachmentUrl: true, threadId: true },
  });
  if (!message?.attachmentUrl) return new NextResponse("not found", { status: 404 });

  const thread = await prisma.thread.findUnique({ where: { id: message.threadId } });
  if (!thread || (thread.fromMemberId !== me.id && thread.toMemberId !== me.id)) {
    return new NextResponse("not found", { status: 404 });
  }

  // 画面でモザイクにしているメッセージの添付は渡さない
  const gate = await getInquiryGate({
    threadId: thread.id,
    threadFromMemberId: thread.fromMemberId,
    viewerMemberId: me.id,
    viewerIsPremium: me.paymentStatus === "PAID",
  });
  if (gate.maskedMessageIds.has(message.id)) {
    return new NextResponse("payment required", { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(message.attachmentUrl, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) {
    console.error("[attachments] 署名付きURLの発行に失敗:", error);
    return new NextResponse("not found", { status: 404 });
  }

  // 署名付きURLは短命なのでキャッシュさせない
  return NextResponse.redirect(data.signedUrl, {
    headers: { "Cache-Control": "no-store" },
  });
}
