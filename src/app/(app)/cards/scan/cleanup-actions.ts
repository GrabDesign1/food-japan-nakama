"use server";

/**
 * 【取り込まなかった写真の後片付け】2026-11-28。
 *
 * 読み取り（`scanCard`）は、保存を選ぶ前に写真をストレージへ上げている。
 * そのため**読み取ったけれど保存しなかったぶんが、行き場のない画像として残る**。
 * ⚠️ 検証中に2枚残ったのが見つかって作った。放っておくと使うほど溜まる。
 *
 * ⚠️⚠️ **消せるのは自分のフォルダの中だけ。** `ownerMemberId` のフォルダに限定し、
 *    かつ **`contact_cards` から参照されていないもの**だけを消す。
 *    参照の確認を外すと、保存済みの名刺の写真まで消える。
 * ⚠️ 画像そのものは他人の個人情報（名刺）。他の会員のフォルダには触れない。
 */
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CARD_BUCKET } from "@/lib/contact-cards";

export type CleanupState = { removed?: number; error?: string };

export async function cleanupOrphanCardImages(): Promise<CleanupState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインしてからお試しください。" };
  const me = await getOrCreateMemberForUser(su);

  const admin = createSupabaseAdminClient();
  const { data: files, error } = await admin.storage
    .from(CARD_BUCKET)
    .list(me.id, { limit: 200 });
  if (error) return { error: "写真の一覧を取れませんでした。" };
  if (!files || files.length === 0) return { removed: 0 };

  // ⚠️ いま使われている写真のパス（自分の名刺のぶんだけ引く）
  const used = await prisma.contactCard.findMany({
    where: { ownerMemberId: me.id, imagePath: { not: null } },
    select: { imagePath: true },
  });
  const keep = new Set(used.map((u) => u.imagePath as string));

  const orphans = files
    .map((f) => `${me.id}/${f.name}`)
    .filter((path) => !keep.has(path));
  if (orphans.length === 0) return { removed: 0 };

  const { error: delError } = await admin.storage.from(CARD_BUCKET).remove(orphans);
  if (delError) return { error: "写真を消せませんでした。" };

  revalidatePath("/cards");
  return { removed: orphans.length };
}
