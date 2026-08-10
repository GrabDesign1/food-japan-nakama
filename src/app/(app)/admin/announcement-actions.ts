"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { trimTo, ANNOUNCEMENT_TITLE_MAX, ANNOUNCEMENT_BODY_MAX } from "@/lib/security";

export async function createAnnouncement(formData: FormData): Promise<void> {
  const su = await requireAdmin();
  const title = trimTo(formData.get("title"), ANNOUNCEMENT_TITLE_MAX);
  const body = trimTo(formData.get("body"), ANNOUNCEMENT_BODY_MAX);
  const pinned = String(formData.get("pinned") ?? "") === "on";
  if (!title) return;
  await prisma.announcement.create({
    data: { tenantId: su.app.tenantId, title, body: body || null, pinned },
  });
  await writeAudit(su, "announcement.create", { targetType: "announcement", targetId: title });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const su = await requireAdmin();
  await prisma.announcement.deleteMany({ where: { id, tenantId: su.app.tenantId } });
  await writeAudit(su, "announcement.delete", { targetType: "announcement", targetId: id });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
