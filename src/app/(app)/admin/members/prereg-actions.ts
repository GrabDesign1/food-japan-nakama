"use server";

// 事務局：登壇者などを先に会員として登録する（2026-11-23）。
// ⚠️ 登録のときはメールを送らない（本人の同意なく案内を送らない）。
// ⚠️ 作るときは必ず非公開。公開は別のボタン。
//
// 【招待メール】2026-11-23 ユーザー指示「メールを送付する」——
//   預かった情報を使ってよいか、本人に1回だけ聞く。
//   ⚠️⚠️ **送るのは1回だけ。催促しない。**（下の sendInvites は、送った人を必ず外す）
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  preregisterMember, publishMember, unpublishMember,
  parsePreregText, importPreregistered, PREREG_IMPORT_MAX_ROWS,
} from "@/lib/member-prereg";
import { listInvitable, issueInviteToken, markInviteSent, INVITE_BATCH } from "@/lib/member-invite";
import { sendMemberInvite } from "@/lib/email";
import { syncFromOnegaizar } from "@/lib/onegaizar-sync";

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

/**
 * 「このサービス、使いますか？」を、まだ聞いていない方に送る（2026-11-23）。
 * ⚠️⚠️ 1回に送るのは INVITE_BATCH 件まで。全部を一度に送らない——
 *    文面のまちがいに気づいたときに、途中で止められるようにしておく。
 * ⚠️ 送った印は、送信を試みた時点で付ける。付けないと二重に届く恐れがあり、
 *    「1回だけ」の約束を破るほうが、届かないことより重い。
 */
export async function sendInvites(): Promise<void> {
  const su = await requireAdmin();
  const targets = (await listInvitable(su.app.tenantId)).slice(0, INVITE_BATCH);

  let done = 0;
  for (const t of targets) {
    const token = await issueInviteToken(su.app.tenantId, t.id);
    if (!token) continue;
    await sendMemberInvite({
      to: t.email,
      name: t.name,
      contactName: t.contactName,
      token,
      listed: t.listed,
    });
    await markInviteSent(t.id);
    done++;
  }

  await writeAudit(su, "member.invite.send", {
    targetType: "member",
    targetId: "-",
    detail: `「使いますか？」のご案内を${done}件送信（1人1回かぎり）`,
  }).catch((e) => console.error("[prereg] 監査ログに失敗:", e));

  revalidatePath("/admin/members/prereg");
}

/**
 * Onegaizar から登壇者・参加者を取り込む（2026-11-25）。
 * ⚠️⚠️ 取り込んでも誰にも見えません（必ず非公開）。メールも送りません。
 *    本人に聞くのは、上の「◯名に送る」を押したときだけ。
 */
export async function syncOnegaizar(_prev: PreregState, _fd: FormData): Promise<PreregState> {
  const su = await requireAdmin();
  const r = await syncFromOnegaizar(su.app.tenantId, su.app.name);
  if (!r.ok) return { error: r.error ?? "取り込めませんでした。" };

  await writeAudit(su, "member.sync.onegaizar", {
    targetType: "member",
    targetId: "-",
    detail: `イベントから取り込み：新規${r.created}／更新${r.updated}／既存会員に追記${r.linked}／メール無し${r.skippedNoEmail}`,
  }).catch((e) => console.error("[prereg] 監査ログに失敗:", e));

  revalidatePath("/admin/members/prereg");
  return {
    ok: true,
    message:
      `取り込みました（ご登壇${r.speaker}／ご参加${r.attendee}）。` +
      `新しく預かった ${r.created}名・すでに預かっていた ${r.updated}名・` +
      `すでに会員の方 ${r.linked}名。` +
      (r.skippedNoEmail > 0 ? `メールが無くて取り込めなかった方が ${r.skippedNoEmail}名います。` : "") +
      (r.remaining > 0
        ? `⚠️ あと ${r.remaining}名が残っています。もう一度押してください（重複はしません）。`
        : "") +
      "まだ誰にも見えていません。",
  };
}
