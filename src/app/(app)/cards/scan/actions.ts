"use server";

// 名刺の取り込み（2026-11-21）。
// ⚠️ 扱うのは**他人の個人情報**。保存先は ContactCard（持ち主以外は読めない）。
// ⚠️ 読み取りはAIの下書き。保存するのは**本人が確認した値**だけ。

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { scanBusinessCard, suggestFromCard, AI_ENABLED, type CardScanDraft, type CardInsight } from "@/lib/ai";
import { matchMembers, type CardMatch } from "@/lib/card-match";
import { prisma } from "@/lib/db";
import { createContactCard, deleteContactCard, updateContactCardNote, CARD_BUCKET } from "@/lib/contact-cards";
import { CARD_IMAGE_MAX_BYTES, CARD_TAG_MAX } from "@/lib/contact-card-core";

export type ScanState = {
  draft?: CardScanDraft;
  imagePath?: string;
  /** NAKAMAにいそうな会員（最大3件）。⚠️ 勝手に結ばず、本人に選ばせる */
  matches?: CardMatch[];
  /** AIの提案（タグ・一緒にできそうなこと・ごあいさつ）。⚠️ 事実ではない */
  insight?: CardInsight;
  error?: string;
};

/** 撮った写真を読み取る。**保存はまだしない**（本人が直してから saveCard で保存する） */
export async function scanCard(_prev: ScanState, formData: FormData): Promise<ScanState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインしてからお試しください。" };
  const me = await getOrCreateMemberForUser(su);
  if (!AI_ENABLED) return { error: "いまは読み取りをご利用いただけません。手で入力してください。" };

  const dataUrl = String(formData.get("image") ?? "");
  if (!dataUrl) return { error: "写真を選んでください。" };
  // data URL の実バイト数をざっくり見る（base64 は約4/3倍）
  if (dataUrl.length * 0.75 > CARD_IMAGE_MAX_BYTES) {
    return { error: "写真が大きすぎます。もう一度撮影してください。" };
  }

  const result = await scanBusinessCard(dataUrl);
  if ("error" in result) return { error: result.error };

  // 読み取れたら画像を保存しておく（本人が保存を選んだときに使う）
  let imagePath: string | undefined;
  try {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
    if (m) {
      const bytes = Buffer.from(m[2], "base64");
      const ext = m[1] === "image/png" ? "png" : m[1] === "image/webp" ? "webp" : "jpg";
      const path = `${me.id}/${randomUUID()}.${ext}`;
      const admin = createSupabaseAdminClient();
      const { error } = await admin.storage
        .from(CARD_BUCKET)
        .upload(path, bytes, { contentType: m[1], upsert: false });
      if (!error) imagePath = path;
      else console.error("[cards/scan] 画像の保存に失敗（読み取り結果は返す）:", error);
    }
  } catch (e) {
    console.error("[cards/scan] 画像の保存に失敗（読み取り結果は返す）:", e);
  }

  // ── ここから先が「読み取ったあと」（2026-11-28 ユーザー指示「AIをガンガン使ったものにして」）
  // ⚠️ どちらも失敗してよい。読み取り結果は返せているので、画面は先に進められる。
  const card = result.card;
  const [matches, insight] = await Promise.all([
    // ① NAKAMAにいる会社かどうか
    matchMembers({
      tenantId: su.app.tenantId,
      meId: me.id,
      company: card.company,
      email: card.email,
      website: card.website,
    }).catch((e) => {
      console.error("[cards/scan] 会員の突き合わせに失敗:", e);
      return [] as CardMatch[];
    }),
    // ②③④ タグ・一緒にできそうなこと・ごあいさつ
    (async () => {
      const mine = await prisma.member.findUnique({
        where: { id: me.id },
        select: {
          name: true, categoryL1: true, categoryL2: true,
          description: true, challengeText: true, collabStyle: true,
        },
      });
      if (!mine) return null;
      return suggestFromCard({
        card: {
          name: card.name, company: card.company, jobTitle: card.jobTitle,
          department: card.department, address: card.address, website: card.website,
          businessNote: card.businessNote,
        },
        me: mine,
      });
    })().catch((e) => {
      console.error("[cards/scan] 名刺からの提案に失敗:", e);
      return null;
    }),
  ]);

  return {
    draft: card,
    imagePath,
    matches,
    insight: insight ?? undefined,
  };
}

export type SaveState = { ok?: boolean; error?: string };

/** 本人が確認した内容で1枚を保存する */
export async function saveCard(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインしてからお試しください。" };
  const me = await getOrCreateMemberForUser(su);

  const get = (k: string) => String(formData.get(k) ?? "");
  const tags = get("tags")
    .split(/[,、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, CARD_TAG_MAX);

  const imagePath = get("imagePath") || null;
  // 自分がアップロードしたパスであることを確かめる（他人のパスを差し込まれないように）
  if (imagePath && !imagePath.startsWith(`${me.id}/`)) {
    return { error: "写真を保存できませんでした。もう一度お試しください。" };
  }

  const result = await createContactCard(
    { id: me.id, tenantId: me.tenantId },
    {
      name: get("name"), nameKana: get("nameKana"), company: get("company"),
      department: get("department"), jobTitle: get("jobTitle"), email: get("email"),
      phone: get("phone"), mobile: get("mobile"), website: get("website"),
      postalCode: get("postalCode"), address: get("address"),
      metAt: get("metAt"), metOn: get("metOn"), note: get("note"), tags,
      // AIの提案と、本人が選んだ「NAKAMAのこの会員」（2026-11-28）
      ideas: formData.getAll("ideas").map(String),
      greetingDraft: get("greetingDraft"),
      linkedMemberId: get("linkedMemberId"),
    },
    imagePath,
    get("source") === "manual" ? "manual" : "scan"
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/cards");
  return { ok: true };
}

export async function removeCard(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await deleteContactCard(me.id, String(formData.get("id") ?? ""));
  revalidatePath("/cards");
}

export async function saveCardNote(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  const tags = String(formData.get("tags") ?? "")
    .split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean);
  await updateContactCardNote(me.id, String(formData.get("id") ?? ""), String(formData.get("note") ?? ""), tags);
  revalidatePath("/cards");
}
