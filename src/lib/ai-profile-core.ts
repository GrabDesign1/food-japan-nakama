// プロフィールの下書き支援のうち、**画面側と共有する定義だけ**（2026-08-14）。
// src/lib/ai.ts は AI事業者のSDKとAPIキーを読むのでクライアントから読み込めない。
//
// 台帳（売りたい）の ai-draft-core.ts と同じ役割。項目が違うだけで考え方は同一で、
// 「メモに書かれていないことは書かない・足りない項目は空文字」を守らせる。

/** プロフィールの下書き。空文字＝「メモに材料がないので書かない」。 */
export type ProfileDraft = {
  // 基本情報（タブ1）
  name: string;
  contactName: string;
  categoryL1: string;
  categoryL2: string;
  prefecture: string;
  city: string;
  postalCode: string;
  address: string;
  website: string;
  founded: string;
  size: string;
  // 事業内容（タブ2）
  description: string;
  featureText: string;
  productItems: string;
  productVolume: string;
  equipmentText: string;
  salesAreaText: string;
  logisticsText: string;
  foodlossText: string;
  // 組みたい相手（タブ3）
  collabStyle: string;
  challengeText: string;
  startTiming: string;
};

/**
 * 下書きが入る項目。`key` はフォームの input/textarea/select の name 属性と一致させること
 * （反映はこの名前でフォームの欄を探して書き込むため）。
 * `tab` は 0=基本情報 / 1=事業内容 / 2=組みたい相手。
 */
export const AI_PROFILE_FIELDS: { key: keyof ProfileDraft; label: string; tab: 0 | 1 | 2 }[] = [
  { key: "name", label: "事業者名", tab: 0 },
  { key: "contactName", label: "担当者名", tab: 0 },
  { key: "categoryL1", label: "会員種別（大分類）", tab: 0 },
  { key: "categoryL2", label: "会員種別（細分類）", tab: 0 },
  { key: "postalCode", label: "郵便番号", tab: 0 },
  { key: "prefecture", label: "都道府県", tab: 0 },
  { key: "city", label: "市区町村", tab: 0 },
  { key: "address", label: "本店所在地", tab: 0 },
  { key: "website", label: "ウェブサイト", tab: 0 },
  { key: "founded", label: "設立", tab: 0 },
  { key: "size", label: "従業員規模", tab: 0 },
  { key: "description", label: "事業紹介", tab: 1 },
  { key: "featureText", label: "強み・特徴", tab: 1 },
  { key: "productItems", label: "生産品目名", tab: 1 },
  { key: "productVolume", label: "生産量", tab: 1 },
  { key: "equipmentText", label: "設備・加工能力", tab: 1 },
  { key: "salesAreaText", label: "現在行っている販路・売り場", tab: 1 },
  { key: "logisticsText", label: "現在の困りごと", tab: 1 },
  { key: "foodlossText", label: "余っている食材や規格外品", tab: 1 },
  { key: "collabStyle", label: "組みたい相手・共創のイメージ", tab: 2 },
  { key: "challengeText", label: "解決したい課題", tab: 2 },
  { key: "startTiming", label: "共創を始めたい時期", tab: 2 },
];

/** メモの上限（台帳側と同じ）。 */
export const AI_PROFILE_MEMO_MAX = 2000;
