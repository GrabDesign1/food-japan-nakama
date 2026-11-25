"use server";

// 「使いますか？」への返事（2026-11-23）。
// ⚠️⚠️ **GET では実行しない。** メールの安全装置がリンクを先に踏むので、
//    GET で消したり承諾したりすると、本人が開く前に答えが決まってしまう。
//    だから「はい」も「いいえ」も、このフォーム（POST）でしか動かない。
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
