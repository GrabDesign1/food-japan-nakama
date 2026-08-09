"use server";

// 事務局：掲載（台帳・プロジェクト）の事後チェック。非公開化＋理由を掲載者へメール通知。
import { revalidatePath } from "next/cache";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMemberUserEmails } from "@/lib/member";
import { notifyListingUnpublished } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function adminUnpublishOffering(offeringId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const su = await getSessionUser();
  if (!su) return;
  const reason = String(formData.get("reason") ?? "").trim() || "掲載内容について確認が必要なため";

  const offering = await prisma.offering.findFirst({
    where: { id: offeringId, member: { tenantId: su.app.tenantId } },
    select: { id: true, title: true, memberId: true, isPublic: true },
  });
  if (!offering || !offering.isPublic) return;

  await prisma.offering.update({ where: { id: offering.id }, data: { isPublic: false } });

  const to = await getMemberUserEmails(offering.memberId);
  await notifyListingUnpublished({
    to,
    kind: "台帳",
    title: offering.title || "（無題）",
    reason,
    editUrl: `${APP_URL}/ledger/${offering.id}/edit`,
  });

  revalidatePath("/admin/listings");
  revalidatePath("/search");
}

export async function adminUnpublishProject(projectId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const su = await getSessionUser();
  if (!su) return;
  const reason = String(formData.get("reason") ?? "").trim() || "掲載内容について確認が必要なため";

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: su.app.tenantId },
    select: { id: true, title: true, memberId: true, status: true },
  });
  if (!project || project.status !== "published") return;

  await prisma.project.update({ where: { id: project.id }, data: { status: "draft" } });

  const to = await getMemberUserEmails(project.memberId);
  await notifyListingUnpublished({
    to,
    kind: "プロジェクト",
    title: project.title || "（無題）",
    reason,
    editUrl: `${APP_URL}/projects/${project.id}/edit`,
  });

  revalidatePath("/admin/listings");
  revalidatePath("/projects");
}
