"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { getOrCreateMemberForUser, getMemberUserEmails } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  notifyProjectApplication,
  notifyProjectApproved,
  notifyProjectSentBack,
} from "@/lib/email";
import { validateImageFile, storagePathFromUrl } from "@/lib/upload";
import { writeAudit } from "@/lib/audit";
import {
  PROJECT_PURPOSES,
  PROJECT_STAGES,
  RESOURCE_KINDS,
  REWARD_POLICIES,
  EVENT_FLAGS,
  MEETING_WISHES,
  PROGRESS_LABEL,
} from "@/lib/project-taxonomy";
import { missingForProjectPublish } from "@/lib/project-publish";
import { canSendToOthers } from "@/lib/security";

const BUCKET = "member-images";
const MAX_IMAGES = 6;
const MAX_ROLES = 10;
const MAX_RESOURCES = 10;

async function ownProject(projectId: string) {
  const su = await getSessionUser();
  if (!su) return null;
  const me = await getOrCreateMemberForUser(su);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.memberId !== me.id) return null;
  return { su, me, project };
}

export type ProjectState = { ok?: boolean; error?: string; warning?: string };

/* ───────────────────────── フォームの共通パース ───────────────────────── */

export type ProjectRoleInput = {
  name: string;
  request: string;
  requirement: string;
  headcount: string;
  period: string;
  reward: string;
  isPublic: boolean;
};

export type ProjectResourceInput = {
  kind: string;
  description: string;
  condition: string;
};

const PURPOSE_KEYS = PROJECT_PURPOSES.map(([v]) => v as string);
const STAGE_KEYS = PROJECT_STAGES.map(([v]) => v as string);
const RESOURCE_KEYS = RESOURCE_KINDS.map(([v]) => v as string);
const REWARD_KEYS = REWARD_POLICIES.map(([v]) => v as string);
const EVENT_KEYS = EVENT_FLAGS.map(([v]) => v as string);
const MEETING_KEYS = MEETING_WISHES.map(([v]) => v as string);

function parseRoles(raw: string): ProjectRoleInput[] {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .slice(0, MAX_ROLES)
      .map((r) => ({
        name: String(r?.name ?? "").trim().slice(0, 120),
        request: String(r?.request ?? "").trim().slice(0, 2000),
        requirement: String(r?.requirement ?? "").trim().slice(0, 2000),
        headcount: String(r?.headcount ?? "").trim().slice(0, 120),
        period: String(r?.period ?? "").trim().slice(0, 200),
        reward: String(r?.reward ?? "").trim().slice(0, 500),
        isPublic: r?.isPublic !== false,
      }))
      .filter((r) => r.name);
  } catch {
    return [];
  }
}

function parseResources(raw: string): ProjectResourceInput[] {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .slice(0, MAX_RESOURCES)
      .map((r) => ({
        kind: RESOURCE_KEYS.includes(String(r?.kind ?? "")) ? String(r.kind) : "other",
        description: String(r?.description ?? "").trim().slice(0, 2000),
        condition: String(r?.condition ?? "").trim().slice(0, 1000),
      }))
      .filter((r) => r.description || r.condition);
  } catch {
    return [];
  }
}

