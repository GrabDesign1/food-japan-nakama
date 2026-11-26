// 生産者（売りたい）と流通（探している）を突き合わせる。2026-11-26 ユーザー指示
//   「とにかく生産者と流通がしっかりと結びつくようなつくり方を明確に表現せよ」
//
// ⚠️⚠️ **なぜ合うのかを必ず言葉で出す**（reasons）。点数だけ出しても、人は動かない。
//    「分類が同じ」「地域が同じ」「“柑橘”が共通」のように、見れば分かる理由を並べる。
// ⚠️⚠️ **点数そのものは画面に出さない。** 相手を数字で見せない決まり（card-relationship.ts と同じ）。
// ⚠️ 見えてよい案件だけを対象にする（isPublic・visibility=public・審査済みの会員）。
//    ここを緩めると、非公開の募集が突き合わせ経由で漏れる。
import { prisma } from "@/lib/db";

export type MatchSide = {
  offeringId: string;
  title: string;
  category: string;
  area: string | null;
  memberId: string;
  memberName: string;
  direction: "GIVE" | "WANT";
};

export type Match = {
  /** 自分の案件（事務局の画面では「売りたい」側） */
  mine: MatchSide;
  /** 相手の案件 */
  other: MatchSide;
  /** なぜ合うのか。画面にそのまま出す */
  reasons: string[];
  /** 並べ替えにだけ使う。⚠️ 画面に出さない */
  score: number;
};

/** 点数の内訳（変えたらここも直す） */
const SCORE_CATEGORY = 40;
const SCORE_AREA = 15;
const SCORE_WORD = 6;
const SCORE_WORD_MAX = 36;
/** これ未満は出さない。弱い組み合わせを並べると、全部が嘘に見える */
export const MATCH_MIN_SCORE = 40;

/**
 * 2つの文のあいだで共通する「語」を取り出す。
 *
 * ⚠️⚠️ **2文字の断片をそのまま理由に出さない。**（2026-11-26 に実際にやって読めなかった：
 *    「フレ」「レタ」「タス」が理由欄に並んだ）。断片ではなく、**続いている部分をつなげて語に戻す**。
 * ⚠️ 形態素解析は入れていない（辞書を持つと保守できない）。
 *    相手の題名を2文字ずつずらして、自分の文に含まれる部分を見つけ、隣り合うものをつなげる。
 * ⚠️ ひらがなだけの語は捨てる（「です」「ための」などが共通しても意味が無い）。
 */
export function sharedWords(mineText: string, otherText: string): string[] {
  const hay = mineText.toLowerCase();
  const target = otherText.toLowerCase();
  const found: string[] = [];
  let i = 0;
  while (i < target.length - 1) {
    if (!hay.includes(target.slice(i, i + 2))) { i++; continue; }
    // 含まれている限り伸ばす
    let end = i + 2;
    while (end < target.length && hay.includes(target.slice(i, end + 1))) end++;
    // ⚠️ 前後の助詞を落とす。落とさないと「用の」「を探」のような語が理由に並ぶ（2026-11-26 実測）
    const word = target.slice(i, end).replace(/^[のをがはにでともへやも\s]+/, "").replace(/[のをがはにでともへやも\s]+$/, "");
    if (word.length >= 2 && !/^[ぁ-ん\s、。・（）()]+$/.test(word) && !/^[0-9\s]+$/.test(word)) {
      found.push(word);
    }
    i = end - 1;
  }
  // 長い順・重複なし
  return [...new Set(found)].sort((a, b) => b.length - a.length);
}

