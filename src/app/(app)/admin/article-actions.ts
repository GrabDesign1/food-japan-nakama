"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { fetchOgMeta } from "@/lib/og";

export type ArticleState = { ok?: boolean; error?: string; message?: string };

function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

/** キュレーション記事を追加する。 */
export async function createArticle(
  _prev: ArticleState,
  formData: FormData
): Promise<ArticleState> {
  const su = await requireAdmin();

  const titleIn = String(formData.get("title") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  const imageIn = normalizeUrl(String(formData.get("imageUrl") ?? ""));
  const excerptIn = String(formData.get("excerpt") ?? "").trim();
  // 掲載期間（date入力 "YYYY-MM-DD"）。開始は0時、終了はその日の23:59:59まで含める。
  const startRaw = String(formData.get("publishStart") ?? "").trim();
  const endRaw = String(formData.get("publishEnd") ?? "").trim();
  const publishStart = startRaw ? new Date(`${startRaw}T00:00:00`) : null;
  const publishEnd = endRaw ? new Date(`${endRaw}T23:59:59`) : null;

  if (!source) return { error: "出典（PR TIMES / note / 新聞名など）を入力してください。" };
  if (!url) return { error: "記事URLを入力してください。" };
  if (publishStart && publishEnd && publishEnd < publishStart) {
    return { error: "掲載終了日は開始日より後にしてください。" };
  }

  // 未入力（タイトル・画像・概要）は記事URLのOGP情報から自動補完する
  let title = titleIn;
  let imageUrl = imageIn;
  let excerpt = excerptIn;
  if (!title || !imageUrl || !excerpt) {
    const og = await fetchOgMeta(url);
    if (!title && og.title) title = og.title;
    if (!imageUrl && og.image) imageUrl = og.image;
    if (!excerpt && og.description) excerpt = og.description;
  }

  if (!title) {
    return { error: "タイトルを自動取得できませんでした。タイトルを入力してください。" };
  }

  const last = await prisma.curatedArticle.findFirst({
    where: { tenantId: su.app.tenantId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.curatedArticle.create({
    data: {
      tenantId: su.app.tenantId,
      title,
      source,
      url,
      imageUrl: imageUrl || null,
      excerpt: excerpt || null,
      publishStart,
      publishEnd,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  await writeAudit(su, "article.create", { targetType: "article", targetId: title || "(無題)" });
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: "記事を追加しました。" };
}

export async function deleteArticle(id: string): Promise<void> {
  const su = await requireAdmin();
  await prisma.curatedArticle.deleteMany({ where: { id, tenantId: su.app.tenantId } });
  await writeAudit(su, "article.delete", { targetType: "article", targetId: id });
  revalidatePath("/admin");
  revalidatePath("/");
}

/** 表示/非表示を切り替える。 */
export async function toggleArticle(id: string, active: boolean): Promise<void> {
  const su = await requireAdmin();
  await prisma.curatedArticle.updateMany({
    where: { id, tenantId: su.app.tenantId },
    data: { active },
  });
  await writeAudit(su, "article.toggle", { targetType: "article", targetId: id });
  revalidatePath("/admin");
  revalidatePath("/");
}
