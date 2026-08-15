// 事務局（管理画面）だけの見た目の規格（2026-08-16）。
//
// なぜ別に持つか：管理画面は「短時間に多くを見て、さばく」画面なので、
// 会員向け画面（明朝の見出し・広い余白・大きめのカード）とは必要な密度が違う。
// **`src/lib/ui.ts` と `globals.css` は触らないこと**（会員画面に波及するため）。
// 色は既存のCSS変数を使い、管理画面用のグレーだけここで足している。
//
// ⚠️ Tailwind はソースの文字列をそのまま探すので、**クラス名は必ずリテラルで書く**こと
//（`border-[${COLOR}]` のような組み立て方をするとCSSが生成されない）。
//   地の色 #F4F5F7 ／ 枠線 #E3E6E8 ／ 表の薄い罫線 #EDF0F2 ／ ホバー #F7F9FA ／ 表の見出し #FAFBFC

// ── 文字 ───────────────────────────────
/** ページ見出し（管理画面はゴシック。会員画面の明朝と分ける） */
export const aH1 = "text-[20px] font-bold leading-tight text-[var(--ink)]";
/** セクション見出し */
export const aH2 = "text-[14px] font-bold text-[var(--ink)]";
/** 小見出し・ラベル */
export const aLabel = "text-[11px] font-medium text-[var(--muted)]";
/** ページ名の上の小文字 */
export const aEyebrow = "text-[10px] font-medium tracking-[0.14em] text-[var(--muted)]";
/** 補足文 */
export const aNote = "text-[12px] leading-6 text-[var(--muted)]";

// ── 面 ───────────────────────────────
/** 白いカード（角丸は小さめ＝管理画面らしく） */
export const aCard = "rounded-[6px] border border-[#E3E6E8] bg-white";
/** カードの中身の余白 */
export const aCardBody = "px-4 py-3.5";
/** カードの見出し行（下に罫線） */
export const aCardHead = "flex flex-wrap items-center gap-2 border-b border-[#E3E6E8] px-4 py-2.5";

// ── 表 ───────────────────────────────
export const aTable = "w-full border-collapse text-[13px]";
export const aTh =
  "whitespace-nowrap border-b border-[#E3E6E8] bg-[#FAFBFC] px-3 py-2 text-left text-[11px] font-medium text-[var(--muted)]";
export const aTd = "border-b border-[#EDF0F2] px-3 py-2.5 align-middle";
export const aTr = "transition hover:bg-[#F7F9FA]";

// ── バッジ ───────────────────────────────
type Tone = "neutral" | "green" | "amber" | "red" | "orange" | "gold" | "blue";

const badgeTones: Record<Tone, string> = {
  neutral: "bg-[#EEF1F3] text-[var(--ink-2)]",
  green: "bg-[var(--green-soft)] text-[var(--green-d)]",
  amber: "bg-[var(--amber-soft)] text-[var(--amber-ink)]",
  red: "bg-[var(--red-soft)] text-[var(--red)]",
  orange: "bg-[var(--orange-soft)] text-[#9a6a08]",
  gold: "bg-[#F7EED9] text-[var(--gold-d)]",
  blue: "bg-[#E8F1FA] text-[#2E6C9E]",
};

/** 状態バッジ（小さく・角丸4px・淡い地。表の行の高さを増やさない大きさ） */
export function aBadge(tone: Tone = "neutral"): string {
  return `inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ${badgeTones[tone]}`;
}

// ── タブ（画面の移動。ボタンを並べるより視線が散らない）─────────
export const aTabBar = "flex flex-wrap items-center gap-x-1 gap-y-1 border-b border-[#E3E6E8]";
export const aTab =
  "rounded-t-[4px] border border-transparent px-3 py-2 text-[12px] font-medium text-[var(--ink-2)] transition hover:bg-white hover:text-[var(--green-d)]";
export const aTabCurrent =
  "-mb-px rounded-t-[4px] border border-[#E3E6E8] border-b-white bg-white px-3 py-2 text-[12px] font-bold text-[var(--ink)]";

/** 表・カードの中の控えめなリンク */
export const aLink =
  "text-[var(--green-d)] underline decoration-[#B9CFC0] underline-offset-2 hover:decoration-[var(--green-d)]";
