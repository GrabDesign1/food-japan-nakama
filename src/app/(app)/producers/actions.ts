"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";

export async function toggleFavoriteMember(targetMemberId: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  if (me.id === targetMemberId) return; // 自分はお気に入りにできない

  // 対象が同一テナントの承認済み会員であることを確認
  const target = await prisma.member.findFirst({
    where: { id: targetMemberId, tenantId: su.app.tenantId, status: "APPROVED" },
    select: { id: true },
  });
  if (!target) return;

  const existing = await prisma.favorite.findUnique({
    where: {
      memberId_targetType_targetId: {
        memberId: me.id,
        targetType: "member",
        targetId: targetMemberId,
      },
    },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({
      data: { memberId: me.id, targetType: "member", targetId: targetMemberId },
    });
  }

  revalidatePath(`/producers/${targetMemberId}`);
  revalidatePath("/dashboard");
  revalidatePath("/favorites");
}