/** 地域が重なるか（都道府県名の部分一致。自由記述なのでゆるく見る） */
function sameArea(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const norm = (s: string) => s.replace(/[都道府県\s]/g, "");
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

/** 突き合わせに使う1件分。⚠️ 試験から呼べるように型も公開する */
export type MatchRow = {
  id: string; title: string; category: string; area: string | null;
  description: string | null; tags: string[]; direction: "GIVE" | "WANT";
  seekingType: string | null;
  memberId: string; member: { name: string; prefecture: string | null; productItems: string | null };
};
type Row = MatchRow;

const SELECT = {
  id: true, title: true, category: true, area: true, description: true, tags: true,
  direction: true, memberId: true, seekingType: true,
  member: { select: { name: true, prefecture: true, productItems: true } },
} as const;

const WHERE_VISIBLE = {
  isPublic: true,
  visibility: "public",
  title: { not: "" },
  member: { status: "APPROVED" as const, listed: true },
} as const;

/**
 * 2件の近さを測る。⚠️ **ここが突き合わせの全部。** 画面はこの結果を並べているだけ。
 * 試験から直接呼べるように公開している（scripts/check-matching.ts）。
 */
export function matchScore(a: MatchRow, b: MatchRow): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;

  if (a.category === b.category) { s += SCORE_CATEGORY; reasons.push(`分類が同じ（${a.category}）`); }

  const areaA = a.area ?? a.member.prefecture;
  const areaB = b.area ?? b.member.prefecture;
  if (sameArea(areaA, areaB)) { s += SCORE_AREA; reasons.push(`地域が近い（${areaB}）`); }

  // 共通する語。⚠️ 相手の題名側から拾う（画面に出すので、読める語にする）
  const mineText = [a.title, a.description, a.tags.join(" "), a.member.productItems].filter(Boolean).join(" ");
  const words = sharedWords(mineText, b.title).filter((w) => w.length >= 2).slice(0, 3);
  if (words.length) {
    s += Math.min(SCORE_WORD_MAX, words.reduce((n, w) => n + SCORE_WORD * (w.length >= 3 ? 2 : 1), 0));
    reasons.push(`「${words.join("」「")}」が共通`);
  }

  // ⚠️⚠️ **語がひとつも重ならないときは、原則として出さない。**
  //    分類と地域だけで出すと「マンゴー × レタスを探しています」が「合う」と並ぶ（2026-11-26 実測）。
  //    例外は、相手が具体名を決めずに**提案を募っている**とき。そこは分類が合えば意味がある。
  const loose = b.direction === "WANT" && LOOSE_SEEKING.includes(b.seekingType ?? "");
  if (words.length === 0 && !(loose && a.category === b.category)) {
    return { score: 0, reasons: [] };
  }
  if (words.length === 0 && loose) reasons.push("提案を募っています");

  return { score: s, reasons };
}

/** 「具体的なものを探している」以外（提案・共創）は、分類が同じなら出してよい */
const LOOSE_SEEKING = ["proposal", "codev", "oem", "surplus"];

function toSide(r: Row): MatchSide {
  return {
    offeringId: r.id, title: r.title, category: r.category, area: r.area,
    memberId: r.memberId, memberName: r.member.name, direction: r.direction,
  };
}

/**
 * ある会員にとっての組み合わせ。
 * - sellToWant：自分の「売りたい」に対して、探している相手
 * - wantToSell：自分の「探している」に対して、出せそうな相手
 */
export async function matchesForMember(memberId: string): Promise<{
  sellToWant: Match[];
  wantToSell: Match[];
}> {
  const [mine, others] = await Promise.all([
    prisma.offering.findMany({ where: { memberId, ...WHERE_VISIBLE }, select: SELECT, take: 50 }),
    prisma.offering.findMany({
      where: { memberId: { not: memberId }, ...WHERE_VISIBLE },
      select: SELECT, orderBy: { createdAt: "desc" }, take: 300,
    }),
  ]);

  const build = (dirMine: "GIVE" | "WANT", dirOther: "GIVE" | "WANT"): Match[] => {
    const out: Match[] = [];
    for (const m of mine.filter((x) => x.direction === dirMine)) {
      for (const o of others.filter((x) => x.direction === dirOther)) {
        const { score: sc, reasons } = matchScore(m as Row, o as Row);
        if (sc >= MATCH_MIN_SCORE) {
          out.push({ mine: toSide(m as Row), other: toSide(o as Row), reasons, score: sc });
        }
      }
    }
    return out.sort((x, y) => y.score - x.score).slice(0, 20);
  };

  return { sellToWant: build("GIVE", "WANT"), wantToSell: build("WANT", "GIVE") };
}

/**
 * 事務局向け：全体の組み合わせ（売りたい × 探している）。
 * ⚠️ 事務局が**人の手でつなぐ**ための材料。自動で連絡はしない。
 */
export async function allMatches(take = 40): Promise<Match[]> {
  const rows = await prisma.offering.findMany({
    where: WHERE_VISIBLE, select: SELECT, orderBy: { createdAt: "desc" }, take: 400,
  });
  const gives = rows.filter((r) => r.direction === "GIVE") as Row[];
  const wants = rows.filter((r) => r.direction === "WANT") as Row[];

  const out: Match[] = [];
  for (const g of gives) {
    for (const w of wants) {
      if (g.memberId === w.memberId) continue;
      const { score: sc, reasons } = matchScore(g, w);
      if (sc >= MATCH_MIN_SCORE) out.push({ mine: toSide(g), other: toSide(w), reasons, score: sc });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, take);
}
