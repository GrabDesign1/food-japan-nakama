// FOOD JAPAN SUMMIT に関わった方の一覧（2026-11-25 ユーザー指示「参加した人のページをつくりたい」）。
//
// ⚠️⚠️ **出るのは、本人が「はい」と言った方だけ。**
//    Onegaizar から預かっただけの方（listed:false）は、ここに出ない。
//    ⚠️ 預かる → 本人に聞く → はい → ここに出る、の順。飛ばさない。
// ⚠️ 相手を数字で見せない決まりは守る（投稿数・活動量は出さない）。
import { prisma } from "@/lib/db";

export type SummitPerson = {
  id: string;
  /** 事業者名 */
  name: string;
  contactName: string | null;
  contactRole: string | null;
  contactPhotoUrl: string | null;
  avatarUrl: string | null;
  prefecture: string | null;
  categoryL1: string;
  summitRole: string | null;
  summitEvents: string[];
};

export type SummitPage = {
  people: SummitPerson[];
  /** 開催名の一覧（絞り込み用。出てきた順ではなく名前順） */
  events: string[];
  speakers: number;
  attendees: number;
};

const MAX = 600;

export async function loadSummitPeople(
  tenantId: string,
  filterEvent?: string
): Promise<SummitPage> {
  const rows = await prisma.member.findMany({
    where: {
      tenantId,
      status: "APPROVED",
      // ⚠️⚠️ listed を外さない。預かっただけの方を出さないための砦
      listed: true,
      summitRole: { not: null },
      ...(filterEvent ? { summitEvents: { has: filterEvent } } : {}),
    },
    select: {
      id: true, name: true, contactName: true, contactRole: true,
      contactPhotoUrl: true, avatarUrl: true, prefecture: true,
      categoryL1: true, summitRole: true, summitEvents: true,
    },
    // ご登壇が先、そのあと五十音（ふりがな）
    orderBy: [{ summitRole: "asc" }, { contactKana: "asc" }, { name: "asc" }],
    take: MAX,
  });

  // 絞り込みの選択肢は、絞り込む前の全体から作る（選ぶと選択肢が消えるのを防ぐ）
  const all = filterEvent
    ? await prisma.member.findMany({
        where: { tenantId, status: "APPROVED", listed: true, summitRole: { not: null } },
        select: { summitEvents: true },
        take: MAX,
      })
    : rows.map((r) => ({ summitEvents: r.summitEvents }));

  const eventSet = new Set<string>();
  for (const r of all) for (const e of r.summitEvents) eventSet.add(e);

  return {
    people: rows,
    events: [...eventSet].sort(),
    speakers: rows.filter((r) => r.summitRole === "speaker").length,
    attendees: rows.filter((r) => r.summitRole === "attendee").length,
  };
}
