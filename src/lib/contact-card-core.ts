// 取り込んだ名刺の項目定義（2026-11-21）。
//
// ⚠️ クライアントからも読み込む。サーバー専用のもの（prisma, 環境変数）を入れない。
// ⚠️ ここに並ぶのは**他人の個人情報**。画面に出すのは持ち主だけ。

/** 1項目の最大文字数。長文を貼られて費用と表示が壊れるのを防ぐ */
export const CARD_FIELD_MAX = 200;
/** メモの最大文字数 */
export const CARD_NOTE_MAX = 2000;
/** タグの最大数 */
export const CARD_TAG_MAX = 8;

/** 送信前にブラウザで縮める長辺（px）。そのままの写真を送ると費用と待ち時間が跳ねる */
export const CARD_IMAGE_LONG_EDGE = 1600;
/** 縮めたあとの上限バイト数。これを超えたら読み取りを断る */
export const CARD_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export type CardField = {
  key: string;
  label: string;
  hint?: string;
  /** スマホのキーボードを切り替える */
  inputMode?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
};

/** 確認画面に出す項目。並び順は名刺を目で追う順（名前 → 所属 → 連絡先 → 住所） */
export const CARD_FIELDS: CardField[] = [
  { key: "name", label: "お名前", autoComplete: "off" },
  { key: "nameKana", label: "ふりがな", hint: "名刺にある場合だけ" },
  { key: "company", label: "会社・団体名" },
  { key: "department", label: "部署" },
  { key: "jobTitle", label: "役職" },
  { key: "email", label: "メールアドレス", inputMode: "email" },
  { key: "phone", label: "電話番号", inputMode: "tel" },
  { key: "mobile", label: "携帯電話", inputMode: "tel" },
  { key: "website", label: "ウェブサイト", inputMode: "url" },
  { key: "postalCode", label: "郵便番号", inputMode: "tel" },
  { key: "address", label: "住所" },
];

/** お名前だけは必須。これが無いと一覧で探せない */
export const CARD_REQUIRED_KEYS = ["name"] as const;

export type ContactCardInput = Record<string, string>;

/** 読み取りの自信を画面の言葉にする */
export function confidenceNote(c: "high" | "medium" | "low"): string | null {
  if (c === "high") return null;
  if (c === "medium") return "読み取りに自信がありません。内容をお確かめください。";
  return "うまく読み取れませんでした。明るいところで撮り直すか、手で入力してください。";
}
