"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function createAnnouncement(formData: FormData): Promise<void> {
  const su = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const pinned = String(formData.get("pinned") ?? "") === "on";
  if (!title) return;
  await prisma.announcement.create({
    data: { tenantId: su.app.tenantId, title, body: body || null, pinned },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const su = await requireAdmin();
  await prisma.announcement.deleteMany({ where: { id, tenantId: su.app.tenantId } });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
