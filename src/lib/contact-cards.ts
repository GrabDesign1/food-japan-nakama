import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CARD_FIELD_MAX, CARD_NOTE_MAX, CARD_TAG_MAX } from "@/lib/contact-card-core";

/**
 * 取り込んだ名刺（2026-11-21）。
 *
 * ⚠️⚠️ **これは他人の個人情報である。** 持ち主（ownerMemberId）以外は、同じテナントの
 *    会員でも読めない。すべての読み書きで ownerMemberId を必ず条件に入れること。
 *    「id で引いてから持ち主を確かめる」ではなく、**where に owner を入れて引く**。
 *    そうすれば確認を書き忘れても他人の行に当たらない。
 * ⚠️ 画像は非公開バケット card-images。削除したら画像も必ず消す（孤児を残さない）。
 */

export const CARD_BUCKET = "card-images";

/** 文字列項目を安全な長さに切る */
function clip(v: unknown, max = CARD_FIELD_MAX): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
}

export type SaveContactCardInput = Record<string, unknown> & {
  tags?: string[];
};

/** 1枚を保存する。name が空なら断る（一覧で探せなくなるため） */
export async function createContactCard(
  owner: { id: string; tenantId: string },
  input: SaveContactCardInput,
  imagePath: string | null,
  source: "scan" | "manual"
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = clip(input.name);
  if (!name) return { ok: false, error: "お名前を入れてください。" };

  const tags = (Array.isArray(input.tags) ? input.tags : [])
    .map((t) => String(t).trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, CARD_TAG_MAX);

  const metOnRaw = typeof input.metOn === "string" ? input.metOn.trim() : "";
  const metOn = metOnRaw ? new Date(metOnRaw) : null;

  const row = await prisma.contactCard.create({
    data: {
      tenantId: owner.tenantId,
      ownerMemberId: owner.id,
      name,
      nameKana: clip(input.nameKana),
      company: clip(input.company),
      department: clip(input.department),
      jobTitle: clip(input.jobTitle),
      email: clip(input.email),
      phone: clip(input.phone),
      mobile: clip(input.mobile),
      website: clip(input.website),
      postalCode: clip(input.postalCode),
      address: clip(input.address),
      imagePath,
      metAt: clip(input.metAt, 120),
      metOn: metOn && !Number.isNaN(metOn.getTime()) ? metOn : null,
      note: clip(input.note, CARD_NOTE_MAX),
      tags,
      source,
    },
    select: { id: true },
  });
  return { ok: true, id: row.id };
}

export type ContactCardRow = {
  id: string;
  name: string;
  nameKana: string | null;
  company: string | null;
  department: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  website: string | null;
  postalCode: string | null;
  address: string | null;
  hasImage: boolean;
  metAt: string | null;
  metOn: Date | null;
  note: string | null;
  tags: string[];
  linkedMemberId: string | null;
  createdAt: Date;
};

/** 自分が取り込んだ名刺の一覧（新しい順）。**必ず owner で絞る** */
export async function listMyContactCards(ownerMemberId: string): Promise<ContactCardRow[]> {
  const rows = await prisma.contactCard.findMany({
    where: { ownerMemberId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return rows.map((r) => ({
    id: r.id, name: r.name, nameKana: r.nameKana, company: r.company,
    department: r.department, jobTitle: r.jobTitle, email: r.email,
    phone: r.phone, mobile: r.mobile, website: r.website,
    postalCode: r.postalCode, address: r.address,
    hasImage: !!r.imagePath,
    metAt: r.metAt, metOn: r.metOn, note: r.note, tags: r.tags,
    linkedMemberId: r.linkedMemberId, createdAt: r.createdAt,
  }));
}

/** 1枚を消す。画像も消す。**owner を where に入れる** */
export async function deleteContactCard(ownerMemberId: string, id: string): Promise<boolean> {
  const row = await prisma.contactCard.findFirst({
    where: { id, ownerMemberId },
    select: { id: true, imagePath: true },
  });
  if (!row) return false;

  if (row.imagePath) {
    try {
      const admin = createSupabaseAdminClient();
      await admin.storage.from(CARD_BUCKET).remove([row.imagePath]);
    } catch (e) {
      // 画像が消せなくても行は消す（持ち主の「消したい」を優先する）。孤児は別途掃除する
      console.error("[contact-cards] 画像の削除に失敗（行は削除する）:", e);
    }
  }
  await prisma.contactCard.delete({ where: { id: row.id } });
  return true;
}

/** メモとタグだけを書き換える */
export async function updateContactCardNote(
  ownerMemberId: string,
  id: string,
  note: string,
  tags: string[]
): Promise<boolean> {
  const row = await prisma.contactCard.findFirst({ where: { id, ownerMemberId }, select: { id: true } });
  if (!row) return false;
  await prisma.contactCard.update({
    where: { id: row.id },
    data: {
      note: note.trim().slice(0, CARD_NOTE_MAX) || null,
      tags: tags.map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, CARD_TAG_MAX),
    },
  });
  return true;
}

/** 画像の保存パスを返す。**owner を where に入れる**（配信口から呼ぶ） */
export async function imagePathForOwner(ownerMemberId: string, id: string): Promise<string | null> {
  const row = await prisma.contactCard.findFirst({
    where: { id, ownerMemberId },
    select: { imagePath: true },
  });
  return row?.imagePath ?? null;
}
