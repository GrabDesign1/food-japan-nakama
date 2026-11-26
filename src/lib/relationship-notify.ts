// 関係が薄れてきた方を、ご本人に知らせる（2026-11-26 ユーザー指示
//   「93日で半減するとか400日以上で名刺交換が無かったことになることも皆に通知していこう」）。
//
// ⚠️⚠️ **これは催促ではなく、気づきの提供。** 文面で相手を急かさない。送るのは1関係につき1回だけ。
// ⚠️⚠️ **止め場所は1つ**（User.feedEmailOptOutAt）。通知の種類ごとに設定を増やさない
//    （増やすほど、止めたい人が止められなくなる）。
// ⚠️ 強さの計算は card-relationship.ts をそのまま使う。ここに別の式を書かない。
import { prisma } from "@/lib/db";
import { currentStrength, ALIVE_THRESHOLD, HALF_LIFE_DAYS } from "@/lib/card-relationship";

/**
 * 「そろそろご連絡を」を出す強さ。
 * 100（交換直後）から半減期ぶん（180日）放置すると 50 になる＝**半年やり取りが無い**状態。
 */
export const NOTICE_FADING_AT = 50;
/** 「このままだと切れます」を出す強さ。これを下回ると有効な関係に数えない（約420日） */
export const NOTICE_COLD_AT = ALIVE_THRESHOLD;

/** 1回の配信で送る上限（人数）。多すぎるときは翌日に回す */
export const NOTICE_MAX_MEMBERS_PER_RUN = 100;
/** 1通に並べる相手の上限。これ以上は「ほか◯名」 */
export const NOTICE_MAX_NAMES = 5;

export type NoticeTarget = {
  memberId: string;
  /** そろそろご連絡を（半年ほど接触がない） */
  fading: { relationshipId: string; otherMemberId: string; otherName: string }[];
  /** このままだと切れる（1年2か月ほど接触がない） */
  cold: { relationshipId: string; otherMemberId: string; otherName: string }[];
};

/** 日数の目安（文面に出す）。計算式は card-relationship.ts と同じものを使う */
export function daysToStrength(from: number, to: number): number {
  return Math.round(HALF_LIFE_DAYS * (Math.log(to / from) / Math.log(0.5)));
}

/**
 * 知らせる相手を集める。
 * ⚠️ **まだ知らせていないものだけ**（fadingNotifiedAt / coldNotifiedAt が空）。
 * ⚠️ 相手が退会していたら出さない（名前が出せないものを送らない）。
 */
export async function findNoticeTargets(now = new Date()): Promise<NoticeTarget[]> {
  const rows = await prisma.relationship.findMany({
    where: {
      OR: [{ fadingNotifiedAt: null }, { coldNotifiedAt: null }],
    },
    select: {
      id: true,
      memberAId: true,
      memberBId: true,
      strengthAtLastContact: true,
      lastContactAt: true,
      fadingNotifiedAt: true,
      coldNotifiedAt: true,
    },
    take: 5000,
  });
  if (rows.length === 0) return [];

  const ids = new Set<string>();
  for (const r of rows) { ids.add(r.memberAId); ids.add(r.memberBId); }
  const members = await prisma.member.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, name: true, contactName: true },
  });
  const nameOf = new Map(
    members.map((m) => [m.id, m.contactName || m.name || ""])
  );

  const byMember = new Map<string, NoticeTarget>();
  const push = (memberId: string, bucket: "fading" | "cold", relationshipId: string, otherId: string) => {
    const otherName = nameOf.get(otherId);
    if (!otherName) return; // 退会・名前なしは出さない
    const t = byMember.get(memberId) ?? { memberId, fading: [], cold: [] };
    t[bucket].push({ relationshipId, otherMemberId: otherId, otherName });
    byMember.set(memberId, t);
  };

  for (const r of rows) {
    const s = currentStrength(r.strengthAtLastContact, r.lastContactAt, now);
    // ⚠️ 強いほうの状態だけ送る。同じ関係で2通出さない
    if (s < NOTICE_COLD_AT && !r.coldNotifiedAt) {
      push(r.memberAId, "cold", r.id, r.memberBId);
      push(r.memberBId, "cold", r.id, r.memberAId);
    } else if (s < NOTICE_FADING_AT && !r.fadingNotifiedAt) {
      push(r.memberAId, "fading", r.id, r.memberBId);
      push(r.memberBId, "fading", r.id, r.memberAId);
    }
  }
  return [...byMember.values()];
}

/** 送った印をつける（同じ関係に二度送らない） */
export async function markNoticed(args: { fadingIds: string[]; coldIds: string[] }): Promise<void> {
  const now = new Date();
  if (args.fadingIds.length) {
    await prisma.relationship.updateMany({
      where: { id: { in: args.fadingIds } },
      data: { fadingNotifiedAt: now },
    });
  }
  if (args.coldIds.length) {
    // 切れかけまで来たら、手前のお知らせも済ませた扱いにする（後から追いかけて出さない）
    await prisma.relationship.updateMany({
      where: { id: { in: args.coldIds } },
      data: { coldNotifiedAt: now, fadingNotifiedAt: now },
    });
  }
}
