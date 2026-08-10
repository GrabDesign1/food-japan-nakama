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
