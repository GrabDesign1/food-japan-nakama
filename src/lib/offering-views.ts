import { prisma } from "@/lib/db";

/**
 * 複数の台帳（Offering）について、直近24時間の閲覧数をまとめて集計する。
 * 一覧カードに「24時間以内に○人が閲覧」を出すための共通ヘルパー。
 * 返り値は offeringId → 件数 の Map。閲覧ゼロの ID は含まれない。
 */
export async function views24hMap(
  offeringIds: string[]
): Promise<Map<string, number>> {
  if (offeringIds.length === 0) return new Map();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const grouped = await prisma.offeringView.groupBy({
    by: ["offeringId"],
    where: { offeringId: { in: offeringIds }, createdAt: { gte: since } },
    _count: { _all: true },
  });
  return new Map(grouped.map((g) => [g.offeringId, g._count._all]));
}
