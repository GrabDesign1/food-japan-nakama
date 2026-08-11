// 「売りたい」に届いたリード（買い手からの問い合わせ）の開封（2026-08-12・ユーザー決定）。
//
// **初回の接点に紹介料**という一本のルールにする。
//   ・売り手 →「探している」への初回提案 … ContactUnlock（従来）
//   ・買い手 →「売りたい」への問い合わせ … 売り手が開くときに LeadUnlock（今回）
// どちらも1クレジット。**開封後のやり取りは何往復でも無料**。
//
// 一覧では社名・地域・業種と概要（冒頭のみ）まで無料で見える。
// 本文の全文と連絡先は開封してから。開封＝価値を得た時点なので、未読返還の対象にはしない
// （提案側は「送ったが読まれない」ことがあるため返還があるが、こちらは自分で開く）。
import { prisma } from "@/lib/db";
import { consumeCreditsTx } from "@/lib/contact-credits";
import { isChargeableLead, LEAD_UNLOCK_COST, LEAD_UNLOCK_START_AT } from "@/lib/lead-unlock-core";

// 判定と文言は lead-unlock-core.ts（DB非依存・テスト対象）。
// これまでどおり "@/lib/lead-unlock" から使えるように再輸出する。
export * from "@/lib/lead-unlock-core";

/** 開封済みのスレッドIDの集合を返す（一覧でまとめて判定する用）。 */
export async function loadUnlockedThreadIds(
  memberId: string,
  threadIds: string[]
): Promise<Set<string>> {
  if (!threadIds.length) return new Set();
  const rows = await prisma.leadUnlock.findMany({
    where: { memberId, threadId: { in: threadIds } },
    select: { threadId: true },
  });
  return new Set(rows.map((r) => r.threadId));
}

export async function isLeadUnlocked(memberId: string, threadId: string): Promise<boolean> {
  const row = await prisma.leadUnlock.findUnique({ where: { threadId } });
  return !!row && row.memberId === memberId;
}


/**
 * 一覧向け：未開封のまま伏せるべきスレッドIDを返す。
 * 画面ごとに条件を書き直すと必ずどこかで漏れる（本文が1画面でも出れば課金は無意味になる）ので、
 * **本文を表示する画面はすべてこの関数を通す**こと。
 */
export async function loadLockedLeadThreadIds(
  memberId: string,
  threads: { id: string; offeringId: string | null; fromMemberId: string }[]
): Promise<Set<string>> {
  // 相手が始めた・案件つきのスレッドだけが対象になりうる
  const candidates = threads.filter((t) => t.offeringId && t.fromMemberId !== memberId);
  if (!candidates.length) return new Set();

  const offeringIds = Array.from(new Set(candidates.map((t) => t.offeringId!)));
  const mine = await prisma.offering.findMany({
    where: { id: { in: offeringIds }, memberId, direction: "GIVE" },
    select: { id: true },
  });
  const mineIds = new Set(mine.map((o) => o.id));
  const targets = candidates.filter((t) => mineIds.has(t.offeringId!));
  if (!targets.length) return new Set();

  const targetIds = targets.map((t) => t.id);
  // 施行日の判定に使う「相手からの最初のメッセージ」
  const firsts = await prisma.message.groupBy({
    by: ["threadId"],
    where: { threadId: { in: targetIds }, senderMemberId: { not: memberId } },
    _min: { createdAt: true },
  });
  const firstAt = new Map(firsts.map((f) => [f.threadId, f._min.createdAt ?? null]));

  const chargeable = targets.filter((t) =>
    isChargeableLead({
      direction: "GIVE",
      offeringMemberId: memberId,
      viewerMemberId: memberId,
      threadFromMemberId: t.fromMemberId,
      firstInboundAt: firstAt.get(t.id) ?? null,
    })
  );
  if (!chargeable.length) return new Set();

  const unlocked = await loadUnlockedThreadIds(
    memberId,
    chargeable.map((t) => t.id)
  );
  return new Set(chargeable.map((t) => t.id).filter((id) => !unlocked.has(id)));
}

/** 未開封のまま置かれている問い合わせ（買い手へ知らせる用）。 */
export type UnopenedLead = {
  threadId: string;
  buyerMemberId: string;
  sellerMemberId: string;
  offeringId: string;
  offeringTitle: string;
  firstInboundAt: Date;
};

/**
 * 一定期間ひらかれていない問い合わせを探す（日次バッチから使う）。
 * 開封が有料になった以上、**買い手には「まだ読まれていない」ことを知らせる**（透明化・ユーザー決定）。
 * 通知済みかどうかは `Thread.leadUnopenedNoticeAt` で持つので、この関数は未通知のものだけを返す。
 */
