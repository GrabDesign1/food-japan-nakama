// 商談（Deal）のサーバー側ヘルパー。HANDOVER 第6章。
// 定数（PHASES 等）は deal-constants.ts に分離（クライアントから使うため）。
import { prisma } from "@/lib/db";

export { PHASES, PHASE_DESC, isStale } from "@/lib/deal-constants";

/** 2会員間の商談を取得。無ければ作成（phase 0）。 */
export async function ensureDeal(params: {
  tenantId: string;
  meId: string;
  otherId: string;
  threadId?: string | null;
}) {
  // 商談はスレッド（＝案件）単位に持つ（2026-08-11）。
  // 従来は会員ペアに1件だったため、案件が違っても進捗が1つに混ざっていた。
  // threadId が無い旧データとの互換のため、スレッド指定が無いときは従来どおりペアで探す。
  const existing = params.threadId
    ? await prisma.deal.findFirst({ where: { threadId: params.threadId } })
    : await prisma.deal.findFirst({
        where: {
          OR: [
            { ownerMemberId: params.meId, counterpartMemberId: params.otherId },
            { ownerMemberId: params.otherId, counterpartMemberId: params.meId },
          ],
        },
      });
  if (existing) return existing;
  return prisma.deal.create({
    data: {
      tenantId: params.tenantId,
      ownerMemberId: params.meId,
      counterpartMemberId: params.otherId,
      threadId: params.threadId ?? null,
    },
  });
}

export type DealWithOther = {
  deal: {
    id: string;
    phase: number;
    nextAction: string | null;
    dueDate: Date | null;
    lastActivityAt: Date;
    threadId: string | null;
  };
  other: {
    id: string;
    name: string;
    avatarUrl: string | null;
    categoryL1: string;
    description: string | null;
  } | null;
};

/** 自分が関わる商談を、相手会員情報つきで取得 */
export async function loadMemberDeals(meId: string): Promise<DealWithOther[]> {
  const deals = await prisma.deal.findMany({
    where: { OR: [{ ownerMemberId: meId }, { counterpartMemberId: meId }] },
    orderBy: { lastActivityAt: "desc" },
  });
  const otherIds = Array.from(
    new Set(deals.map((d) => (d.ownerMemberId === meId ? d.counterpartMemberId : d.ownerMemberId)))
  );
  const members = await prisma.member.findMany({
    where: { id: { in: otherIds } },
    select: { id: true, name: true, avatarUrl: true, categoryL1: true, description: true },
  });
  const map = new Map(members.map((m) => [m.id, m]));
  return deals.map((d) => ({
    deal: {
      id: d.id,
      phase: d.phase,
      nextAction: d.nextAction,
      dueDate: d.dueDate,
      lastActivityAt: d.lastActivityAt,
      threadId: d.threadId,
    },
    other: map.get(d.ownerMemberId === meId ? d.counterpartMemberId : d.ownerMemberId) ?? null,
  }));
}

/** 会話に動きがあったら最終活動日を更新 */
export async function touchDealActivity(meId: string, otherId: string) {
  await prisma.deal.updateMany({
    where: {
      OR: [
        { ownerMemberId: meId, counterpartMemberId: otherId },
        { ownerMemberId: otherId, counterpartMemberId: meId },
      ],
    },
    data: { lastActivityAt: new Date() },
  });
}
