// 会員が「発信しているところ」（Facebook / Instagram / X / note / 自社サイト / 管理しているページ）。
//
// なぜ作るか（ユーザー指示 2026-11-25）:
//   「自分の記事をキュレーションできるようにして、FB,Instagram、X、管理しているページ、NOTEなど」
//
// ⚠️⚠️ **URL は本人が入れたものをそのまま画面に出す。** ここで必ず関所を通す：
//    ① http / https 以外は捨てる（javascript: や data: を弾く）
//    ② 長すぎるものは捨てる
//    ③ 画面の a タグには rel="noreferrer" を付ける（呼び出し側の責任）
// ⚠️ 1人あたりの上限を決めて、際限なく増やさない。
import { prisma } from "@/lib/db";
import {
  FIXED_KINDS, MEMBER_LINK_MAX, MEMBER_LINK_FREE_SLOTS, type LinkKind,
} from "@/lib/member-links-shared";

export { FIXED_KINDS, MEMBER_LINK_MAX, MEMBER_LINK_FREE_SLOTS };
export type { LinkKind };


const FIXED_SET = new Set<string>(FIXED_KINDS.map((f) => f.kind));

export type MemberLinkView = {
  id: string;
  kind: LinkKind;
  label: string;   // 画面に出す名前（決まった種類はその名前、other は本人が付けた名前）
  url: string;
  host: string;    // 画面に小さく出す「どこのサイトか」
};

/** ⚠️ 関所。http/https の正しいURLだけを通す。それ以外は null。 */
export function safeUrl(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t || t.length > 500) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname.includes(".")) return null;
  return u.toString();
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function labelFor(kind: string, label: string | null, url: string): string {
  const fixed = FIXED_KINDS.find((f) => f.kind === kind);
  if (fixed) return fixed.label;
  const t = (label ?? "").trim();
  return t || hostOf(url) || "リンク";
}

/** 会員のリンクを、画面に出せる形で返す。 */
export async function listMemberLinks(memberId: string): Promise<MemberLinkView[]> {
  const rows = await prisma.memberLink.findMany({
    where: { memberId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: MEMBER_LINK_MAX,
  });
  return rows
    .map((r) => {
      const url = safeUrl(r.url); // ⚠️ 読み出し時にももう一度通す（古い行が混じっても安全に）
      if (!url) return null;
      return {
        id: r.id,
        kind: (FIXED_SET.has(r.kind) ? r.kind : "other") as LinkKind,
        label: labelFor(r.kind, r.label, url),
        url,
        host: hostOf(url),
      };
    })
    .filter((x): x is MemberLinkView => x !== null);
}

export type LinkInput = { kind: string; label?: string | null; url: string };

/**
 * リンクをまとめて置き換える。空のURLは「消す」の意味。
 * ⚠️ 必ず memberId で絞ってから消す（他人のリンクを消さない）。
 */
export async function replaceMemberLinks(memberId: string, inputs: LinkInput[]): Promise<void> {
  const rows: { kind: string; label: string | null; url: string; sortOrder: number }[] = [];
  const usedFixed = new Set<string>();
  let order = 0;
  for (const i of inputs) {
    const url = safeUrl(i.url);
    if (!url) continue;
    const kind = FIXED_SET.has(i.kind) ? i.kind : "other";
    if (kind !== "other") {
      if (usedFixed.has(kind)) continue; // 決まった種類は1人1つ
      usedFixed.add(kind);
    }
    const label = kind === "other" ? (i.label ?? "").trim().slice(0, 40) || null : null;
    rows.push({ kind, label, url, sortOrder: order++ });
    if (rows.length >= MEMBER_LINK_MAX) break;
  }
  await prisma.$transaction([
    prisma.memberLink.deleteMany({ where: { memberId } }),
    ...(rows.length
      ? [prisma.memberLink.createMany({ data: rows.map((r) => ({ ...r, memberId })) })]
      : []),
  ]);
}
