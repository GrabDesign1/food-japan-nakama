"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";

type FavTarget = "offering" | "project";

/** 台帳・共創プロジェクトのお気に入りを切り替える（会員のお気に入りは producers/actions.ts）。 */
export async function toggleFavorite(targetType: FavTarget, targetId: string): Promise<void> {
  if (targetType !== "offering" && targetType !== "project") return;
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);

  // 対象の存在と公開状態を確認（自分のものはお気に入り不可）
  if (targetType === "offering") {
    const o = await prisma.offering.findFirst({
      where: { id: targetId, member: { tenantId: su.app.tenantId } },
      select: { memberId: true, isPublic: true, visibility: true },
    });
    if (!o || o.memberId === me.id || !o.isPublic || o.visibility !== "public") return;
  } else {
    const p = await prisma.project.findUnique({ where: { id: targetId }, select: { memberId: true, status: true, tenantId: true } });
    if (!p || p.memberId === me.id || p.status !== "published" || p.tenantId !== su.app.tenantId) return;
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      memberId_targetType_targetId: { memberId: me.id, targetType, targetId },
    },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({ data: { memberId: me.id, targetType, targetId } });
  }

  revalidatePath(targetType === "offering" ? `/ledger/${targetId}` : `/projects/${targetId}`);
  revalidatePath("/favorites");
}

export type FavoriteResult = { ok: boolean; favorited: boolean; message?: string };

/**
 * お気に入りの切り替え（結果を返す版。ボタンで理由を表示するために使う）。
 * 従来の toggleFavorite は条件に合わないと無言で終了するため、
 * 画面上は「押しても何も起きない」ように見えていた（2026-08-11）。
 */
export async function toggleFavoriteWithResult(
  targetType: FavTarget,
  targetId: string
): Promise<FavoriteResult> {
  const su = await getSessionUser();
  if (!su) return { ok: false, favorited: false, message: "ログインが必要です。" };
  const me = await getOrCreateMemberForUser(su);

  if (targetType === "offering") {
    const o = await prisma.offering.findFirst({
      where: { id: targetId, member: { tenantId: su.app.tenantId } },
      select: { memberId: true, isPublic: true, visibility: true },
    });
    if (!o) return { ok: false, favorited: false, message: "案件が見つかりません。" };
    if (o.memberId === me.id)
      return { ok: false, favorited: false, message: "自分の案件はお気に入りに追加できません。" };
    if (!o.isPublic || o.visibility !== "public")
      return { ok: false, favorited: false, message: "この案件は現在お気に入りに追加できません。" };
  } else {
    const p = await prisma.project.findUnique({
      where: { id: targetId },
      select: { memberId: true, status: true, tenantId: true },
    });
    if (!p || p.tenantId !== su.app.tenantId)
      return { ok: false, favorited: false, message: "案件が見つかりません。" };
    if (p.memberId === me.id)
      return { ok: false, favorited: false, message: "自分の案件はお気に入りに追加できません。" };
    if (p.status !== "published")
      return { ok: false, favorited: false, message: "この案件は現在お気に入りに追加できません。" };
  }

  const existing = await prisma.favorite.findUnique({
    where: { memberId_targetType_targetId: { memberId: me.id, targetType, targetId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({ data: { memberId: me.id, targetType, targetId } });
  }

  revalidatePath(targetType === "offering" ? `/ledger/${targetId}` : `/projects/${targetId}`);
  revalidatePath("/favorites");
  return { ok: true, favorited: !existing };
}
