// アプリ全体のボタン規格（角丸・余白・文字サイズ・色を統一）。
// className として使う。<button> でも <Link>/<a> でも共通で使える。
//
// 使い方:
//   import { btn } from "@/lib/ui";
//   <button className={btn("primary")}>保存する</button>
//   <Link className={btn("secondary", "sm")}>編集</Link>

type Variant = "primary" | "amber" | "secondary" | "danger" | "ghost";
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
  // 山吹色（買いたい・課金など、緑の主アクションと区別したいもの）
  amber: "bg-[#B77F0B] text-white hover:bg-[#9A6A08] shadow-sm hover:shadow",
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
