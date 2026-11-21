// 取り込んだ名刺の画像の配信口（2026-11-21）。
//
// ⚠️ **持ち主以外には絶対に出さない。** imagePathForOwner() が owner を where に入れて引くので、
//    持ち主でなければそもそもパスが取れない。
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { imagePathForOwner, CARD_BUCKET } from "@/lib/contact-cards";

const SIGNED_URL_TTL_SEC = 60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const su = await getSessionUser();
  if (!su) return new NextResponse("unauthorized", { status: 401 });
  const me = await getOrCreateMemberForUser(su);

  const path = await imagePathForOwner(me.id, id);
  if (!path) return new NextResponse("not found", { status: 404 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(CARD_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) {
    console.error("[card-images] 署名付きURLの発行に失敗:", error);
    return new NextResponse("not found", { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
