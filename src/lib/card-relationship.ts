/**
 * 関係性の強さ（交換したカード1枚ごと）。**放っておくと下がる。**
 *
 * 考え方（ユーザー指示 2026-11-06）：
 *   「6000枚持っていても、FB・Instagram・LINE・メールなどで交流していないと関係性が下がっていく」
 *   → 枚数そのものではなく、**生きている関係の数**を数える。
 *
 * ⚠️ これが**水増し対策そのもの**でもある。会っていない相手と相互に交換し合っても、
 *    その後の接触が無ければ強さは落ちていき、有効枚数に効かなくなる。
 *    だから交換数をランクに効かせても、交換の作り合いが得にならない。**減衰を外さないこと。**
 *
 * ⚠️ **外部SNSのやり取りは観測できない。** LINE・Facebook・Instagram の個人間メッセージを
 *    読むAPIは提供されておらず、メールボックスの閲覧は権限の次元が違う。
 *    観測できるのは下の ContactKind に挙げたものだけ。
 *    「LINEで話したから関係が続いている」は、本人の自己申告（self_report）としてしか取れない。
 *    ここを誤解したまま設計を広げないこと。
 */

/** 強さの上限。交換直後がこの値 */
export const MAX_STRENGTH = 100;

/**
 * 接触が無いときの半減期（日）。180日＝半年で半分になる。
 *
 * ⚠️ **この数字に研究上の裏付けは無い。仮置きである。**
 *    Roberts & Dunbar の18か月追跡（2011, Evolution and Human Behavior／2015, Human Nature）は、
 *    **友人関係は親族関係よりも接触頻度の低下にはるかに敏感**であることを示しているが、
 *    半減期そのものの値は示していない。「60日半減期」と書いている一般向けページもあるが、
 *    査読論文の記述とは一致しないので採らなかった。
 *    **自社のデータが溜まったら必ず較正すること。**数字が良く見えるほうへ寄せないこと。
 *
 * ⚠️ 親族と友人で速さを変えるべき（上の研究で差が出ている）。
 *    種類ごとの床（card-trust.ts の RelationTier.floor）と、
 *    文脈による減衰耐性（card-context.ts の decayResistance）で近似している。
 */
export const HALF_LIFE_DAYS = 180;

/** 有効枚数に数えるかどうかの下限。これを下回った関係は「切れている」とみなす */
export const ALIVE_THRESHOLD = 20;

/** 観測できる接触の種類と、強さの回復量 */
export type ContactKind =
  | "exchange"     // カードを交換した（関係の始まり）
  | "deal"         // 商談が実施された
  | "message"      // NAKAMA内でメッセージをやり取りした
  | "reunion"      // 別の会で再会して、もう一度読み取った
  | "link_click"   // カードから相手のSNS・メールへ移動した（＝連絡を取ろうとした）
  | "self_report"  // 「最近やり取りした」と本人が記録した
  | "post_like"    // 相手の投稿にいいねした（2026-11-21 追加）
  | "post_comment";// 相手の投稿にコメントした（2026-11-21 追加）

/**
 * 接触ごとの回復量。
 * ⚠️ self_report と link_click は**本人がいくらでも押せる**ので低く設定している。
 *    ここを上げると、ボタン連打で関係性を維持できてしまう。
 */
export const CONTACT_GAIN: Record<ContactKind, number> = {
  exchange: 100,
  deal: 100,
  message: 45,
  reunion: 60,
  // 投稿への反応（2026-11-21 追加）。これが**日常的に起きる唯一の接触**になる。
  // ⚠️ コメントは言葉のやり取りなのでメッセージに近いが、公開の場で一言なので少し低く取る。
  //    いいねは押すだけなので、リンク移動よりわずかに上。ここを上げすぎると
  //    連打で関係を維持できてしまう（self_report を 12 に抑えているのと同じ理由）。
  post_comment: 35,
  post_like: 15,
  link_click: 12,
  self_report: 12,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 最後の接触からの経過で減衰させた、現在の強さ（0〜100）。
 * 半減期モデル：経過日数が HALF_LIFE_DAYS ごとに半分になる。
 */
export function currentStrength(
  strengthAtLastContact: number,
  lastContactAt: Date,
  now: Date = new Date(),
  /** 文脈による減衰耐性（card-context.ts の decayResistance）。趣味でつながった関係は落ちにくい */
  resistance = 1
): number {
  const days = Math.max(0, (now.getTime() - lastContactAt.getTime()) / DAY_MS);
  const halfLife = HALF_LIFE_DAYS * Math.max(0.1, resistance);
  const decayed = strengthAtLastContact * Math.pow(0.5, days / halfLife);
  return Math.max(0, Math.min(MAX_STRENGTH, decayed));
}

/** 接触があったときの新しい強さ。上限 100 を超えない */
export function applyContact(
  strengthAtLastContact: number,
  lastContactAt: Date,
  kind: ContactKind,
  now: Date = new Date()
): number {
  const base = currentStrength(strengthAtLastContact, lastContactAt, now);
  return Math.min(MAX_STRENGTH, base + CONTACT_GAIN[kind]);
}

export function isAlive(strength: number): boolean {
  return strength >= ALIVE_THRESHOLD;
}

/** 画面に出す4段階。数字そのものは出さない（相手を点数で見せないため） */
export type RelationState = { code: "strong" | "warm" | "fading" | "cold"; label: string; hint: string };

export function relationState(strength: number): RelationState {
  if (strength >= 70) return { code: "strong", label: "つながっている", hint: "最近やり取りがあります。" };
  if (strength >= ALIVE_THRESHOLD) return { code: "warm", label: "ゆるくつながっている", hint: "そろそろ一度ご連絡を。" };
  if (strength >= 5) return { code: "fading", label: "薄れています", hint: "しばらくやり取りがありません。" };
  return { code: "cold", label: "切れかけています", hint: "交換しただけの状態です。" };
}

/**
 * 有効枚数＝生きている関係の数。**これがその人の人脈の実力**。
 * 枚数だけ多くて交流が無い人は、ここが伸びない。
 */
export function effectiveCount(strengths: number[]): number {
  return strengths.filter(isAlive).length;
}

/**
 * 何も接触しなかった場合に、交換から「切れかけ」になるまでの日数。
 * 文言や通知の間隔を決めるのに使う。
 */
export function daysUntilCold(strength = MAX_STRENGTH): number {
  return Math.ceil(HALF_LIFE_DAYS * (Math.log(ALIVE_THRESHOLD / strength) / Math.log(0.5)));
}
