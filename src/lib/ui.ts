// アプリ全体のボタン規格（角丸・余白・文字サイズ・色を統一）。
// className として使う。<button> でも <Link>/<a> でも共通で使える。
//
// 使い方:
//   import { btn } from "@/lib/ui";
//   <button className={btn("primary")}>保存する</button>
//   <Link className={btn("secondary", "sm")}>編集</Link>

type Variant = "primary" | "action" | "amber" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

// 共通の土台
const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-60";

// サイズ（余白・文字サイズ）
const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-[13px]",
  md: "px-5 py-2.5 text-[14px]",
  lg: "px-6 py-3 text-[15px]",
};

// 種類（配色）
const variants: Record<Variant, string> = {
  // 主アクション（緑塗り）
  primary: "bg-[var(--green)] text-white hover:bg-[var(--green-d)] shadow-sm hover:shadow",
  // 赤みのあるオレンジ（提案・問い合わせなど、行動を促す最重要CTA。2026-08-11 追加）
  action: "bg-[var(--action)] text-white hover:bg-[var(--action-d)] shadow-sm hover:shadow",
  // 山吹色（買いたい・課金など、緑の主アクションと区別したいもの）
  amber: "bg-[var(--amber)] text-white hover:bg-[var(--amber-d)] shadow-sm hover:shadow",
  // 副アクション（白・枠線）
  secondary:
    "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--green)] hover:text-[var(--green-d)]",
  // 破壊的（削除・停止など）
  danger:
    "border border-[#E7C7BE] bg-white text-[var(--red)] hover:bg-[var(--red-soft)]",
  // 枠なしテキストボタン
  ghost: "text-[var(--green-d)] hover:bg-[var(--green-soft)]",
};

export function btn(variant: Variant = "primary", size: Size = "md"): string {
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

// ── 入力欄の規格（角丸・枠線・余白・文字サイズを統一）───────────
// 使い方:
//   import { input } from "@/lib/ui";
//   <input className={input()} />                     … 既定（14px）
//   <select className={`${input("sm")} w-[200px]`} />  … 幅やレイアウトは後ろに足す
//   <input className={input("xs")} />                  … 表の中の数値入力
//
// 枠線と背景を自前で出し分けたい場合（未入力ハイライト等）は inputBare を使い、
// border / bg を呼び出し側で足す。
type InputSize = "xs" | "sm" | "md";

const inputBase =
  "rounded-md text-[var(--ink)] outline-none focus:border-[var(--green)] disabled:opacity-60";

const inputSizes: Record<InputSize, string> = {
  xs: "px-2 py-1 text-[12px]",
  sm: "px-3 py-1.5 text-[13px]",
  md: "px-3 py-2 text-[14px]",
};

// 既定の見た目（白地・薄い罫線）
const inputSkin = "border border-[var(--line)] bg-white";

export function input(size: InputSize = "md"): string {
  return `${inputBase} ${inputSizes[size]} ${inputSkin}`;
}

// 枠線・背景なし（呼び出し側で border / bg を指定する用）
export function inputBare(size: InputSize = "md"): string {
  return `${inputBase} ${inputSizes[size]}`;
}

// ── 見出しの階層（全ページ共通）─────────────────────────
// 使い方: <h1 className={h1Cls}>…</h1>
//   レイアウト（mb-*, flex, gap 等）が要る場合は後ろに足す:
//   <h2 className={`${h2Cls} mb-3 flex items-center gap-2`}>…</h2>
//
// eyebrow : ページ上の小ラベル（DASHBOARD / MEMBER PROFILE 等）
// h1Cls   : ページタイトル（各ページに1つ）
// h2Cls   : セクション見出し
// h3Cls   : サブ見出し（セクション内の小見出し・テーブル見出し）
export const eyebrowCls = "text-[10px] tracking-[0.2em] text-[var(--muted)]";
export const h1Cls = "font-serif text-[22px] text-[var(--ink)]";
export const h2Cls = "font-serif text-[18px] text-[var(--ink)]";
export const h3Cls = "text-[15px] font-semibold text-[var(--ink)]";

// h2FormCls : フォームの章見出しと、確認・プレビュー系モーダルのタイトル。
//   ページのセクション見出し（h2Cls＝serif 18px）とは別系統で、
//   入力欄が密集する場所では明朝18pxが重くなるためゴシック16px太字を使う。
//   会員ゾーンと共通コンポーネント用（公開ページは別のタイプスケール）。
export const h2FormCls = "text-[16px] font-bold text-[var(--ink)]";
