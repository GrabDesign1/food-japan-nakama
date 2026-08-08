"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const STATUSES = new Set(["new", "reviewing", "contacted", "proposed", "won", "lost"]);

export async function updateConsultationStatus(id: string, status: string): Promise<void> {
  const su = await requireAdmin();
  if (!STATUSES.has(status)) return;
  await prisma.consultation.updateMany({
    where: { id, tenantId: su.app.tenantId },
    data: { status },
  });
  revalidatePath("/admin/consultations");
}
