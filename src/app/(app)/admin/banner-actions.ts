"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type BannerState = { ok?: boolean; error?: string; message?: string };

const BUCKET = "member-images";

// リンク先を整える（http/https か、サイト内パス「/」のみ許可）
function normalizeLink(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.startsWith("/")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`; // ドメインだけ入力された場合の補助
}

export async function createBanner(
  _prev: BannerState,
  formData: FormData
): Promise<BannerState> {
  const su = await requireAdmin();

  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const linkUrl = normalizeLink(String(formData.get("linkUrl") ?? ""));

  if (!(file instanceof File) || file.size === 0) {
    return { error: "バナー画像を選んでください。" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "画像ファイルのみアップロードできます。" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "画像は5MBまでにしてください。" };
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `banners/${su.app.tenantId}/${crypto.randomUUID()}.${ext}`;

  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: `アップロードに失敗しました：${upErr.message}` };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);

  // 末尾に並べる
  const last = await prisma.banner.findFirst({
    where: { tenantId: su.app.tenantId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.banner.create({
    data: {
      tenantId: su.app.tenantId,
      title: title || null,
      imageUrl: data.publicUrl,
      linkUrl,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: "バナーを追加しました。" };
}

export async function deleteBanner(id: string): Promise<void> {
  const su = await requireAdmin();
  const banner = await prisma.banner.findFirst({
    where: { id, tenantId: su.app.tenantId },
    select: { id: true, imageUrl: true },
  });
  if (!banner) return;

  // ストレージの実ファイルも削除
  const marker = `/${BUCKET}/`;
  const idx = banner.imageUrl.indexOf(marker);
  if (idx >= 0) {
    const admin = createSupabaseAdminClient();
    await admin.storage.from(BUCKET).remove([banner.imageUrl.slice(idx + marker.length)]).catch(() => {});
  }

  await prisma.banner.deleteMany({ where: { id, tenantId: su.app.tenantId } });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

/** 表示/非表示を切り替える。 */
export async function toggleBanner(id: string, active: boolean): Promise<void> {
  const su = await requireAdmin();
  await prisma.banner.updateMany({
    where: { id, tenantId: su.app.tenantId },
    data: { active },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
