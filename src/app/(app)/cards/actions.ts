"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { exchangeByCode, getOrCreateMyCard, updateMyNote } from "@/lib/cards";
import { defaultMetAt } from "@/lib/card-summit";

export type ExchangeState = { ok?: boolean; already?: boolean; error?: string };

/**
 * カードを交換する。
 * ⚠️ **GETでは絶対に交換させない**（リンクの先読みやクローラで勝手に成立してしまう）。
 *    確認画面を見せたうえで、このサーバーアクションから実行する。
 */
export async function exchange(_prev: ExchangeState, formData: FormData): Promise<ExchangeState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインしてからお試しください。" };
  const me = await getOrCreateMemberForUser(su);

  const code = String(formData.get("code") ?? "");
  // 「どこで会ったか」は会期から自動で入れる。本人が書いたものがあればそちらを優先
  const typed = String(formData.get("metAt") ?? "").trim();
  const metAt = typed || defaultMetAt();

  const result = await exchangeByCode({ id: me.id, tenantId: me.tenantId }, code, metAt);
  if (!result.ok) return { error: result.error };

  revalidatePath("/cards");
  return { ok: true, already: result.already };
}

/** 自分の側のメモだけを書き換える（相手のメモには触らない） */
export async function saveNote(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await updateMyNote(me.id, String(formData.get("exchangeId") ?? ""), String(formData.get("note") ?? ""));
  revalidatePath("/cards");
}

/** カードの設定（肩書き・一言・交換の受付）。中身は Member から引くので、ここは出し方だけ */
export async function saveCardSettings(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await getOrCreateMyCard({ id: me.id, tenantId: me.tenantId });

  await prisma.memberCard.update({
    where: { memberId: me.id },
    data: {
      jobTitle: String(formData.get("jobTitle") ?? "").trim().slice(0, 100) || null,
      headline: String(formData.get("headline") ?? "").trim().slice(0, 140) || null,
      isActive: formData.get("isActive") === "on",
    },
  });
  revalidatePath("/cards");
}
