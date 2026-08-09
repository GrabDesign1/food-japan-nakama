"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { getOrCreateMemberForUser, getMemberUserEmails } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyProjectApplication } from "@/lib/email";
import { validateImageFile, storagePathFromUrl } from "@/lib/upload";
import { writeAudit } from "@/lib/audit";

const BUCKET = "member-images";

async function ownProject(projectId: string) {
  const su = await getSessionUser();
  if (!su) return null;
  const me = await getOrCreateMemberForUser(su);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.memberId !== me.id) return null;
  return { su, me, project };
}

export async function createDraftProject(): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su!);

  // 連打・二重送信対策：中身が空の下書きが既にあれば、新規作成せずそれを開く
  const existingEmpty = await prisma.project.findFirst({
    where: { memberId: me.id, status: "draft", title: "", body: null, imageUrls: { isEmpty: true } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existingEmpty) redirect(`/projects/${existingEmpty.id}/edit`);

  const created = await prisma.project.create({
    data: { tenantId: su!.app.tenantId, memberId: me.id, title: "", status: "draft" },
  });
  redirect(`/projects/${created.id}/edit`);
}

export type ProjectState = { ok?: boolean; error?: string };

export async function saveProject(
  projectId: string,
  _prev: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  const owned = await ownProject(projectId);
  if (!owned) return { error: "権限がありません。" };
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const title = g("title");
  if (!title) return { error: "タイトルは必須です。" };
  const tags = g("tags").split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean).slice(0, 8);
  await prisma.project.update({
    where: { id: projectId },
    data: {
      title,
      body: g("body") || null,
      fromRole: g("fromRole") || null,
      toRole: g("toRole") || null,
      area: g("area") || null,
      budget: g("budget") || null,
      tags,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { ok: true };
}

/** 掲載を申請（draft → pending）。事務局が承認すると published に。 */
export async function submitProject(projectId: string): Promise<void> {
  const owned = await ownProject(projectId);
  if (!owned) return;
  // 掲載申請は月額会員のみ（下書き作成・編集は誰でも可）
  if (owned.me.paymentStatus !== "PAID") redirect("/billing");
  if (!owned.project.title) return;
  if (owned.project.status === "draft" || owned.project.status === "closed") {
    await prisma.project.update({ where: { id: projectId }, data: { status: "pending" } });
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function closeProject(projectId: string): Promise<void> {
  const owned = await ownProject(projectId);
  if (!owned) return;
  await prisma.project.update({ where: { id: projectId }, data: { status: "closed" } });
  revalidatePath("/projects");
}

export async function deleteProject(projectId: string): Promise<void> {
  const owned = await ownProject(projectId);
  if (!owned) return;
  const admin = createSupabaseAdminClient();
  const paths = owned.project.imageUrls
    .map((u) => storagePathFromUrl(u, BUCKET, `projects/${projectId}/`))
    .filter((p): p is string => !!p);
  if (paths.length) await admin.storage.from(BUCKET).remove(paths);
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
  redirect("/projects");
}

export async function uploadProjectImage(
  projectId: string,
  formData: FormData
): Promise<ProjectState> {
  const owned = await ownProject(projectId);
  if (!owned) return { error: "権限がありません。" };
  const file = formData.get("file");
  const v = await validateImageFile(file);
  if (!v.ok) return { error: v.error };
  if (owned.project.imageUrls.length >= 6) return { error: "最大6枚です。" };
  const path = `projects/${projectId}/${crypto.randomUUID()}.${v.ext}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, file as File, { contentType: v.contentType });
  if (error) return { error: error.message };
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  await prisma.project.update({
    where: { id: projectId },
    data: { imageUrls: [...owned.project.imageUrls, data.publicUrl] },
  });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

export async function removeProjectImage(
  projectId: string,
  url: string
): Promise<ProjectState> {
  const owned = await ownProject(projectId);
  if (!owned) return { error: "権限がありません。" };
  // 自分のプロジェクトに実際に登録されているURLしか消させない（任意ファイル削除の防止）
  if (!owned.project.imageUrls.includes(url)) return { error: "対象の画像が見つかりません。" };
  await prisma.project.update({
    where: { id: projectId },
    data: { imageUrls: owned.project.imageUrls.filter((u) => u !== url) },
  });
  const path = storagePathFromUrl(url, BUCKET, `projects/${projectId}/`);
  if (path) {
    const admin = createSupabaseAdminClient();
    await admin.storage.from(BUCKET).remove([path]);
  }
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

export async function setProjectBodyImage(
  projectId: string,
  formData: FormData
): Promise<ProjectState> {
  const owned = await ownProject(projectId);
  if (!owned) return { error: "権限がありません。" };
  const file = formData.get("file");
  const v = await validateImageFile(file);
  if (!v.ok) return { error: v.error };
  const path = `projects/${projectId}/body-${crypto.randomUUID()}.${v.ext}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, file as File, { contentType: v.contentType });
  if (error) return { error: error.message };
  const old = owned.project.bodyImageUrl;
  if (old) {
    const oldPath = storagePathFromUrl(old, BUCKET, `projects/${projectId}/`);
    if (oldPath) await admin.storage.from(BUCKET).remove([oldPath]);
  }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  await prisma.project.update({ where: { id: projectId }, data: { bodyImageUrl: data.publicUrl } });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

export async function clearProjectBodyImage(projectId: string): Promise<ProjectState> {
  const owned = await ownProject(projectId);
  if (!owned) return { error: "権限がありません。" };
  const old = owned.project.bodyImageUrl;
  if (old) {
    const oldPath = storagePathFromUrl(old, BUCKET, `projects/${projectId}/`);
    if (oldPath) {
      const admin = createSupabaseAdminClient();
      await admin.storage.from(BUCKET).remove([oldPath]);
    }
  }
  await prisma.project.update({ where: { id: projectId }, data: { bodyImageUrl: null } });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true };
}

/** 事務局：掲載を承認（pending → published）／差し戻し（→ draft） */
export async function adminReviewProject(
  projectId: string,
  approve: boolean
): Promise<void> {
  const su = await requireAdmin();
  await prisma.project.updateMany({
    where: { id: projectId, tenantId: su.app.tenantId },
    data: approve
      ? { status: "published", publishedAt: new Date() }
      : { status: "draft" },
  });
  await writeAudit(su, approve ? "project.approve" : "project.send_back", {
    targetType: "project",
    targetId: projectId,
  });
  revalidatePath("/admin");
  revalidatePath("/projects");
}

/** プロジェクトに応募 */
export async function applyToProject(
  projectId: string,
  formData: FormData
): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  // 応募（問い合わせ）は月額会員のみ（仕様11章の権限表に合わせる）
  if (me.paymentStatus !== "PAID") redirect("/billing");
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (
    !project ||
    project.memberId === me.id ||
    project.status !== "published" ||
    project.tenantId !== su.app.tenantId
  )
    return;
  const message = String(formData.get("message") ?? "").trim();
  const existing = await prisma.projectApplication.findUnique({
    where: { projectId_applicantMemberId: { projectId, applicantMemberId: me.id } },
  });
  await prisma.projectApplication.upsert({
    where: { projectId_applicantMemberId: { projectId, applicantMemberId: me.id } },
    create: { projectId, applicantMemberId: me.id, message: message || null },
    update: { message: message || null },
  });
  // 新規応募のときだけ掲載者へ通知（内容更新では送らない）
  if (!existing) {
    const to = await getMemberUserEmails(project.memberId);
    await notifyProjectApplication({
      to,
      projectTitle: project.title || "（無題）",
      applicantName: me.name,
      projectId,
    });
  }
  revalidatePath(`/projects/${projectId}`);
}
