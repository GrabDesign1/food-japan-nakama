"use server";

/**
 * 【プッシュ通知の購読】2026-11-28（PWA・Web Push）。
 *
 * ⚠️⚠️ **endpoint は通知の宛先そのもの。** 保存するのは**自分の会員**にだけ結びつける
 *    （memberId はセッションから取る。フォームから受け取らない）。
 * ⚠️ 同じ端末で許可し直すと endpoint が同じまま来るので upsert にする（重複して2通届くのを防ぐ）。
 */
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";

export type PushState = { ok?: boolean; error?: string };

export async function savePushSubscription(
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent: string
): Promise<PushState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const me = await getOrCreateMemberForUser(su);
  if (!endpoint || !p256dh || !auth) return { error: "この端末では通知を受け取れませんでした。" };

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { memberId: me.id, endpoint, p256dh, auth, userAgent: userAgent.slice(0, 200) },
    // ⚠️ 端末を別の人が使い始めた場合に備えて、会員の紐づけも上書きする
    update: { memberId: me.id, p256dh, auth, userAgent: userAgent.slice(0, 200) },
  });
  revalidatePath("/settings/notifications");
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<PushState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const me = await getOrCreateMemberForUser(su);
  // ⚠️ 自分の行しか消せない
  await prisma.pushSubscription.deleteMany({ where: { endpoint, memberId: me.id } });
  revalidatePath("/settings/notifications");
  return { ok: true };
}
