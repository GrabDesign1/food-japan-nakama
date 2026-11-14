import { VENUES } from "@/lib/sponsor";

/**
 * 「どこで会ったか」の既定値を、サミットの会期から決める。
 *
 * ⚠️ **この機能の主戦場は会期中ではなく、会期が明けたあと**（ユーザー指示 2026-11-14）。
 *    会場では紙の名刺交換が起きる。それは止められないし、止める必要もない。
 *    NAKAMA の役目は「**あの時会った人と、あとからつながり直す**」ほう。
 *    サミット自身が掲げている「Summitで出会い、NAKAMAでつながり続け、
 *    次回のSummitで成果を発表する」と同じ考え方。
 *
 * ⚠️ だから会期の**あと**にも、しばらくは会期名を既定にする（AFTER_DAYS）。
 *    11/18に会って11/25に交換した人も「宮崎で会った」で正しい。
 */

type Window = { label: string; start: Date; end: Date };

/** 会期前から何日分を「これから会う」とみなすか */
const BEFORE_DAYS = 3;
/** 会期後から何日分を「あの時会った」とみなすか。**ここが主戦場なので長めに取る** */
const AFTER_DAYS = 45;

const DAY = 24 * 60 * 60 * 1000;

/**
 * ⚠️ 日付は VENUES の文字列ではなくここで持つ（VENUES は表示用の和文なので機械で読めない）。
 *    会期が変わったら **VENUES と両方**直すこと。
 */
const SUMMITS: Window[] = [
  {
    label: `FOOD JAPAN SUMMIT 2026 宮崎（${VENUES.miyazaki.venue}）`,
    start: new Date("2026-11-17T00:00:00+09:00"),
    end: new Date("2026-11-18T23:59:59+09:00"),
  },
  {
    label: `FOOD JAPAN SUMMIT 2026 名古屋（${VENUES.nagoya.venue}）`,
    start: new Date("2026-12-15T00:00:00+09:00"),
    end: new Date("2026-12-16T23:59:59+09:00"),
  },
];

/**
 * いま既定にすべき「出会った場」。該当が無ければ null。
 *
 * ⚠️ 会期後の枠を45日取っているので、**宮崎の枠と名古屋の枠が重なる**。
 *    先に一致したほうを返すと、12月に入っても宮崎が出てしまう（実測して発覚・2026-11-14）。
 *    一致した中から**いまに近いほう**を選ぶこと。
 */
export function defaultMetAt(now: Date = new Date()): string | null {
  const t = now.getTime();
  const matches = SUMMITS.filter(
    (s) => t >= s.start.getTime() - BEFORE_DAYS * DAY && t <= s.end.getTime() + AFTER_DAYS * DAY
  );
  if (matches.length === 0) return null;

  const distance = (s: Window) =>
    t < s.start.getTime() ? s.start.getTime() - t : t > s.end.getTime() ? t - s.end.getTime() : 0;

  return matches.reduce((best, s) => (distance(s) < distance(best) ? s : best)).label;
}

/** 会期そのものの最中か（会場向けの案内を出すかの判定） */
export function isDuringSummit(now: Date = new Date()): boolean {
  return SUMMITS.some((s) => now >= s.start && now <= s.end);
}
