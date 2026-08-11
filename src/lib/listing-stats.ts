// 自分が出した案件（売りたい・探している）の管理用集計。
// クラウドワークスの「登録中のお仕事」に相当する表で使う（2026-08-11 ユーザー指示）＝
// 問い合わせが来ているか、返していないか、放置していないかが一目で分かるようにする。
import { prisma } from "@/lib/db";
import { PHASE_DONE } from "@/lib/deal-constants";

/** 最終のやり取りからこの日数を過ぎ、かつ未返信でなければ「放置」とみなす。 */
export const STALE_DAYS = 14;

export type MyListingRow = {
  id: string;
  direction: string;
  title: string;
  isPublic: boolean;
  applicationDeadline: Date | null;
  updatedAt: Date;
  /** 相手から1通以上届いたやり取りの数（＝届いた問い合わせ・提案） */
  received: number;
  /** 自分がまだ返していない通数 */
  unread: number;
  /** 商談中（出会う〜成約手前） */
  talking: number;
  /** 完了（領収書発行まで済んだ取引） */
  closed: number;
  /** 最後にやり取りがあった日時 */
  lastMessageAt: Date | null;
};

/** 自分の案件を、届いた件数・未返信・進捗つきで返す（更新の新しい順）。 */
export async function loadMyListingRows(memberId: string): Promise<MyListingRow[]> {
  const offerings = await prisma.offering.findMany({
    where: { memberId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      direction: true,
      title: true,
      isPublic: true,
      applicationDeadline: true,
      updatedAt: true,
    },
  });
  if (!offerings.length) return [];

  const offeringIds = offerings.map((o) => o.id);
  const threads = await prisma.thread.findMany({
    where: {
      offeringId: { in: offeringIds },
      OR: [{ fromMemberId: memberId }, { toMemberId: memberId }],
      // 相手から1通も来ていないもの（自分が開いただけ）は「届いた」に数えない
      messages: { some: { senderMemberId: { not: memberId } } },
    },
    select: { id: true, offeringId: true, lastMessageAt: true },
  });
  const threadIds = threads.map((t) => t.id);

  const [unreadGroups, deals] = await Promise.all([
    threadIds.length
      ? prisma.message.groupBy({
          by: ["threadId"],
          where: { threadId: { in: threadIds }, senderMemberId: { not: memberId }, readAt: null },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    threadIds.length
      ? prisma.deal.findMany({
          where: { threadId: { in: threadIds } },
          select: { threadId: true, phase: true },
        })
      : Promise.resolve([]),
  ]);
  const unreadByThread = new Map(unreadGroups.map((g) => [g.threadId, g._count._all]));
  const phaseByThread = new Map(deals.map((d) => [d.threadId ?? "", d.phase]));

  const byOffering = new Map<string, { received: number; unread: number; talking: number; closed: number; last: Date | null }>();
  for (const t of threads) {
    if (!t.offeringId) continue;
    const cur = byOffering.get(t.offeringId) ?? { received: 0, unread: 0, talking: 0, closed: 0, last: null };
    cur.received += 1;
    cur.unread += unreadByThread.get(t.id) ?? 0;
    const phase = phaseByThread.get(t.id) ?? 0;
    if (phase >= PHASE_DONE) cur.closed += 1;
    else if (phase >= 1) cur.talking += 1;
    if (!cur.last || t.lastMessageAt > cur.last) cur.last = t.lastMessageAt;
    byOffering.set(t.offeringId, cur);
  }

  return offerings.map((o) => {
    const s = byOffering.get(o.id);
    return {
      ...o,
      received: s?.received ?? 0,
      unread: s?.unread ?? 0,
      talking: s?.talking ?? 0,
      closed: s?.closed ?? 0,
      lastMessageAt: s?.last ?? null,
    };
  });
}

/** 掲載の状態（公開中／下書き／募集終了）。 */
export function listingState(row: MyListingRow, now: Date): "public" | "draft" | "expired" {
  if (!row.isPublic) return "draft";
  if (row.applicationDeadline && row.applicationDeadline.getTime() < now.getTime()) return "expired";
  return "public";
}

/** 放置日数（最後のやり取りからの経過日数。やり取りが無ければ null）。 */
export function idleDays(row: MyListingRow, now: Date): number | null {
  if (!row.lastMessageAt) return null;
  return Math.floor((now.getTime() - row.lastMessageAt.getTime()) / (24 * 60 * 60 * 1000));
}
