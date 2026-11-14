import { prisma } from "@/lib/db";
import type { MemberCard } from "@/generated/prisma/client";

/**
 * 交換カード（名刺の代わり）。
 *
 * ⚠️ **他人の名刺を取り込む作りにはしない**。カードは「本人が自分で渡す」もので、
 *    交換という行為そのものが本人同意になる。受け取った名刺をスキャンして登録する形
 *    （Eight型）にすると、名刺の持ち主の同意なく第三者の個人データを保有することになり、
 *    利用規約第13条の「名簿化・第三者提供」の禁止とも正面からぶつかる。**この前提を崩さないこと。**
 *
 * ⚠️ カードに出す中身は Member から都度引く。MemberCard に氏名や連絡先を複製しない
 *    （プロフィールを直しても古い情報がカードに残るため）。
 *
 * ⚠️ 交換は**1組につき1行**。memberAId < memberBId の順に必ず並べ替えてから書く。
 *    並べ替えを飛ばすと同じ相手と2行できる。
 */

/** 交換コードの文字種。見間違えやすい I / O / 0 / 1 を外してある（会場で口頭と手入力に耐えるため） */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/**
 * 入力されたコードを突き合わせ用に整える。
 * 会場では小文字・空白・ハイフン混じりで打たれるので、ここで吸収する。
 * 見間違えやすい文字は、打たれた側を正しい側へ寄せる（0→O ではなく O は使っていないので 0→D ではない点に注意：
 * 使わない文字 I/O/0/1 のうち、見間違いの実害があるのは 0→O と 1→I。どちらも**使っていない文字へ寄せない**で、
 * そのまま不一致として扱う＝誤って別人と交換するより、もう一度打ってもらうほうが安全）。
 */
export function normalizeCardCode(raw: string): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);
}

/** 自分のカード。無ければ作る。 */
export async function getOrCreateMyCard(member: { id: string; tenantId: string }): Promise<MemberCard> {
  const found = await prisma.memberCard.findUnique({ where: { memberId: member.id } });
  if (found) return found;

  // コードの衝突はほぼ起きないが、起きたら作り直す
  for (let i = 0; i < 5; i++) {
    try {
      return await prisma.memberCard.create({
        data: { memberId: member.id, tenantId: member.tenantId, code: randomCode() },
      });
    } catch {
      // unique 制約に当たったら引き直す。最後まで失敗したら下で投げる
    }
  }
  throw new Error("交換コードを発行できませんでした。時間をおいて、もう一度お試しください。");
}

/** 必ず memberAId < memberBId の順に並べる */
export function orderPair(x: string, y: string): { memberAId: string; memberBId: string } {
  return x < y ? { memberAId: x, memberBId: y } : { memberAId: y, memberBId: x };
}

export type ExchangeResult =
  | { ok: true; already: boolean; partnerMemberId: string }
  | { ok: false; error: string };

/**
 * コードを読み取って交換する。**一度の操作で双方に成立する**（片方向の申請にしない）。
 * 同じ相手と二度やっても増えない（冪等）。
 */
export async function exchangeByCode(
  me: { id: string; tenantId: string },
  rawCode: string,
  metAt?: string | null
): Promise<ExchangeResult> {
  const code = normalizeCardCode(rawCode);
  if (code.length !== CODE_LENGTH) {
    return { ok: false, error: "交換コードは8文字です。もう一度ご確認ください。" };
  }

  const card = await prisma.memberCard.findUnique({
    where: { code },
    select: { memberId: true, tenantId: true, isActive: true },
  });
  if (!card) return { ok: false, error: "そのコードのカードが見つかりませんでした。" };
  if (!card.isActive) return { ok: false, error: "このカードは今、交換を受け付けていません。" };
  if (card.tenantId !== me.tenantId) return { ok: false, error: "そのコードのカードが見つかりませんでした。" };
  if (card.memberId === me.id) return { ok: false, error: "ご自身のカードとは交換できません。" };

  const { memberAId, memberBId } = orderPair(me.id, card.memberId);

  const existing = await prisma.cardExchange.findUnique({
    where: { memberAId_memberBId: { memberAId, memberBId } },
    select: { id: true },
  });
  if (existing) return { ok: true, already: true, partnerMemberId: card.memberId };

  try {
    await prisma.cardExchange.create({
      data: {
        tenantId: me.tenantId,
        memberAId,
        memberBId,
        initiatedByMemberId: me.id,
        metAt: metAt?.trim() ? metAt.trim().slice(0, 120) : null,
      },
    });
  } catch {
    // 同時に両方が読み取ると unique に当たる。その場合も成立しているので成功として返す
    return { ok: true, already: true, partnerMemberId: card.memberId };
  }
  return { ok: true, already: false, partnerMemberId: card.memberId };
}

export type ExchangedCard = {
  exchangeId: string;
  partnerMemberId: string;
  metAt: string | null;
  /** 自分の側のメモ。相手には見えない */
  myNote: string | null;
  exchangedAt: Date;
};

/** 自分が交換したカードの一覧（新しい順）。メモは自分の側だけを返す。 */
export async function listMyExchanges(memberId: string): Promise<ExchangedCard[]> {
  const rows = await prisma.cardExchange.findMany({
    where: { OR: [{ memberAId: memberId }, { memberBId: memberId }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, memberAId: true, memberBId: true,
      metAt: true, noteA: true, noteB: true, createdAt: true,
    },
  });
  return rows.map((r) => {
    const iAmA = r.memberAId === memberId;
    return {
      exchangeId: r.id,
      partnerMemberId: iAmA ? r.memberBId : r.memberAId,
      metAt: r.metAt,
      myNote: iAmA ? r.noteA : r.noteB,
      exchangedAt: r.createdAt,
    };
  });
}

/** 自分の側のメモだけを書き換える（相手の noteA/noteB には触らない） */
export async function updateMyNote(memberId: string, exchangeId: string, note: string): Promise<boolean> {
  const row = await prisma.cardExchange.findUnique({
    where: { id: exchangeId },
    select: { memberAId: true, memberBId: true },
  });
  if (!row) return false;
  const value = note.trim().slice(0, 2000) || null;
  if (row.memberAId === memberId) {
    await prisma.cardExchange.update({ where: { id: exchangeId }, data: { noteA: value } });
    return true;
  }
  if (row.memberBId === memberId) {
    await prisma.cardExchange.update({ where: { id: exchangeId }, data: { noteB: value } });
    return true;
  }
  return false; // 当事者以外は書けない
}
