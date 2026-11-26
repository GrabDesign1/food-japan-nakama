"use server";

// コミュニティの投稿（2026-11-21）。
// ⚠️ 見える範囲・書ける範囲の判定は、すべて feed.ts（サーバー）で行う。
//    画面から渡された id を信じない。
// ⚠️ 通知メールは after() で応答のあとに送る。送信に失敗しても操作は成功のままにする
//    （いいねが保存されたのにエラー表示、が一番困る）。判定は feed-notify.ts。

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  addComment, createPost, deleteMyPost, deleteComment, editMyPost, sharePost,
  toggleLike, postAuthorId, POST_IMAGE_MAX, POST_BODY_MAX,
} from "@/lib/feed";
import { recordContact } from "@/lib/relationship";
import { notifyOnComment, notifyOnLike, notifyOnShare, setFeedEmailEnabled } from "@/lib/feed-notify";
import { fetchLinkPreview, fetchLinkImage } from "@/lib/link-preview";

const BUCKET = "post-images";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type PostState = { ok?: boolean; error?: string };

/** 投稿した本人のプロフィール（取り組み欄）も作り直す。
 *  ⚠️ ホーム（/dashboard）にも同じ流れが出ている（2026-11-26〜）。
 *     ここに足さないと、ホームの投稿欄から書いたのに下の流れに出てこない。 */
function revalidateFeed(memberId?: string | null): void {
  revalidatePath("/dashboard");
  if (memberId) revalidatePath(`/producers/${memberId}`);
}

export async function submitPost(_prev: PostState, formData: FormData): Promise<PostState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインしてからお試しください。" };
  const me = await getOrCreateMemberForUser(su);

  // いたずら投稿よけ（人には見えない欄。埋まっていたら黙って成功を返す）
  if (String(formData.get("_gotcha") ?? "")) return { ok: true };

  const body = String(formData.get("body") ?? "").slice(0, POST_BODY_MAX);
  const linkUrl = String(formData.get("linkUrl") ?? "");
  let linkTitle = String(formData.get("linkTitle") ?? "");
  let linkImageUrl = "";
  let linkSiteName = "";

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

  // リンクが貼られていたら、見出し・画像・媒体名を読む。
  // ⚠️ 読めなくても投稿は通す（相手のサイトが落ちていても書けないのは困る）。
  if (linkUrl.trim()) {
    const preview = await fetchLinkPreview(linkUrl.trim()).catch(() => null);
    if (preview) {
      if (!linkTitle.trim() && preview.title) linkTitle = preview.title;
      linkImageUrl = preview.imageUrl ?? "";
      linkSiteName = preview.siteName ?? "";
    }
  }

  const result = await createPost(
    { id: me.id, tenantId: me.tenantId },
    { body, linkUrl, linkTitle, linkImageUrl, linkSiteName, imagePaths }
  );
  if (!result.ok) return { error: result.error };

  revalidateFeed(me.id);
  return { ok: true };
}

export type PeekState = {
  title?: string | null;
  siteName?: string | null;
  imageUrl?: string | null;
  /** 投稿前の下見に出す画像（data: URL）。⚠️ 外部URLではない。下の説明を読むこと */
  imageDataUrl?: string | null;
  error?: string;
};

/**
 * 投稿前の下見に出す画像の上限。
 * ⚠️ data: URL は本文としてブラウザまで運ばれる（base64 で約1.33倍になる）。
 *    大きいものは画像なしで出す。投稿後は /api/link-image/[postId] から普通に配るので、
 *    「下見では出ないが、投稿すると出る」ことはある。
 */
const PEEK_IMAGE_MAX_BYTES = 600 * 1024;

/**
 * 投稿する前に、貼ったURLの見出しを読んでみる（投稿欄のプレビュー用）。
 *
 * ⚠️⚠️ **外部の画像URLを <img src> に書かせない。** CSP は img-src 'self' data: blob: なので、
 *    外部URLを直接書くと表示できないうえ、会員が下書き中であることが相手のサイトに伝わる。
 *    そこでサーバーが取りに行き、**中身を data: URL にして返す**（取得口を外に作らずに済む）。
 * ⚠️ 取りに行く先の点検（私用アドレス・転送・大きさ・形式）は fetchLinkImage が行う。
 */
export async function peekLink(url: string): Promise<PeekState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインしてからお試しください。" };
  const preview = await fetchLinkPreview(url).catch(() => null);
  if (!preview) return { error: "このURLからは見出しを読めませんでした。手で入れてください。" };

  let imageDataUrl: string | null = null;
  if (preview.imageUrl) {
    const img = await fetchLinkImage(preview.imageUrl).catch(() => null);
    if (img && img.body.byteLength <= PEEK_IMAGE_MAX_BYTES) {
      imageDataUrl = `data:${img.contentType};base64,${Buffer.from(img.body).toString("base64")}`;
    }
  }
  return {
    title: preview.title,
    siteName: preview.siteName,
    imageUrl: preview.imageUrl,
    imageDataUrl,
  };
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
      after(() => notifyOnLike({ postId, actorMemberId: me.id }));
      revalidatePath(`/producers/${author}`);
    }
  }
  revalidateFeed(me.id);
}

export async function comment(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  const postId = String(formData.get("postId") ?? "");
  const body = String(formData.get("body") ?? "");
  const parentId = String(formData.get("parentId") ?? "") || null;
  const result = await addComment(me.id, postId, body, parentId);

  if (result.ok) {
    const author = await postAuthorId(postId);
    if (author) {
      await recordContact({
        tenantId: me.tenantId, actorMemberId: me.id, otherMemberId: author, kind: "post_comment",
      });
      revalidatePath(`/producers/${author}`);
    }
    after(() =>
      notifyOnComment({ postId, actorMemberId: me.id, body, parentId: result.parentId })
    );
  }
  // コメントはプロフィールの取り組み欄には出ないので、流れだけ作り直す
  revalidatePath("/dashboard");
}

export async function removeComment(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await deleteComment(me.id, String(formData.get("commentId") ?? ""));
  revalidatePath("/dashboard");
}

export async function editPost(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await editMyPost(me.id, String(formData.get("postId") ?? ""), {
    body: String(formData.get("body") ?? ""),
    linkTitle: String(formData.get("linkTitle") ?? ""),
  });
  revalidateFeed(me.id);
}

/** 他の人の投稿を、ひとこと添えて自分のつながりに紹介する */
export async function sharePostAction(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  const originalPostId = String(formData.get("postId") ?? "");
  const body = String(formData.get("body") ?? "");

  const result = await sharePost({ id: me.id, tenantId: me.tenantId }, originalPostId, body);
  if (result.ok) {
    const author = await postAuthorId(result.originalId);
    if (author) {
      await recordContact({
        tenantId: me.tenantId, actorMemberId: me.id, otherMemberId: author, kind: "post_comment",
      });
    }
    after(() =>
      notifyOnShare({
        originalPostId: result.originalId,
        sharePostId: result.id,
        actorMemberId: me.id,
        comment: body,
      })
    );
  }
  revalidateFeed(me.id);
}

export async function removePost(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await deleteMyPost(me.id, String(formData.get("postId") ?? ""));
  revalidateFeed(me.id);
}

/** 通知メールの受け取りを切り替える（/feed の下の切り替え） */
export async function toggleFeedEmail(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  await setFeedEmailEnabled(su.app.id, String(formData.get("enabled") ?? "") === "1");
  revalidatePath("/dashboard");
}
