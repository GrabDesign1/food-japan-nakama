"use server";

// 特設ページへの共有（写真・動画・記事）。2026-11-26
//
// ⚠️⚠️ **ここで投稿しても、公開ページには出ません。** 出すのは事務局の「公開する」操作だけ。
// ⚠️ 写真は非公開バケットへ。公開URLは作らない。
// ⚠️ 動画・記事はURLを預かり、見出しと画像はサーバーが読む（会員の端末から相手サイトへ行かせない）。
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchLinkPreview } from "@/lib/link-preview";
import { writeAudit } from "@/lib/audit";
import {
  createShare, deleteMyShare, adminDeleteShare, setFeatured,
  SHARE_BODY_MAX, SHARE_IMAGE_MAX, type ShareKind,
} from "@/lib/summit-share";

const BUCKET = "post-images";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ShareState = { ok?: boolean; error?: string };

export async function submitShare(_prev: ShareState, fd: FormData): Promise<ShareState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインしてからお試しください。" };
  const me = await getOrCreateMemberForUser(su);

  // いたずらよけ（人には見えない欄）
  if (String(fd.get("_gotcha") ?? "")) return { ok: true };

  const body = String(fd.get("body") ?? "").slice(0, SHARE_BODY_MAX);
  const url = String(fd.get("url") ?? "").trim();
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  if (!url && files.length === 0 && !body.trim()) {
    return { error: "写真を選ぶか、URLを貼るか、ひとこと書いてください。" };
  }
  if (files.length > SHARE_IMAGE_MAX) return { error: `写真は${SHARE_IMAGE_MAX}枚までです。` };

  // 写真を預かる
  const imagePaths: string[] = [];
  if (files.length) {
    const admin = createSupabaseAdminClient();
    for (const file of files) {
      if (!OK_TYPES.includes(file.type)) {
        return { error: "写真はJPEG・PNG・WebPのいずれかでお願いします。" };
      }
      if (file.size > MAX_IMAGE_BYTES) return { error: "写真が大きすぎます。1枚8MBまでです。" };
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `summit/${me.id}/${randomUUID()}.${ext}`;
      const { error } = await admin.storage
        .from(BUCKET)
        .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
      if (error) {
        console.error("[summit-share] 画像の保存に失敗:", error);
        return { error: "写真を保存できませんでした。電波の良いところでもう一度お試しください。" };
      }
      imagePaths.push(path);
    }
  }

  // URLがあれば見出しを読む。⚠️ 読めなくても投稿は通す
  let link: { url: string; title: string | null; imageUrl: string | null; siteName: string | null } | undefined;
  if (url) {
    const p = await fetchLinkPreview(url).catch(() => null);
    link = { url, title: p?.title ?? null, imageUrl: p?.imageUrl ?? null, siteName: p?.siteName ?? null };
  }

  // 動画か記事かは、URLの行き先で決める（本人に選ばせない＝手間を増やさない）
  const kind: ShareKind = imagePaths.length
    ? "photo"
    : url && /youtu\.be|youtube\.com|vimeo\.com|tiktok\.com|instagram\.com\/(reel|tv)|facebook\.com\/.*\/videos/i.test(url)
      ? "video"
      : "article";

  await createShare({
    tenantId: me.tenantId,
    authorMemberId: me.id,
    kind,
    body,
    imagePaths,
    link,
  });

  revalidatePath("/summit/share");
  return { ok: true };
}

/** 自分のものを消す */
export async function removeMyShare(fd: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await deleteMyShare(me.id, String(fd.get("id") ?? ""));
  revalidatePath("/summit/share");
  revalidatePath("/summit/2026-miyazaki");
}

/**
 * 事務局：公開ページへ出す／下げる。
 * ⚠️⚠️ **写っている方の同意は、押す人（事務局）が確かめる。**
 */
export async function toggleFeatured(fd: FormData): Promise<void> {
  const su = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const on = String(fd.get("on") ?? "") === "1";
  if (await setFeatured(su.app.tenantId, id, on)) {
    await writeAudit(su, on ? "summit.share.feature" : "summit.share.unfeature", {
      targetType: "summitShare",
      targetId: id,
      detail: on ? "特設ページ（公開側）に出した" : "特設ページ（公開側）から下げた",
    }).catch((e) => console.error("[summit-share] 監査ログに失敗:", e));
  }
  revalidatePath("/summit/share");
  revalidatePath("/summit/2026-miyazaki");
}

/** 事務局：消す（通報対応など） */
export async function removeShareAsAdmin(fd: FormData): Promise<void> {
  const su = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (await adminDeleteShare(su.app.tenantId, id)) {
    await writeAudit(su, "summit.share.delete", {
      targetType: "summitShare",
      targetId: id,
      detail: "特設ページの共有を削除した",
    }).catch((e) => console.error("[summit-share] 監査ログに失敗:", e));
  }
  revalidatePath("/summit/share");
  revalidatePath("/summit/2026-miyazaki");
}
