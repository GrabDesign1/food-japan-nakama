import { prisma } from "@/lib/db";
import {
  applyContact, currentStrength, relationState, isAlive,
  type ContactKind, type RelationState,
} from "@/lib/card-relationship";
import { decayResistance } from "@/lib/card-context";
import { orderPair } from "@/lib/cards";

/**
 * 関係性の読み書き（2026-11-21）。
 *
 * card-relationship.ts は計算式だけで、状態を置く場所が無かった。ここが置き場所。
 *
 * ⚠️ 強さは保存しない。**最後の接触時の強さと時刻**だけを保存し、現在値は都度計算する。
 * ⚠️ 1組1行。memberAId < memberBId の順を崩さない。
 * ⚠️ 接触の記録（ContactEvent）には**本文を入れない**。種類と時刻だけ。
 */

/** 接触を1件記録して、関係性を更新する。失敗しても呼び出し元の処理は止めない */
export async function recordContact(params: {
  tenantId: string;
  actorMemberId: string;
  otherMemberId: string;
  kind: ContactKind;
  /** 出会った文脈を足したいとき（card-context.ts の code） */
  addContext?: string;
}): Promise<void> {
  const { tenantId, actorMemberId, otherMemberId, kind } = params;
  if (!otherMemberId || actorMemberId === otherMemberId) return;

  const { memberAId, memberBId } = orderPair(actorMemberId, otherMemberId);
  const now = new Date();

  try {
    const existing = await prisma.relationship.findUnique({
      where: { memberAId_memberBId: { memberAId, memberBId } },
      select: { strengthAtLastContact: true, lastContactAt: true, contextCodes: true },
    });

    const contexts = new Set(existing?.contextCodes ?? []);
    if (params.addContext) contexts.add(params.addContext);

    const strength = existing
      ? applyContact(existing.strengthAtLastContact, existing.lastContactAt, kind, now)
      : applyContact(0, now, kind, now);

    await prisma.relationship.upsert({
      where: { memberAId_memberBId: { memberAId, memberBId } },
      create: {
        tenantId, memberAId, memberBId,
        strengthAtLastContact: strength,
        lastContactAt: now,
        lastKind: kind,
        contextCodes: [...contexts],
      },
      update: {
        strengthAtLastContact: strength,
        lastContactAt: now,
        lastKind: kind,
        contextCodes: [...contexts],
      },
    });

    await prisma.contactEvent.create({
      data: { tenantId, memberAId, memberBId, actorMemberId, kind },
    });
  } catch (e) {
    // ⚠️ 関係性の記録は**おまけ**。ここで落ちても、いいねや投稿そのものは成立させる
    console.error("[relationship] 接触の記録に失敗（本処理は続行）:", e);
  }
}

export type RelationSummary = {
  partnerMemberId: string;
  strength: number;
  state: RelationState;
  lastContactAt: Date;
  lastKind: string;
};

/** 自分の関係を全部読んで、いまの強さを計算して返す（強い順） */
export async function listMyRelationships(memberId: string): Promise<RelationSummary[]> {
  const rows = await prisma.relationship.findMany({
    where: { OR: [{ memberAId: memberId }, { memberBId: memberId }] },
    select: {
      memberAId: true, memberBId: true, strengthAtLastContact: true,
      lastContactAt: true, lastKind: true, contextCodes: true,
    },
  });
  const now = new Date();
  return rows
    .map((r) => {
      const strength = currentStrength(
        r.strengthAtLastContact,
        r.lastContactAt,
        now,
        decayResistance(r.contextCodes)
      );
      return {
        partnerMemberId: r.memberAId === memberId ? r.memberBId : r.memberAId,
        strength,
        state: relationState(strength),
        lastContactAt: r.lastContactAt,
        lastKind: r.lastKind,
      };
    })
    .sort((a, b) => b.strength - a.strength);
}

/** 生きている関係の数＝その人の人脈の実力 */
export async function myEffectiveCount(memberId: string): Promise<number> {
  const rels = await listMyRelationships(memberId);
  return rels.filter((r) => isAlive(r.strength)).length;
}

/**
 * 「そろそろ連絡を」の相手。薄れかけている順に返す。
 * ⚠️ 切れきった相手（cold）は出さない。戻せる見込みのある人だけを出す。
 */
export async function fadingPartners(memberId: string, take = 5): Promise<RelationSummary[]> {
  const rels = await listMyRelationships(memberId);
  return rels
    .filter((r) => r.state.code === "warm" || r.state.code === "fading")
    .sort((a, b) => a.strength - b.strength)
    .slice(0, take);
}