function parseProjectForm(formData: FormData) {
  const g = (k: string, max = 4000) => String(formData.get(k) ?? "").trim().slice(0, max);
  const pick = (k: string, list: string[]) => (list.includes(g(k, 60)) ? g(k, 60) : null);

  const title = g("title", 200);
  if (!title) return { error: "プロジェクト名は必須です。" as string };

  const tags = g("tags", 400)
    .split(/[,、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  // 募集期限（YYYY-MM-DD のみ受け付け、当日いっぱい有効）
  const deadlineRaw = g("deadline", 10);
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(deadlineRaw)
    ? new Date(`${deadlineRaw}T23:59:59+09:00`)
    : null;
  if (deadline && Number.isNaN(deadline.getTime())) {
    return { error: "募集期限の日付が正しくありません。" as string };
  }

  const purposeSub = formData
    .getAll("purposeSub")
    .map((v) => String(v))
    .filter((v) => PURPOSE_KEYS.includes(v))
    .slice(0, PURPOSE_KEYS.length);

  const eventFlags = formData
    .getAll("eventFlags")
    .map((v) => String(v))
    .filter((v) => EVENT_KEYS.includes(v));

  const roles = parseRoles(g("rolesJson", 40000));
  const resources = parseResources(g("resourcesJson", 40000));

  const data = {
    title,
    body: g("body") || null, // 旧・自由記述（互換のため編集可能なまま残す）
    fromRole: g("fromRole", 60) || null,
    // toRole は新フォームに入力欄が無い（募集役割 ProjectRole に移行）。
    // ここで空文字→null を保存すると既存データが消えるため、更新対象に含めない。
    area: g("area", 20) || null,
    budget: g("budget", 200) || null,
    tags,
    // 目的と基本情報
    purposeMain: pick("purposeMain", PURPOSE_KEYS),
    purposeSub,
    oneLiner: g("oneLiner", 200) || null,
    deadline,
    targetTiming: g("targetTiming", 200) || null,
    leaderName: g("leaderName", 100) || null,
    // 背景と実現したいこと
    challengeIssue: g("challengeIssue") || null,
    challengeWhy: g("challengeWhy") || null,
    challengeWho: g("challengeWho") || null,
    coCreationGoal: g("coCreationGoal") || null,
    futureVision: g("futureVision") || null,
    // 現在地
    stage: pick("stage", STAGE_KEYS),
    stageDone: g("stageDone") || null,
    stageLearned: g("stageLearned") || null,
    stageIssues: g("stageIssues") || null,
    stageSchedule: g("stageSchedule") || null,
    existingPartners: g("existingPartners", 1000) || null,
    // 条件・イベント連携
    period: g("period", 200) || null,
    place: g("place", 200) || null,
    rewardPolicy: pick("rewardPolicy", REWARD_KEYS),
    contractNote: g("contractNote", 1000) || null,
    eventFlags,
    supportRequested: formData.get("supportRequested") === "1",
  };

  return { data, roles, resources };
}

async function replaceRolesAndResources(
  projectId: string,
  roles: ProjectRoleInput[],
  resources: ProjectResourceInput[]
): Promise<void> {
  await prisma.$transaction([
    prisma.projectRole.deleteMany({ where: { projectId } }),
    ...(roles.length
      ? [
          prisma.projectRole.createMany({
            data: roles.map((r, i) => ({ projectId, ...r, sortOrder: i })),
          }),
        ]
      : []),
    prisma.projectResource.deleteMany({ where: { projectId } }),
    ...(resources.length
      ? [
          prisma.projectResource.createMany({
            data: resources.map((r, i) => ({ projectId, ...r, sortOrder: i })),
          }),
        ]
      : []),
  ]);
}

/* ───────────────────────── 一時画像（新規登録用） ───────────────────────── */

/** 新規登録フォーム用：一時領域へ画像をアップロード（保存時にプロジェクトへ紐付け）。 */
export async function uploadTempProjectImage(
  formData: FormData
): Promise<{ url?: string; error?: string; warning?: string }> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const member = await getOrCreateMemberForUser(su);
  const file = formData.get("file");
  const v = await validateImageFile(file);
  if (!v.ok) return { error: v.error };
  const path = `projects/tmp/${member.id}/${crypto.randomUUID()}.${v.ext}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, v.body, { contentType: v.contentType });
  if (error) return { error: `アップロード失敗：${error.message}` };
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, warning: v.warning };
}

/** 新規登録フォーム用：一時画像の取消（自分の一時フォルダ配下のみ）。 */
export async function removeTempProjectImage(url: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const member = await getOrCreateMemberForUser(su);
  const path = storagePathFromUrl(url, BUCKET, `projects/tmp/${member.id}/`);
  if (!path) return;
  const admin = createSupabaseAdminClient();
  await admin.storage.from(BUCKET).remove([path]).catch(() => {});
}

/** 一時画像をプロジェクトフォルダへ移動して紐付ける（最大6枚・自分の一時フォルダ配下のみ）。 */
async function attachTempProjectImages(
  memberId: string,
  projectId: string,
  tempUrls: string[]
): Promise<void> {
  if (!tempUrls.length) return;
  const admin = createSupabaseAdminClient();
  const current = await prisma.project.findUnique({
    where: { id: projectId },
    select: { imageUrls: true },
  });
  const urls: string[] = [...(current?.imageUrls ?? [])];
  for (const u of tempUrls) {
    if (urls.length >= MAX_IMAGES) break;
    const from = storagePathFromUrl(u, BUCKET, `projects/tmp/${memberId}/`);
    if (!from) continue;
    const name = from.split("/").pop();
    if (!name) continue;
    const to = `projects/${projectId}/${name}`;
    const { error } = await admin.storage.from(BUCKET).move(from, to);
    if (error) {
      console.error("[attachTempProjectImages] 移動失敗:", error.message);
      continue;
    }
    urls.push(admin.storage.from(BUCKET).getPublicUrl(to).data.publicUrl);
  }
  if (urls.length) {
    await prisma.project.update({ where: { id: projectId }, data: { imageUrls: urls } });
  }
}

/* ───────────────────────── 作成・保存・掲載 ───────────────────────── */

/** 新規登録（/projects/new の初回保存時に呼ばれる）。
 * 画面を開くだけではDBレコードを作らない。写真は一時アップロード→保存時に紐付け。 */
export async function createProject(
  _prev: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su!);

  const parsed = parseProjectForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const tempUrls = formData
    .getAll("tempImageUrls")
    .map((v) => String(v))
    .slice(0, MAX_IMAGES);

  // 二重送信ガード：同じタイトルのプロジェクトを直近1分以内に作っていたら、新規作成せずそれを開く
  const dup = await prisma.project.findFirst({
    where: {
      memberId: me.id,
      title: String(parsed.data.title),
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
    select: { id: true },
  });
  if (dup) {
    await attachTempProjectImages(me.id, dup.id, tempUrls);
    redirect(`/projects/${dup.id}/edit?created=1`);
  }

  const created = await prisma.project.create({
    data: {
      tenantId: su!.app.tenantId,
      memberId: me.id,
      status: "draft",
      ...parsed.data,
    },
  });
  await replaceRolesAndResources(created.id, parsed.roles, parsed.resources);
  await attachTempProjectImages(me.id, created.id, tempUrls);
  redirect(`/projects/${created.id}/edit?created=1`);
}

export async function saveProject(
  projectId: string,
  _prev: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  const owned = await ownProject(projectId);
  if (!owned) return { error: "権限がありません。" };
  const parsed = parseProjectForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  await prisma.project.update({ where: { id: projectId }, data: parsed.data });
  await replaceRolesAndResources(projectId, parsed.roles, parsed.resources);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { ok: true };
}

/** 掲載を申請（draft → pending）。事務局が承認すると published に。
 * 新規申請時のみ必須項目を検証し、不足があれば編集画面のバナーへ誘導する。 */
export async function submitProject(projectId: string): Promise<void> {
  const owned = await ownProject(projectId);
  if (!owned) return;
  // 掲載申請は無料（2026-08-10 最終決定書：月額ゲート撤廃。事前審査は従来どおり）
  if (owned.project.status === "draft" || owned.project.status === "closed") {
    const publicRoleCount = await prisma.projectRole.count({
      where: { projectId, isPublic: true },
    });
    const missing = missingForProjectPublish({ ...owned.project, publicRoleCount });
    if (missing.length) redirect(`/projects/${projectId}/edit?missing=1`);
    // 再申請時は前回の差し戻し理由を消す
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "pending", reviewNote: null },
    });
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
  if (owned.project.imageUrls.length >= MAX_IMAGES) return { error: "最大6枚です。" };
  const path = `projects/${projectId}/${crypto.randomUUID()}.${v.ext}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, v.body, { contentType: v.contentType });
  if (error) return { error: error.message };
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  await prisma.project.update({
    where: { id: projectId },
    data: { imageUrls: [...owned.project.imageUrls, data.publicUrl] },
  });
  revalidatePath(`/projects/${projectId}/edit`);
  return { ok: true, warning: v.warning };
}

