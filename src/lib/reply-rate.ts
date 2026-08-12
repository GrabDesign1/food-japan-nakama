// 掲載者の返信率（2026-08-12・開封課金の透明化）。
//
// 「売りたい」に届いた問い合わせは、売り手が1クレジットを払って開く。
// 買い手からは**払ってまで読む相手なのか**が分からないので、
// 「届いたやり取りのうち、返信したものの割合」を掲載者ごとに出す。
//
// 数え方（誤解を生まないように狭くとる）:
//   母数 = 相手から先にメッセージが届いたやり取り
//   分子 = そのうち、自分が1通以上返したもの
// 母数が少ないと 0% / 100% が極端に出るため、`MIN_REPLY_SAMPLES` 未満は表示しない。
import { prisma } from "@/lib/db";

/** これ未満の件数では返信率を出さない（1件で0%と出すと実態を表さないため）。 */
export const MIN_REPLY_SAMPLES = 3;

export type ReplyRate = {
  /** 届いたやり取りの数 */
  received: number;
  /** そのうち返信したもの */
  replied: number;
  /** 0〜100（四捨五入） */
  percent: number;
};

/**
 * 会員ごとの返信率をまとめて求める。
 * 表示できる（母数が足りる）ものだけを返すので、呼び出し側は「あれば出す」でよい。
 */
export async function loadReplyRates(memberIds: string[]): Promise<Map<string, ReplyRate>> {
  const ids = Array.from(new Set(memberIds.filter(Boolean)));
  const out = new Map<string, ReplyRate>();
  if (!ids.length) return out;

  const threads = await prisma.thread.findMany({
    where: { OR: [{ fromMemberId: { in: ids } }, { toMemberId: { in: ids } }] },
    select: { id: true, fromMemberId: true, toMemberId: true },
  });
  if (!threads.length) return out;

  const senders = await prisma.message.groupBy({
    by: ["threadId", "senderMemberId"],
    where: { threadId: { in: threads.map((t) => t.id) } },
    _min: { createdAt: true },
  });
  // スレッドごとに「誰がいつ最初に送ったか」を集める
  const byThread = new Map<string, { senderId: string; at: Date }[]>();
  for (const s of senders) {
    if (!s._min.createdAt) continue;
    const list = byThread.get(s.threadId) ?? [];
    list.push({ senderId: s.senderMemberId, at: s._min.createdAt });
    byThread.set(s.threadId, list);
  }

  const tally = new Map<string, { received: number; replied: number }>();
  for (const t of threads) {
    const list = byThread.get(t.id);
    if (!list || !list.length) continue;
    const starter = list.reduce((a, b) => (a.at.getTime() <= b.at.getTime() ? a : b)).senderId;
    for (const memberId of [t.fromMemberId, t.toMemberId]) {
      if (!ids.includes(memberId)) continue;
      // 自分から始めたやり取りは「届いたもの」ではない
      if (starter === memberId) continue;
      const cur = tally.get(memberId) ?? { received: 0, replied: 0 };
      cur.received++;
      if (list.some((l) => l.senderId === memberId)) cur.replied++;
      tally.set(memberId, cur);
    }
  }

  for (const [memberId, v] of tally) {
    if (v.received < MIN_REPLY_SAMPLES) continue;
    out.set(memberId, {
      received: v.received,
      replied: v.replied,
      percent: Math.round((v.replied / v.received) * 100),
    });
  }
  return out;
}
