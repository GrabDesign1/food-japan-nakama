// DB疎通確認用の簡易エンドポイント（動作確認後に削除してよい）。
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const tenants = await prisma.tenant.count();
    const users = await prisma.user.count();
    const members = await prisma.member.count();
    return NextResponse.json({ ok: true, counts: { tenants, users, members } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
