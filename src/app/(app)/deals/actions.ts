"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";

async function ownDeal(dealId: string) {
  const su = await getSessionUser();
  if (!su) return null;
  const me = await getOrCreateMemberForUser(su);
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) return null;
  if (deal.ownerMemberId !== me.id && deal.counterpartMemberId !== me.id) return null;
  return deal;
}

/** フェーズを変更（0〜5） */
export async function setDealPhase(dealId: string, phase: number): Promise<void> {
  const deal = await ownDeal(dealId);
  if (!deal) return;
  const p = Math.max(0, Math.min(5, Math.trunc(phase)));
  await prisma.deal.update({
    where: { id: dealId },
    data: { phase: p, lastActivityAt: new Date() },
  });
  revalidatePath("/deals");
  revalidatePath("/deals/board");
}

/** 次にやること・期限を更新 */
export async function setDealNext(
  dealId: string,
  formData: FormData
): Promise<void> {
  const deal = await ownDeal(dealId);
  if (!deal) return;
  const nextAction = String(formData.get("nextAction") ?? "").trim() || null;
  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = dueRaw ? new Date(dueRaw) : null;
  await prisma.deal.update({
    where: { id: dealId },
    data: { nextAction, dueDate, lastActivityAt: new Date() },
  });
  revalidatePath("/deals");
  revalidatePath("/deals/board");
}
