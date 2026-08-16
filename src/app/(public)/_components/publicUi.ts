// 公開ページ共通の見た目の規格（2026-08-16）。
// 出典＝相談ファイル/CloudCode_NAKAMA_全画面共通UI設計書_20260816.md の §4（色・余白・文字）と §6（共通コンポーネント）。
//
// 使い方：公開ページ（(public) 配下）はこの定数を使う。個別ページでサイズや色を直書きしない。
// ⚠️ Tailwind はソースの文字列をそのまま探すので、**クラス名は必ずリテラルで書く**
//（`text-[${SIZE}]` のような組み立て方をするとCSSが生成されない）。
//
// 色（設計書 §4）
//   基本文字・濃色背景 #182019 ／ 深緑 #49634F ／ 生成り #F4F0E6
//   アクセント黄緑 #DCE969 ／ 補助文字 #687067 ／ 線 #CFD1C8
// ※ 会員ゾーン（(app) 配下）は従来の CSS変数（--green など）のまま。ここは公開ページ専用。

// ── 面（背景）───────────────────────────────
export const pBgInk = "bg-[#182019]"; // 濃色（ヒーロー・費用など）
export const pBgGreen = "bg-[#49634F]"; // 深緑（最終CTA）
export const pBgPaper = "bg-[#F4F0E6]"; // 生成り
export const pBgWhite = "bg-white";

// ── レイアウト（設計書 §4 余白と文字）───────────────
/** 最大1200px・左右余白はPCで画面幅の5%以上、モバイル22px以上 */
export const pContainer = "mx-auto w-full max-w-[1200px] px-[22px] sm:px-8 lg:px-[5vw]";
/** 読み物のように1カラムで読ませる場所（文章・FAQ・チェックリスト） */
export const pContainerNarrow = "mx-auto w-full max-w-[900px] px-[22px] sm:px-8 lg:px-[5vw]";
/** ヒーローだけ広く使う場合（文字組みを保ったまま写真を見せる） */
export const pContainerWide = "mx-auto w-full max-w-[1440px] px-[22px] sm:px-8 lg:px-[5vw]";
/** セクション上下余白：モバイル64〜80px／PC96〜120px */
export const pSection = "py-[64px] sm:py-[80px] lg:py-[112px]";

// ── 文字（設計書 §4）───────────────────────────
/** h1：PC64〜88px・モバイル42〜52px。幅に応じて伸縮させ、意図した改行位置を保つ */
export const pH1 =
  "text-[42px] font-bold leading-[1.15] tracking-[0.01em] sm:text-[52px] lg:text-[clamp(56px,4.4vw,84px)]";
/** h2：PC44〜60px・モバイル32〜40px */
export const pH2 = "text-[32px] font-bold leading-[1.3] sm:text-[40px] lg:text-[clamp(44px,3.4vw,60px)]";
/** h3：カード・項目の見出し */
export const pH3 = "text-[17px] font-bold leading-[1.6] sm:text-[18px]";
/** 英字ラベル：10〜11px・太字・広い字間 */
export const pEyebrow = "text-[10px] font-bold tracking-[0.24em] sm:text-[11px]";
/** 本文：モバイル14〜16px・PC16〜17px */
export const pBody = "text-[15px] leading-[2] sm:text-[16px] lg:text-[17px]";
/** 補足・注記 */
export const pNote = "text-[13px] leading-[2] sm:text-[14px]";

// 文字色（地の色に合わせて選ぶ）
export const pInk = "text-[#182019]";
export const pInkOnDark = "text-[#F4F0E6]";
export const pMuted = "text-[#687067]";
export const pMutedOnDark = "text-[#AEBBAC]";
export const pLime = "text-[#DCE969]";
export const pLine = "border-[#CFD1C8]";
export const pLineOnDark = "border-[#3A453B]";

// ── ボタン（設計書 §6）───────────────────────────
// 主＝濃色または黄緑の塗り。副＝枠線のみ。高さ44〜52px。角丸は小さく四角に近い。
// モバイルは幅100%（w-full sm:w-auto）を既定にする。
const btnBase =
  "inline-flex w-full items-center justify-center gap-2 rounded-[2px] px-7 py-4 text-[15px] font-bold sm:w-auto sm:px-9 sm:text-[16px]";

/** 主ボタン（濃色の上＝黄緑／明るい地の上＝濃色） */
export function pBtn(tone: "lime" | "ink" | "outline" | "outlineOnDark" = "ink"): string {
  if (tone === "lime") return `${btnBase} bg-[#DCE969] text-[#182019] hover:bg-[#E7F08D]`;
  if (tone === "outline")
    return `${btnBase} border border-[#182019] bg-transparent text-[#182019] hover:bg-[#182019] hover:text-[#F4F0E6]`;
  if (tone === "outlineOnDark")
    return `${btnBase} border border-[#8E9B8D] bg-transparent text-[#F4F0E6] hover:border-[#DCE969] hover:text-[#DCE969]`;
  return `${btnBase} bg-[#182019] text-[#F4F0E6] hover:bg-[#49634F]`;
}

/** タグ（区分・状態。小さな枠線。色だけで状態を伝えない＝必ず文字を入れる） */
export const pTag =
  "inline-flex items-center whitespace-nowrap rounded-[2px] border border-[#CFD1C8] px-2 py-1 text-[11px] font-bold text-[#49634F]";
export const pTagOnDark =
  "inline-flex items-center whitespace-nowrap rounded-[2px] border border-[#5C6B5D] px-2 py-1 text-[11px] font-bold text-[#DCE969]";
