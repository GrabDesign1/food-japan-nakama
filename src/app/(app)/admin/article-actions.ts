"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { fetchOgMeta } from "@/lib/og";

export type ArticleState = {
  ok?: boolean;
  error?: string;
  message?: string;
  /**
   * エラー時に返す入力値。
   * ⚠️ React 19 はサーバーアクション完了時に form をリセットするので、
   *    これを返して画面側で入れ直さないと**入力中の内容が消える**
   *    （認証フォームで踏んで commit c08dcb7 で直した件と同じ罠）。
   */
  values?: Record<string, string | boolean>;
};

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
  const authorIn = String(formData.get("author") ?? "").trim();
  // 掲載期間（date入力 "YYYY-MM-DD"）。開始は0時、終了はその日の23:59:59まで含める。
  // Food Japan Summit がきっかけの取り組みか（トップでタグを出す）
  const fromSummit = formData.get("fromSummit") === "on";
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
  let author = authorIn;
  if (!title || !imageUrl || !excerpt || !author) {
    const og = await fetchOgMeta(url);
    if (!title && og.title) title = og.title;
    if (!imageUrl && og.image) imageUrl = og.image;
    if (!excerpt && og.description) excerpt = og.description;
    // ⚠️ 取れなければ空のままにする（推測で埋めると出所を誤って表示することになる）。
    if (!author && og.author) author = og.author;
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
      author: author || null,
      fromSummit,
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

/**
 * 記事を更新する（編集モーダルから呼ぶ）。
 *
 * ⚠️ 追加時と違い、**空欄をURLからの自動取得で埋めない**。編集では「消したい」意図で
 *    空にすることがあり、勝手に埋め戻すと消せなくなるため。
 * ⚠️ tenantId を where に必ず入れる（他テナントの記事を書き換えられないように）。
 */
export async function updateArticle(
  id: string,
  _prev: ArticleState,
  formData: FormData
): Promise<ArticleState> {
  const su = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  const imageUrl = normalizeUrl(String(formData.get("imageUrl") ?? ""));
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const fromSummit = formData.get("fromSummit") === "on";
  const active = formData.get("active") === "on";
  const startRaw = String(formData.get("publishStart") ?? "").trim();
  const endRaw = String(formData.get("publishEnd") ?? "").trim();
  const publishStart = startRaw ? new Date(`${startRaw}T00:00:00`) : null;
  const publishEnd = endRaw ? new Date(`${endRaw}T23:59:59`) : null;

  // ⚠️ エラーで返すときは必ず values も返す（返さないと入力が消える）。
  const values = {
    title, source, url: url ?? "", imageUrl: imageUrl ?? "", excerpt, author,
    fromSummit, active, publishStart: startRaw, publishEnd: endRaw,
  };
  const fail = (error: string): ArticleState => ({ error, values });

  if (!title) return fail("記事タイトルを入力してください。");
  if (!source) return fail("出典（PR TIMES / note / 新聞名など）を入力してください。");
  if (!url) return fail("記事URLを入力してください。");
  if (publishStart && publishEnd && publishEnd < publishStart) {
    return fail("掲載終了日は掲載開始日より後にしてください。");
  }

  const res = await prisma.curatedArticle.updateMany({
    where: { id, tenantId: su.app.tenantId },
    data: {
      title,
      source,
      url,
      imageUrl: imageUrl || null,
      excerpt: excerpt || null,
      author: author || null,
      fromSummit,
      active,
      publishStart,
      publishEnd,
    },
  });
  if (res.count === 0) return fail("記事が見つかりませんでした。");

  await writeAudit(su, "article.update", { targetType: "article", targetId: id });
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: "記事を更新しました。" };
}