/** 画像の並べ替え（1枚目=メイン画像）。既存URLの並べ替えのみ許可。 */
export async function reorderProjectImages(
  projectId: string,
  urls: string[]
): Promise<void> {
  const owned = await ownProject(projectId);
  if (!owned) return;
  const current = owned.project.imageUrls;
  const set = new Set(current);
  if (
    urls.length !== current.length ||
    new Set(urls).size !== urls.length ||
    !urls.every((u) => set.has(u))
  ) {
    return;
  }
  await prisma.project.update({ where: { id: projectId }, data: { imageUrls: urls } });
  revalidatePath(`/projects/${projectId}/edit`);
  revalidatePath(`/projects/${projectId}`);
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
  const { error } = await admin.storage.from(BUCKET).upload(path, v.body, { contentType: v.contentType });
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

/** 事務局：掲載を承認（pending → published）。掲載者へ承認メールを送る。 */
export async function adminApproveProject(projectId: string): Promise<void> {
  const su = await requireAdmin();
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: su.app.tenantId },
  });
  if (!project) return;
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "published", publishedAt: new Date(), reviewNote: null },
  });
  await writeAudit(su, "project.approve", {
    targetType: "project",
    targetId: projectId,
  });
  // メール送信に失敗しても承認自体は成立させる
  const to = await getMemberUserEmails(project.memberId);
  await notifyProjectApproved({
    to,
    projectTitle: project.title || "（無題）",
    projectId,
  }).catch((e) => console.error("[adminApproveProject] mail error", e));
  revalidatePath("/admin");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

