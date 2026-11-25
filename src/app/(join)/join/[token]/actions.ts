"use server";

// 「使いますか？」への返事（2026-11-23／2026-11-26 に「新規登録」を追加）。
// ⚠️⚠️ **GET では実行しない。** メールの安全装置がリンクを先に踏むので、
//    GET で消したり承諾したりすると、本人が開く前に答えが決まってしまう。
//    だから「はい」も「いいえ」も「新規登録」も、フォーム（POST）でしか動かない。
// ⚠️⚠️ **「はい」以外は、お預かりした情報を消す**（2026-11-26 ユーザー指示
//    「はい 以外を押されたらDBから情報を全て削除する」）。
import { redirect } from "next/navigation";
import { acceptInvite, declineInvite } from "@/lib/member-invite";

export async function answerYes(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "");
  const r = await acceptInvite(token);
  if (!r.ok) redirect(`/join/${encodeURIComponent(token)}?e=1`);
  // 続けてアカウントを作っていただく。メールは先に入れておく
  redirect(`/signup?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(r.email ?? "")}`);
}

export async function answerNo(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "");
  await declineInvite(token);
  // 消したあとなので、合言葉ではもう引けない。お礼だけ出す
  redirect("/join/done");
}

/**
 * 「新規登録」＝預かった情報は使わず、ご自分で入れ直す。
 * ⚠️ これも「はい」ではないので、**先に消してから**登録画面へ送る。
 *    合言葉は渡さない（渡すと、消した行につなごうとして失敗する）。
 */
export async function answerFresh(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "");
  await declineInvite(token);
  redirect("/signup");
}
