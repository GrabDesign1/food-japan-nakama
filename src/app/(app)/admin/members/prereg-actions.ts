"use server";

// 事務局：登壇者などを先に会員として登録する（2026-11-23）。
// ⚠️ ここからメールは一切送らない（本人の同意なく案内を送らない）。
// ⚠️ 作るときは必ず非公開。公開は別のボタン。
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { preregisterMember, publishMember, unpublishMember } from "@/lib/member-prereg";

export type PreregState = { ok?: boolean; error?: string; message?: string };

export async function addPrereg(_prev: PreregState, fd: FormData): Promise<PreregState> {
  const su = await requireAdmin();
  const result = await preregisterMember(
    { tenantId: su.app.tenantId, name: su.app.name },
    {
      name: String(fd.get("name") ?? ""),
      contactName: String(fd.get("contactName") ?? ""),
      categoryL1: String(fd.get("categoryL1") ?? ""),
      prefecture: String(fd.get("prefecture") ?? ""),
      website: String(fd.get("website") ?? ""),
      email: String(fd.get("email") ?? ""),
      note: String(fd.get("note") ?? ""),
    }
  );
  if (!result.ok) return { error: result.error };

  await writeAudit(su, "member.prereg.create", {
    targetType: "member",
    targetId: result.id,
    detail: `登壇者などを先に登録（非公開・メール未送信）: ${String(fd.get("name") ?? "")}`,
  }).catch((e) => console.error("[prereg] 監査ログに失敗:", e));

  revalidatePath("/admin/members/prereg");
  return { ok: true, message: "非公開で登録しました。メールは送っていません。" };
}

export async function publish(fd: FormData): Promise<void> {
  const su = await requireAdmin();
  const memberId = String(fd.get("memberId") ?? "");
  if (await publishMember(su.app.tenantId, memberId)) {
    await writeAudit(su, "member.prereg.publish", {
      targetType: "member", targetId: memberId,
      detail: "非公開を解除（検索・プロフィールに出るようにした）",
    }).catch((e) => console.error("[prereg] 監査ログに失敗:", e));
  }
  revalidatePath("/admin/members/prereg");
}

export async function unpublish(fd: FormData): Promise<void> {
  const su = await requireAdmin();
  const memberId = String(fd.get("memberId") ?? "");
  if (await unpublishMember(su.app.tenantId, memberId)) {
    await writeAudit(su, "member.prereg.unpublish", {
      targetType: "member", targetId: memberId,
      detail: "非公開に戻した",
    }).catch((e) => console.error("[prereg] 監査ログに失敗:", e));
  }
  revalidatePath("/admin/members/prereg");
}
