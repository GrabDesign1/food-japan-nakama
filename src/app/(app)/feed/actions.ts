"use server";

// コミュニティの投稿（2026-11-21）。
// ⚠️ 見える範囲・書ける範囲の判定は、すべて feed.ts（サーバー）で行う。
//    画面から渡された id を信じない。

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  addComment, createPost, deleteMyPost, toggleLike, postAuthorId,
  POST_IMAGE_MAX, POST_BODY_MAX,
} from "@/lib/feed";
import { recordContact } from "@/lib/relationship";

const BUCKET = "post-images";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type PostState = { ok?: boolean; error?: string };

export async function submitPost(_prev: PostState, formData: FormData): Promise<PostState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインしてからお試しください。" };
  const me = await getOrCreateMemberForUser(su);

  // いたずら投稿よけ（人には見えない欄。埋まっていたら黙って成功を返す）
  if (String(formData.get("_gotcha") ?? "")) return { ok: true };

  const body = String(formData.get("body") ?? "").slice(0, POST_BODY_MAX);
  const linkUrl = String(formData.get("linkUrl") ?? "");
  const linkTitle = String(formData.get("linkTitle") ?? "");

  // 画像を非公開バケットへ。失敗した画像は黙って捨てず、その場で知らせる
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const imagePaths: string[] = [];
  if (files.length > POST_IMAGE_MAX) {
    return { error: `写真は${POST_IMAGE_MAX}枚までです。` };
  }
  if (files.length) {
    const admin = createSupabaseAdminClient();
    for (const file of files) {
      if (!OK_TYPES.includes(file.type)) {
        return { error: "写真はJPEG・PNG・WebPのいずれかでお願いします。" };
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return { error: "写真が大きすぎます。1枚8MBまでです。" };
      }
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${me.id}/${randomUUID()}.${ext}`;
      const { error } = await admin.storage
        .from(BUCKET)
        .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
      if (error) {
        console.error("[feed] 画像の保存に失敗:", error);
        return { error: "写真を保存できませんでした。電波の良いところでもう一度お試しください。" };
      }
      imagePaths.push(path);
    }
  }

  const result = await createPost(
    { id: me.id, tenantId: me.tenantId },
    { body, linkUrl, linkTitle, imagePaths }
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/feed");
  return { ok: true };
}

export async function like(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  const postId = String(formData.get("postId") ?? "");
  const nowLiked = await toggleLike(me.id, postId);

  // ⚠️ 付けたときだけ接触として数える。外したときに減点はしない
  //    （押し直しで強さが上下すると、数字が行動の記録でなくなる）。
  if (nowLiked === true) {
    const author = await postAuthorId(postId);
    if (author) {
      await recordContact({
        tenantId: me.tenantId, actorMemberId: me.id, otherMemberId: author, kind: "post_like",
      });
    }
  }
  revalidatePath("/feed");
}

export async function comment(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  const postId = String(formData.get("postId") ?? "");
  const result = await addComment(me.id, postId, String(formData.get("body") ?? ""));

  if (result.ok) {
    const author = await postAuthorId(postId);
    if (author) {
      await recordContact({
        tenantId: me.tenantId, actorMemberId: me.id, otherMemberId: author, kind: "post_comment",
      });
    }
  }
  revalidatePath("/feed");
}

export async function removePost(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await deleteMyPost(me.id, String(formData.get("postId") ?? ""));
  revalidatePath("/feed");
}
