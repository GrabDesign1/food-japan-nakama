/**
 * 【取引実績と評価】2026-11-28。
 *
 * 狙い＝**手数料の前に「NAKAMAに記録する理由」を作る**（ユーザー決定 2026-11-28・B案）。
 * メルカリ／クラウドワークスが強いのは手数料ではなく、**評価が貯まる場所だから逃げられない**こと。
 *
 * ⚠️⚠️ **出すのは確かめられる事実だけ。**
 *    NAKAMAは代金を預かっていないので、**入金は売り手の自己申告しか見えない**。
 *    「入金が遅い」を片側の申告で公開すると、確かめようのないまま相手の信用を落とす。
 *    だから入金（PHASE_PAID）は実績に使わない。
 *    ⚠️ 使うのは「買い手が受け取りを押した」＝ NAKAMA が自分で記録した事実だけ。
 *
 * ⚠️⚠️ **金額と相手の会社名は出さない。**
 *    金額は当事者の秘密。相手の名前は本人の同意が要る（2026-11-26 ユーザー指示）。
 *
 * ⚠️⚠️ **0件の会社では、実績そのものを出さない。**
 *    いま会員211名に対して取引の記録はほぼ無い。「実績なし」と書くと**全員が悪く見える**。
 *    持っている会社にだけ付く印にする（罰ではなく得にする）。
 */
import { prisma } from "@/lib/db";

/** 完了率を出し始める件数。これ未満は母数が小さすぎて、1件の事故で率が壊れる。 */
export const RATE_MIN_DEALS = 3;

/** 片方しか評価していなくても公開に切り替わるまでの日数（メルカリ・クラウドワークスと同じ考え方）。 */
export const REVIEW_REVEAL_DAYS = 14;

export type TrackRecord = {
  /** 条件に合意した取引の数 */
  closed: number;
  /** そのうち、買い手が「受け取りました」を押した数 */
  delivered: number;
  /** delivered / closed。母数が RATE_MIN_DEALS 未満のときは null（出さない） */
  deliveredRate: number | null;
  /** 初めて合意した日 */
  firstAt: Date | null;
  /** また取引したい、と答えた数 ／ 公開済みの評価の数 */
  again: { yes: number; total: number };
  /** 一言（公開済みのものだけ・新しい順） */
  voices: { comment: string; at: Date }[];
};

export const EMPTY_TRACK_RECORD: TrackRecord = {
  closed: 0,
  delivered: 0,
  deliveredRate: null,
  firstAt: null,
  again: { yes: 0, total: 0 },
  voices: [],
};

/** 実績として見せるものが何もないか（何も無いときは画面ごと出さない） */
export function isEmptyRecord(r: TrackRecord): boolean {
  return r.closed === 0 && r.again.total === 0;
}