export async function findUnopenedLeadsForNotice(params: {
  olderThan: Date;
  limit?: number;
}): Promise<UnopenedLead[]> {
  const limit = params.limit ?? 100;
  const threads = await prisma.thread.findMany({
    where: {
      leadUnopenedNoticeAt: null,
      offeringId: { not: null },
      createdAt: { lte: params.olderThan },
    },
    orderBy: { createdAt: "asc" },
    take: limit * 3,
    select: { id: true, offeringId: true, fromMemberId: true, toMemberId: true },
  });
  if (!threads.length) return [];

  const offerings = await prisma.offering.findMany({
    where: { id: { in: threads.map((t) => t.offeringId!) }, direction: "GIVE" },
    select: { id: true, memberId: true, title: true },
  });
  const offeringMap = new Map(offerings.map((o) => [o.id, o]));

  // 掲載者（売り手）宛てに、買い手から届いたものだけ
  const targets = threads.filter((t) => {
    const o = offeringMap.get(t.offeringId!);
    return !!o && o.memberId === t.toMemberId && t.fromMemberId !== o.memberId;
  });
  if (!targets.length) return [];

  const targetIds = targets.map((t) => t.id);
  const opened = await prisma.leadUnlock.findMany({
    where: { threadId: { in: targetIds } },
    select: { threadId: true },
  });
  const openedIds = new Set(opened.map((o) => o.threadId));

  const firsts = await prisma.message.groupBy({
    by: ["threadId", "senderMemberId"],
    where: { threadId: { in: targetIds } },
    _min: { createdAt: true },
  });
  const firstByPair = new Map(
    firsts.map((f) => [`${f.threadId}:${f.senderMemberId}`, f._min.createdAt ?? null])
  );

  const out: UnopenedLead[] = [];
  for (const t of targets) {
    if (openedIds.has(t.id)) continue;
    const at = firstByPair.get(`${t.id}:${t.fromMemberId}`);
    if (!at) continue;
    if (at.getTime() < LEAD_UNLOCK_START_AT.getTime()) continue; // 無料だった時期のものは対象外
    if (at.getTime() > params.olderThan.getTime()) continue;
    const o = offeringMap.get(t.offeringId!)!;
    out.push({
      threadId: t.id,
      buyerMemberId: t.fromMemberId,
      sellerMemberId: t.toMemberId,
      offeringId: o.id,
      offeringTitle: o.title || "（無題）",
      firstInboundAt: at,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** 相手からの最初のメッセージの日時（課金対象かどうかの判定に使う）。 */
export async function firstInboundAt(threadId: string, memberId: string): Promise<Date | null> {
  const first = await prisma.message.findFirst({
    where: { threadId, senderMemberId: { not: memberId } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  return first?.createdAt ?? null;
}

export type OpenLeadResult = { ok: true } | { ok: false; error: string };

/**
 * リードを開封する（1クレジット消費）。
 * 消費と記録は1トランザクションで行い、二重課金は threadId の unique で防ぐ。
 */
export async function openLead(params: {
  tenantId: string;
  memberId: string;
  buyerMemberId: string;
  threadId: string;
  offeringId: string | null;
}): Promise<OpenLeadResult> {
  const existing = await prisma.leadUnlock.findUnique({ where: { threadId: params.threadId } });
  if (existing) return { ok: true };

  try {
    await prisma.$transaction(async (tx) => {
      // 先に記録を作る＝同時押しは unique 制約で1回だけ通る
      const unlock = await tx.leadUnlock.create({
        data: {
          tenantId: params.tenantId,
          memberId: params.memberId,
          buyerMemberId: params.buyerMemberId,
          threadId: params.threadId,
          offeringId: params.offeringId,
        },
      });
      const consumed = await consumeCreditsTx(tx, {
        tenantId: params.tenantId,
        memberId: params.memberId,
        contactUnlockId: unlock.id,
        quantity: LEAD_UNLOCK_COST,
      });
      if (!consumed) throw new Error("INSUFFICIENT");
      await tx.leadUnlock.update({
        where: { id: unlock.id },
        data: { creditLedgerEntryId: consumed.ledgerEntryIds[0] ?? null },
      });
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INSUFFICIENT") {
      return { ok: false, error: "クレジットが不足しています。お支払い画面から購入できます。" };
    }
    // unique 制約＝ほぼ同時に押された。すでに開封済みとして扱う
    if (await prisma.leadUnlock.findUnique({ where: { threadId: params.threadId } })) {
      return { ok: true };
    }
    console.error("[lead-unlock] 開封に失敗:", e);
    return { ok: false, error: "開封できませんでした。時間をおいてお試しください。" };
  }
}
