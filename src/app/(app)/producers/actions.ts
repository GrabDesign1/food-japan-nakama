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
