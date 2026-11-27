"use server";

/**
 * 通知メールの ON/OFF（2026-11-28 ユーザー指示）。
 * ⚠️ 自分の設定しか変えられない（userId はセッションから取る。フォームから受け取らない）。
 */
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { setNotifySetting, NOTIFY_KINDS, type NotifyKind } from "@/lib/notify-settings";

export async function toggleNotify(kind: string, enabled: boolean): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  if (!(NOTIFY_KINDS as readonly string[]).includes(kind)) return;
  await setNotifySetting(su.app.id, kind as NotifyKind, enabled);
  revalidatePath("/settings/notifications");
}