/** 公開してよい評価か。両者が出した（published_at あり）か、14日たったもの。 */
function isRevealed(r: { publishedAt: Date | null; createdAt: Date }): boolean {
  if (r.publishedAt) return true;
  return Date.now() - r.createdAt.getTime() > REVIEW_REVEAL_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * ある会員の取引実績をまとめる。
 * ⚠️ 新しい表は作っていない（評価を除く）。合意・発送・受け取りの記録を数えているだけ。
 */
export async function getTrackRecord(memberId: string): Promise<TrackRecord> {
  // この会員が当事者になっているやり取り
  const threads = await prisma.thread.findMany({
    where: { OR: [{ fromMemberId: memberId }, { toMemberId: memberId }] },
    select: { id: true },
  });
  const threadIds = threads.map((t) => t.id);

  const [offers, reviews] = await Promise.all([
    threadIds.length
      ? prisma.contractOffer.findMany({
          // ⚠️ accepted＝両者が条件に合意したもの。提示しただけ（proposed）は数えない。
          where: { threadId: { in: threadIds }, status: "accepted" },
          select: { receivedAt: true, respondedAt: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.dealReview.findMany({
      where: { targetMemberId: memberId },
      orderBy: { createdAt: "desc" },
      select: { wouldWorkAgain: true, comment: true, createdAt: true, publishedAt: true },
    }),
  ]);

  const closed = offers.length;
  const delivered = offers.filter((o) => o.receivedAt !== null).length;
  const firstAt = offers.reduce<Date | null>((min, o) => {
    const d = o.respondedAt ?? o.createdAt;
    return min === null || d < min ? d : min;
  }, null);

  const shown = reviews.filter(isRevealed);

  return {
    closed,
    delivered,
    // ⚠️ 母数が小さいうちは率を出さない。3件で1件こければ67%と出てしまう。
    deliveredRate: closed >= RATE_MIN_DEALS ? delivered / closed : null,
    firstAt,
    again: { yes: shown.filter((r) => r.wouldWorkAgain).length, total: shown.length },
    voices: shown
      .filter((r) => r.comment && r.comment.trim().length > 0)
      .slice(0, 3)
      .map((r) => ({ comment: r.comment as string, at: r.createdAt })),
  };
}

/** 「2026年3月から」のような、初回からの言い方。 */
export function sinceLabel(d: Date | null): string | null {
  if (!d) return null;
  return `${d.getFullYear()}年${d.getMonth() + 1}月から`;
}

/** 一覧に出す1行。⚠️ 記録が無ければ null（何も出さない）。 */
export function shortLabel(r: TrackRecord): string | null {
  if (isEmptyRecord(r)) return null;
  const parts: string[] = [];
  if (r.closed > 0) parts.push(`取引 ${r.closed}件`);
  if (r.again.total > 0) parts.push(`また取引したい ${r.again.yes}/${r.again.total}`);
  return parts.join(" ・ ");
}

/**
 * 複数の会員ぶんをまとめて数える（提案一覧用）。
 * ⚠️ 1人ずつ `getTrackRecord` を呼ぶと、提案の数だけ問い合わせが増える（N+1）。
 */
export async function getTrackRecords(memberIds: string[]): Promise<Map<string, TrackRecord>> {
  const out = new Map<string, TrackRecord>();
  const ids = Array.from(new Set(memberIds.filter(Boolean)));
  if (ids.length === 0) return out;
  for (const id of ids) out.set(id, { ...EMPTY_TRACK_RECORD, again: { yes: 0, total: 0 }, voices: [] });

  const threads = await prisma.thread.findMany({
    where: { OR: [{ fromMemberId: { in: ids } }, { toMemberId: { in: ids } }] },
    select: { id: true, fromMemberId: true, toMemberId: true },
  });
  if (threads.length === 0) return out;

  // やり取り → そこに関わる「対象の会員」（両側が対象のこともある）
  const ownersByThread = new Map<string, string[]>();
  for (const t of threads) {
    const owners = [t.fromMemberId, t.toMemberId].filter((m) => out.has(m));
    if (owners.length) ownersByThread.set(t.id, owners);
  }

  const [offers, reviews] = await Promise.all([
    prisma.contractOffer.findMany({
      where: { threadId: { in: [...ownersByThread.keys()] }, status: "accepted" },
      select: { threadId: true, receivedAt: true, respondedAt: true, createdAt: true },
    }),
    prisma.dealReview.findMany({
      where: { targetMemberId: { in: ids } },
      select: { targetMemberId: true, wouldWorkAgain: true, createdAt: true, publishedAt: true },
    }),
  ]);

  for (const o of offers) {
    for (const owner of ownersByThread.get(o.threadId) ?? []) {
      const r = out.get(owner)!;
      r.closed += 1;
      if (o.receivedAt) r.delivered += 1;
      const d = o.respondedAt ?? o.createdAt;
      if (r.firstAt === null || d < r.firstAt) r.firstAt = d;
    }
  }
  for (const v of reviews) {
    if (!isRevealed(v)) continue;
    const r = out.get(v.targetMemberId);
    if (!r) continue;
    r.again.total += 1;
    if (v.wouldWorkAgain) r.again.yes += 1;
  }
  for (const r of out.values()) {
    r.deliveredRate = r.closed >= RATE_MIN_DEALS ? r.delivered / r.closed : null;
  }
  return out;
}

export type PastCounterpart = { id: string; name: string; logoUrl: string | null; lastAt: Date };

/**
 * これまでに「条件に合意した」相手（新しい順）。
 * ⚠️ 狙いはリピート。クラウドワークスの「この人にもう一度依頼する」にあたる導線で、
 *    新規を探すより、一度うまくいった相手にもう一度声をかけるほうが決まりやすい。
 * ⚠️ 見せるのは**自分の取引相手だけ**（他人の取引相手は出さない）。
 */
export async function getPastCounterparts(
  memberId: string,
  limit = 4
): Promise<PastCounterpart[]> {
  const threads = await prisma.thread.findMany({
    where: { OR: [{ fromMemberId: memberId }, { toMemberId: memberId }] },
    select: { id: true, fromMemberId: true, toMemberId: true },
  });
  if (threads.length === 0) return [];
  const otherByThread = new Map(
    threads.map((t) => [t.id, t.fromMemberId === memberId ? t.toMemberId : t.fromMemberId])
  );

  const offers = await prisma.contractOffer.findMany({
    where: { threadId: { in: [...otherByThread.keys()] }, status: "accepted" },
    orderBy: { createdAt: "desc" },
    select: { threadId: true, respondedAt: true, createdAt: true },
  });

  // 同じ相手は1回だけ（いちばん新しい取引の日を持たせる）
  const lastByMember = new Map<string, Date>();
  for (const o of offers) {
    const other = otherByThread.get(o.threadId);
    if (!other || other === memberId) continue;
    const d = o.respondedAt ?? o.createdAt;
    const cur = lastByMember.get(other);
    if (!cur || d > cur) lastByMember.set(other, d);
  }
  if (lastByMember.size === 0) return [];

  const members = await prisma.member.findMany({
    where: { id: { in: [...lastByMember.keys()] } },
    select: { id: true, name: true, companyLogoUrl: true, avatarUrl: true },
  });
  return members
    .map((m) => ({
      id: m.id,
      name: m.name,
      logoUrl: m.companyLogoUrl ?? m.avatarUrl ?? null,
      lastAt: lastByMember.get(m.id)!,
    }))
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
    .slice(0, limit);
}
