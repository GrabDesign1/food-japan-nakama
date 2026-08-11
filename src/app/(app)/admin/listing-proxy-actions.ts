"use server";

// 掲載代行（2026-08-11 追加）。
// 買い手（調達側）は自分で13項目のフォームを埋めるのが負担で、案件が集まらない。
// 事務局が電話で15分ヒアリングし、代わりに下書きを作って本人確認のうえ公開する運用のための機能。
// なりすまし投稿に相当する強い操作のため、上位管理者のみ・全操作を監査ログに残す。
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { CATEGORY_KEYS } from "@/lib/offering-taxonomy";
import { PROFILE_SHORT_MAX, trimTo } from "@/lib/security";

export type ProxyListingState = { error?: string };

/**
 * 会員に代わって案件の下書きを作る。作成後はその案件の編集画面へ遷移する
 * （編集・公開も上位管理者に許可済み。src/app/(app)/ledger/actions.ts の ownOfferingOr404 を参照）。
 */
export async function createOfferingForMember(
  _prev: ProxyListingState,
  formData: FormData
): Promise<ProxyListingState> {
  const su = await requireSuperAdmin();

  const memberId = String(formData.get("memberId") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const title = trimTo(formData.get("title"), PROFILE_SHORT_MAX);

  if (!memberId) return { error: "会員を選んでください。" };
  if (direction !== "GIVE" && direction !== "WANT") return { error: "区分を選んでください。" };
  if (!CATEGORY_KEYS.includes(category)) return { error: "分類を選んでください。" };
  if (!title) return { error: "案件名を入力してください。" };

  // 同一テナントの承認済み会員のみ（他テナント・停止中の会員名義では作らせない）
  const member = await prisma.member.findFirst({
    where: { id: memberId, tenantId: su.app.tenantId, status: { in: ["APPROVED", "PENDING", "DRAFT"] } },
    select: { id: true, name: true },
  });
  if (!member) return { error: "対象の会員が見つかりません。" };

  // 連打・二重作成ガード（同じ会員・同じ案件名を直近1分以内に作っていたらそれを開く）
  const dup = await prisma.offering.findFirst({
    where: { memberId: member.id, direction, title, createdAt: { gte: new Date(Date.now() - 60_000) } },
    select: { id: true },
  });
  if (dup) redirect(`/ledger/${dup.id}/edit?created=1`);

  const created = await prisma.offering.create({
    data: { memberId: member.id, direction, category, title, isPublic: false },
  });

  await writeAudit(su, "listing.proxy_create", {
    targetType: "offering",
    targetId: created.id,
    detail: `代理作成 member=${member.id}(${member.name}) direction=${direction} title=${title}`,
  });

  redirect(`/ledger/${created.id}/edit?created=1&proxy=1`);
}
