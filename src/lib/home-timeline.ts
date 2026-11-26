// ホームの「まとめた流れ」（2026-11-26 ユーザー指示
//   「ホームは、自分の登壇時に登録した登録情報がでるようにして。
//     その下には、他人のタイムラインや　売りたい、探してる　などをでるように　まとめて」）。
//
// ⚠️⚠️ **見える範囲を広げない。** 投稿は feed.ts の判定（カードを交換した相手＋自分）のまま。
//    ここは「すでに見えるもの」を1本に混ぜるだけ。混ぜるときに where を足さない。
// ⚠️ 案件（売りたい・探している）は、もともと会員なら誰でも見られるもの（/search と同じ条件）。
//    自分の案件は出さない（自分の案件は「自分が出した案件」の欄にある）。
import { prisma } from "@/lib/db";
import { loadFeedPage, type FeedPage, type FeedPost } from "@/lib/feed";

/** 流れに出す案件。OfferingCard が必要とする欄をそろえる */
const OFFERING_SELECT = {
  id: true,
  direction: true,
  category: true,
  title: true,
  area: true,
  imageUrls: true,
  description: true,
  amountValue: true,
  amountUnit: true,
  amountPeriod: true,
  amountText: true,
  priceType: true,
  priceAmount: true,
  priceUnit: true,
  priceTaxType: true,
  minOrderText: true,
  itemCondition: true,
  supplyFrequency: true,
  applicationDeadline: true,
  tagline: true,
  seekingType: true,
  createdAt: true,
  member: { select: { name: true, companyLogoUrl: true } },
} as const;

export type HomeOffering = Awaited<
  ReturnType<typeof prisma.offering.findMany<{ select: typeof OFFERING_SELECT }>>
>[number];

export type HomeItem =
  | { kind: "post"; at: Date; post: FeedPost }
  | { kind: "offering"; at: Date; offering: HomeOffering };

export type HomeTimeline = {
  items: HomeItem[];
  /** PostCard に渡すコメント・投稿者（feed と同じ形） */
  feed: FeedPage;
  /** 閲覧数の取得に使う */
  offeringIds: string[];
  /** 交換した相手がまだ居ないか（空のときの案内を出し分ける） */
  hasConnections: boolean;
  /** まだ続きがあるか（「もっと読む」を出すかどうか） */
  hasMore: boolean;
};

/** ホームに出す件数。多すぎると重いので、続きは各ページで見てもらう */
export const HOME_TIMELINE_TAKE = 12;

export async function loadHomeTimeline(args: {
  memberId?: string;
  tenantId?: string;
  take?: number;
}): Promise<HomeTimeline> {
  const take = args.take ?? HOME_TIMELINE_TAKE;
  const empty: FeedPage = { posts: [], comments: {}, authors: [], hasMore: false };

  const [feed, offerings] = await Promise.all([
    args.memberId ? loadFeedPage(args.memberId, { take }) : Promise.resolve(empty),
    args.tenantId
      ? prisma.offering.findMany({
          where: {
            isPublic: true,
            visibility: "public",
            title: { not: "" },
            member: { tenantId: args.tenantId, status: "APPROVED", listed: true },
            ...(args.memberId ? { memberId: { not: args.memberId } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take,
          select: OFFERING_SELECT,
        })
      : Promise.resolve([]),
  ]);

  const items: HomeItem[] = [
    ...feed.posts.map((p) => ({ kind: "post" as const, at: p.createdAt, post: p })),
    ...offerings.map((o) => ({ kind: "offering" as const, at: o.createdAt, offering: o })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, take);

  return {
    items,
    feed,
    offeringIds: items.flatMap((i) => (i.kind === "offering" ? [i.offering.id] : [])),
    hasConnections: feed.posts.some((p) => p.authorMemberId !== args.memberId),
    // ⚠️ 混ぜて take 件に切っているので、どちらかに続きがあれば「もっと読む」を出す
    hasMore: feed.hasMore || offerings.length >= take,
  };
}
