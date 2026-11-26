// 突き合わせの精度を、作ったデータで確かめる（2026-11-26）。DBには触らない。
// ⚠️ 本番には「探している」案件がまだ無いので、実データでは確認できない。ここで代わりに確かめる。
import type { MatchRow } from "../src/lib/matching";

function row(o: Partial<MatchRow> & { title: string; direction: "GIVE" | "WANT" }): MatchRow {
  return {
    id: o.title, title: o.title, category: o.category ?? "食材・原料", area: o.area ?? null,
    description: o.description ?? null, tags: o.tags ?? [], direction: o.direction,
    seekingType: o.seekingType ?? (o.direction === "WANT" ? "specific" : null),
    memberId: o.memberId ?? o.title, member: { name: o.member?.name ?? "某社", prefecture: o.member?.prefecture ?? null, productItems: o.member?.productItems ?? null },
  };
}

async function main() {
  const { matchScore, MATCH_MIN_SCORE } = await import("../src/lib/matching");

  const sells = [
    row({ title: "朝採りリーフレタス（週50ケースから）", direction: "GIVE", area: "宮崎県", member: { name: "見本農園", prefecture: "宮崎県", productItems: "リーフレタス、ネギ" } }),
    row({ title: "完熟マンゴー 規格外品", direction: "GIVE", area: "宮崎県", member: { name: "南国果樹園", prefecture: "宮崎県", productItems: "マンゴー" } }),
    row({ title: "業務用の製麺ライン 空き時間貸します", direction: "GIVE", category: "加工設備", area: "愛知県", member: { name: "名古屋製麺", prefecture: "愛知県", productItems: null } }),
  ];
  const wants = [
    row({ title: "宮崎県産のリーフレタスを探しています", direction: "WANT", area: "宮崎県", member: { name: "スーパーA", prefecture: "福岡県", productItems: null } }),
    row({ title: "規格外の果物を加工用に仕入れたい", direction: "WANT", area: "全国", member: { name: "加工メーカーB", prefecture: "大阪府", productItems: null } }),
    row({ title: "宮崎の生産者さんからのご提案を募集します", direction: "WANT", seekingType: "proposal", area: "宮崎県", member: { name: "百貨店E", prefecture: "東京都", productItems: null } }),
    row({ title: "OEMで麺をつくれる工場を探しています", direction: "WANT", seekingType: "oem", category: "加工設備", area: "東海", member: { name: "食品ベンチャーC", prefecture: "愛知県", productItems: null } }),
    row({ title: "ノベルティ用の紙袋を探しています", direction: "WANT", category: "人材", area: "東京都", member: { name: "D社", prefecture: "東京都", productItems: null } }),
  ];

  console.log(`しきい値 ${MATCH_MIN_SCORE} 点以上を「合う」とする\n`);
  for (const s of sells) {
    for (const w of wants) {
      const r = matchScore(s, w);
      const hit = r.score >= MATCH_MIN_SCORE ? "○ 出す" : "－ 出さない";
      console.log(`${hit}  [${String(r.score).padStart(3)}] ${s.title.slice(0, 18)} × ${w.title.slice(0, 20)}`);
      if (r.reasons.length) console.log(`            理由: ${r.reasons.join(" / ")}`);
    }
    console.log("");
  }
}
main();