/** 事務局：掲載を差し戻し（pending → draft）。理由は必須で、掲載者の編集画面に表示され、メールでも届く。 */
export async function adminSendBackProject(
  projectId: string,
  _prev: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  const su = await requireAdmin();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 2000);
  if (!reason) return { error: "差し戻しの理由をご記入ください。" };
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: su.app.tenantId },
  });
  if (!project) return { error: "対象のプロジェクトが見つかりません。" };
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "draft", reviewNote: reason },
  });
  await writeAudit(su, "project.send_back", {
    targetType: "project",
    targetId: projectId,
    detail: `理由：${reason}`,
  });
  // メール送信に失敗しても差し戻し自体は成立させる
  const to = await getMemberUserEmails(project.memberId);
  await notifyProjectSentBack({
    to,
    projectTitle: project.title || "（無題）",
    projectId,
    reason,
  }).catch((e) => console.error("[adminSendBackProject] mail error", e));
  revalidatePath("/admin");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/* ───────────────────────── 興味があります（応募） ───────────────────────── */

/** 「興味があります」を送る（応募）。重い参加申請ではなく軽い接点づくり。 */
export async function applyToProject(
  projectId: string,
  _prev: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su!);
  // 興味表明（応募）は無料（2026-08-10 最終決定書：月額ゲート撤廃）
  // ただし非承認・停止の会員は応募できない
  if (!canSendToOthers(me.status)) {
    return { error: "現在のご登録状態では応募できません。事務局までお問い合わせください。" };
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (
    !project ||
    project.memberId === me.id ||
    project.status !== "published" ||
    project.tenantId !== su!.app.tenantId
  ) {
    return { error: "この募集には応募できません。" };
  }
  // 募集終了後は応募できない
  if (project.deadline && project.deadline.getTime() < Date.now()) {
    return { error: "募集期限を過ぎています。" };
  }

  const g = (k: string, max = 2000) => String(formData.get(k) ?? "").trim().slice(0, max);
  const reason = g("reason");
  if (!reason) return { error: "「興味を持った理由」をご記入ください。" };
  const meetingWishRaw = g("meetingWish", 20);
  const meetingWish = MEETING_KEYS.includes(meetingWishRaw) ? meetingWishRaw : null;

  const existing = await prisma.projectApplication.findUnique({
    where: { projectId_applicantMemberId: { projectId, applicantMemberId: me.id } },
  });
  const fields = {
    reason,
    offer: g("offer") || null,
    involvement: g("involvement") || null,
    meetingWish,
    desiredRole: g("desiredRole", 120) || null,
    message: g("note") || null,
  };
  const app = await prisma.projectApplication.upsert({
    where: { projectId_applicantMemberId: { projectId, applicantMemberId: me.id } },
    create: { projectId, applicantMemberId: me.id, ...fields },
    update: fields,
  });
  // 新規応募のときだけ掲載者へ通知＋活動履歴（内容更新では送らない）
  if (!existing) {
    await prisma.projectActivity.create({
      data: {
        projectId,
        applicationId: app.id,
        actorMemberId: me.id,
        type: "applied",
        detail: `${me.name} さんが興味を表明しました`,
      },
    });
    const to = await getMemberUserEmails(project.memberId);
    await notifyProjectApplication({
      to,
      projectTitle: project.title || "（無題）",
      applicantName: me.name,
      projectId,
    });
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/* ───────────────────────── 応募者ごとの進捗管理（主催者のみ） ───────────────────────── */

const PROGRESS_KEYS = Object.keys(PROGRESS_LABEL);

/** 応募者の進捗（段階・次の行動・期限・担当・次回打合せ・メモ）を更新する。
 * 主催者のみ。段階変更などの重要操作は活動履歴に記録する。 */
export async function updateApplicationProgress(
  applicationId: string,
  _prev: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const me = await getOrCreateMemberForUser(su);
  const app = await prisma.projectApplication.findUnique({
    where: { id: applicationId },
    include: { project: { select: { id: true, memberId: true } } },
  });
  if (!app || app.project.memberId !== me.id) return { error: "権限がありません。" };

  const g = (k: string, max = 2000) => String(formData.get(k) ?? "").trim().slice(0, max);
  const stageRaw = g("progressStage", 20);
  const progressStage = PROGRESS_KEYS.includes(stageRaw) ? stageRaw : app.progressStage;

  const dueRaw = g("nextActionDue", 10);
  const nextActionDue = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw)
    ? new Date(`${dueRaw}T23:59:59+09:00`)
    : null;
  const meetingRaw = g("nextMeetingAt", 16); // datetime-local (YYYY-MM-DDTHH:mm)
  const nextMeetingAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(meetingRaw)
    ? new Date(`${meetingRaw}:00+09:00`)
    : null;

  const data = {
    progressStage,
    nextAction: g("nextAction", 300) || null,
    nextActionDue,
    assignee: g("assignee", 100) || null,
    nextMeetingAt,
    ownerMemo: g("ownerMemo") || null,
    holdReason: g("holdReason", 1000) || null,
  };

  const activities: { type: string; detail: string }[] = [];
  if (progressStage !== app.progressStage) {
    const t =
      progressStage === "hold"
        ? "hold"
        : progressStage === "declined"
          ? "declined"
          : progressStage === "done"
            ? "done"
            : "stage_change";
    activities.push({
      type: t,
      detail: `${PROGRESS_LABEL[app.progressStage] ?? app.progressStage} → ${PROGRESS_LABEL[progressStage] ?? progressStage}`,
    });
  }
  if (data.assignee !== (app.assignee ?? null) && (data.assignee || app.assignee)) {
    activities.push({
      type: "assignee_change",
      detail: `担当：${app.assignee ?? "未設定"} → ${data.assignee ?? "未設定"}`,
    });
  }
  if (data.nextAction !== (app.nextAction ?? null) && (data.nextAction || app.nextAction)) {
    activities.push({
      type: "next_action",
      detail: `次の行動：${data.nextAction ?? "（クリア）"}`,
    });
  }

  await prisma.projectApplication.update({ where: { id: applicationId }, data });
  if (activities.length) {
    await prisma.projectActivity.createMany({
      data: activities.map((a) => ({
        projectId: app.project.id,
        applicationId,
        actorMemberId: me.id,
        ...a,
      })),
    });
  }
  revalidatePath(`/projects/${app.project.id}/applicants`);
  revalidatePath(`/projects/${app.project.id}`);
  return { ok: true };
}
