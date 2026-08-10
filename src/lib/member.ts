// 会員（法人）プロフィールの取得・更新・記入率・審査ロジック。
import { prisma } from "@/lib/db";
import type { Member } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth";

// 記入率の対象とする項目（埋まっているほど検索で上位に出る＝入力促進）
const RATE_FIELDS: (keyof Member)[] = [
  "name",
  "contactName",
  "categoryL1",
  "categoryL2",
  "prefecture",
  "city",
  "postalCode",
  "address",
  "description",
  "featureText",
  "equipmentText",
  "salesAreaText",
  "logisticsText",
  "foodlossText",
  "challengeText",
  "collabStyle",
  "startTiming",
];

export function calcCompletionRate(m: Member): number {
  let filled = 0;
  for (const f of RATE_FIELDS) {
    const v = m[f];
    if (typeof v === "string" && v.trim() !== "") filled++;
  }
  return Math.round((filled / RATE_FIELDS.length) * 100);
}

// 記入率からレベル（1〜5）。検索の並び順に使う。
export function levelFromRate(rate: number): number {
  return Math.min(5, Math.max(1, Math.ceil(rate / 20)));
}

/** 未入力のプロフィール項目数（ダッシュボードの「あと◯項目」表示用）。 */
export function countMissingProfileFields(m: Member): number {
  return RATE_FIELDS.filter((f) => {
    const v = m[f];
    return !(typeof v === "string" && v.trim() !== "");
  }).length;
}

/** ログインユーザーの会員を返す。無ければ下書きを作成して users に紐付ける。 */
export async function getOrCreateMemberForUser(su: SessionUser): Promise<Member> {
  let memberId = su.app.memberId;
  if (!memberId) {
    // getSessionUser は cache() でリクエスト内キャッシュされるため、アクション内で member を
    // 作成した直後の再レンダーでは su.app.memberId が古い（null のまま）ことがある。
    // 二重作成を防ぐため、未設定のときだけ users 行を読み直す。
    const fresh = await prisma.user.findUnique({
      where: { id: su.app.id },
      select: { memberId: true },
    });
    memberId = fresh?.memberId ?? null;
  }
  if (memberId) {
    const existing = await prisma.member.findUnique({
      where: { id: memberId },
    });
    if (existing) return existing;
  }

  const member = await prisma.member.create({
    data: {
      tenantId: su.app.tenantId,
      name: "",
      categoryL1: "",
      status: "DRAFT",
    },
  });
  await prisma.user.update({
    where: { id: su.app.id },
    data: { memberId: member.id },
  });
  return member;
}

export type ProfileInput = {
  name: string;
  contactName: string;
  contactKana: string;
  categoryL1: string;
  categoryL2: string;
  prefecture: string;
  city: string;
  postalCode: string;
  address: string;
  website: string;
  founded: string;
  size: string;
  description: string;
  featureText: string;
  hasLicense: boolean;
  licenseName: string;
  productItems: string;
  productVolume: string;
  equipmentText: string;
  salesAreaText: string;
  logisticsText: string;
  foodlossText: string;
  challengeText: string;
  collabStyle: string;
  startTiming: string;
};

export async function updateMemberProfile(
  memberId: string,
  input: ProfileInput
): Promise<Member> {
  // 記入率は入力値から直接計算し、更新は1回にまとめる（往復を減らす）
  const rate = calcCompletionRate(input as unknown as Member);
  return prisma.member.update({
    where: { id: memberId },
    data: { ...input, completionRate: rate, level: levelFromRate(rate) },
  });
}

/** 会員が審査を申請（下書き/差戻し → 申請中）。 */
export async function submitMemberForReview(memberId: string): Promise<Member> {
  const m = await prisma.member.findUnique({ where: { id: memberId } });
  if (!m) throw new Error("会員が見つかりません");
  if (m.status !== "DRAFT" && m.status !== "REJECTED") return m;
  return prisma.member.update({
    where: { id: memberId },
    data: { status: "PENDING" },
  });
}

export type ReviewDecision = "approve" | "reject" | "require_payment";

/** 事務局の審査。承認／非承認／課金してもらう の3択。tenantId で自テナントの会員に限定する。 */
export async function setMemberReview(
  memberId: string,
  decision: ReviewDecision,
  reviewerUserId: string,
  tenantId: string
): Promise<Member> {
  const target = await prisma.member.findFirst({ where: { id: memberId, tenantId } });
  if (!target) throw new Error("会員が見つかりません");

  const data =
    decision === "approve"
      ? {
          status: "APPROVED" as const,
          approvedAt: new Date(),
          approvedBy: reviewerUserId,
        }
      : decision === "require_payment"
        ? {
            status: "AWAITING_PAYMENT" as const,
            paymentStatus: "UNPAID" as const,
            approvedAt: new Date(),
            approvedBy: reviewerUserId,
          }
        : { status: "REJECTED" as const };

  return prisma.member.update({ where: { id: memberId }, data });
}

/** 事務局一覧用：下書き以外の会員を、担当者（登録ユーザー）付きで取得。 */
export async function listReviewMembers(tenantId: string) {
  return prisma.member.findMany({
    where: { tenantId, status: { not: "DRAFT" } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      users: {
        select: { id: true, name: true, email: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/** 通知用：会員（法人）に紐づく利用ユーザーのメールアドレス一覧（停止中は除く）。 */
export async function getMemberUserEmails(memberId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { memberId, status: { not: "SUSPENDED" } },
    select: { email: true },
  });
  return Array.from(new Set(users.map((u) => u.email).filter(Boolean)));
}
