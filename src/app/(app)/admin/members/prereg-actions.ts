"use server";

// 事務局：登壇者などを先に会員として登録する（2026-11-23）。
// ⚠️ ここからメールは一切送らない（本人の同意なく案内を送らない）。
// ⚠️ 作るときは必ず非公開。公開は別のボタン。
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  preregisterMember, publishMember, unpublishMember,
  parsePreregText, importPreregistered, PREREG_IMPORT_MAX_ROWS,
} from "@/lib/member-prereg";

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

export type ImportState = {
  done?: boolean;
  added?: number;
  skipped?: number;
  failed?: number;
  results?: { line: number; name: string; status: string; message: string }[];
  error?: string;
};

/**
 * 表を貼り付けてまとめて登録する。
 * ⚠️ ここでもメールは一切送らない。
 */
export async function importPrereg(_prev: ImportState, fd: FormData): Promise<ImportState> {
  const su = await requireAdmin();
  const text = String(fd.get("text") ?? "");
  if (!text.trim()) return { error: "表を貼り付けてください。" };

  const { rows, tooMany } = parsePreregText(text);
  if (rows.length === 0) return { error: "読み取れる行がありませんでした。" };

  const results = await importPreregistered({ tenantId: su.app.tenantId, name: su.app.name }, rows);
  const added = results.filter((r) => r.status === "added").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "error").length;

  await writeAudit(su, "member.prereg.import", {
    detail: `まとめて先行登録（非公開・メール未送信）: 登録${added} / 飛ばし${skipped} / 失敗${failed}`,
  }).catch((e) => console.error("[prereg] 監査ログに失敗:", e));

  revalidatePath("/admin/members/prereg");
  return {
    done: true,
    added,
    skipped,
    failed,
    results,
    error: tooMany ? `1回に取り込めるのは${PREREG_IMPORT_MAX_ROWS}行までです。残りはもう一度貼ってください。` : undefined,
  };
}
