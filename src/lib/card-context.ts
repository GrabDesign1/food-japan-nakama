/**
 * 出会った文脈（どこで知り合ったか）と、文脈の重なり。
 *
 * きっかけ（ユーザー指示 2026-11-06）：
 *   「仕事をいやいやこなして、おれは趣味で生きる。そんな人の仕事の関係性は正直参考にならないが、
 *     趣味で出会った人たちの関係性は強固だったりする」
 *
 * これは研究とも合う。
 *   - Roberts & Dunbar（2015, Human Nature）の18か月追跡では、関係の質の低下は
 *     努力で相殺できるが、その効き方が違った。**男性は一緒に活動すること**、
 *     女性は頻繁に話すことで低下を防いでいた。→ 共有する活動そのものが維持装置になる。
 *   - 複数の文脈にまたがる関係（multiplex tie）は、ネットワークの中で
 *     もっとも強く長持ちする部類とされる。2人が複数の期待と利益で結ばれているため。
 *
 * ⚠️ だから**職場・取引先だけで人脈を測ると、その人の本当の強い関係を取り逃がす**。
 *    文脈を持ち、文脈の数（重なり）を効かせること。
 */

export type MeetContext = {
  code: "work" | "hobby" | "school" | "local" | "family" | "event";
  label: string;
  /**
   * 自発性。自分で選んで入った場ほど高い。
   * 職場は配属で決まる（選んでいない）ので低く、趣味は自分で選んでいるので高い。
   */
  voluntariness: number;
  /** 維持のされやすさ。活動を共有する場ほど、放っておいても接触が起きる */
  maintenance: number;
};

export const MEET_CONTEXTS: MeetContext[] = [
  { code: "family", label: "家族・親族",       voluntariness: 0.3, maintenance: 0.9 },
  { code: "hobby",  label: "趣味・同好",       voluntariness: 1.0, maintenance: 0.9 },
  { code: "school", label: "学校・同期",       voluntariness: 0.5, maintenance: 0.5 },
  { code: "local",  label: "地域・まちの活動", voluntariness: 0.8, maintenance: 0.7 },
  { code: "work",   label: "仕事・取引",       voluntariness: 0.3, maintenance: 0.6 },
  { code: "event",  label: "イベントで一度",   voluntariness: 0.6, maintenance: 0.2 },
];

export function contextByCode(code: string): MeetContext | undefined {
  return MEET_CONTEXTS.find((c) => c.code === code);
}

/**
 * 文脈の重なり（multiplexity）による倍率。
 * 「取引先でもあり、釣り仲間でもある」が一番強い。
 * ⚠️ 青天井にしない。3つ以上はほぼ頭打ちにする（申告で水増しできるため）。
 */
export function multiplexBonus(contextCodes: string[]): number {
  const n = new Set(contextCodes.filter((c) => contextByCode(c))).size;
  if (n <= 1) return 1;
  if (n === 2) return 1.25;
  if (n === 3) return 1.4;
  return 1.45;
}

/**
 * 文脈から決まる「減衰のしにくさ」（0.6〜1.6）。
 * 趣味でつながった関係は、放っておいても活動で会うので落ちにくい。
 * 仕事だけの関係は、取引が終われば落ちる。
 */
export function decayResistance(contextCodes: string[]): number {
  const cs = contextCodes.map(contextByCode).filter(Boolean) as MeetContext[];
  if (cs.length === 0) return 1;
  const best = Math.max(...cs.map((c) => 0.5 * c.voluntariness + 0.5 * c.maintenance));
  // 0〜1 の指標を 0.6〜1.6 の倍率に伸ばす
  return Math.round((0.6 + best) * 100) / 100;
}
