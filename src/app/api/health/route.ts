// DB疎通確認用の簡易エンドポイント。
// 会員数などの内部情報・DBエラー詳細は返さない（外部から誰でも叩けるため）。
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.tenant.count();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[health] DB接続エラー:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
