// 掲載文の下書き支援のうち、**画面側と共有する定義だけ**をここに置く（2026-08-14）。
// src/lib/ai.ts は AI事業者のSDKとAPIキーを読むのでクライアントから読み込めない。
// 型と定数をこちらに分けて、フォーム（"use client"）から安全に使えるようにする。

/**
 * 下書きの結果。空文字＝「メモに材料がないので書かない」（無理に埋めさせない）。
 * すべて string。タグだけはフォームの入力欄に合わせてカンマ区切りの1行で受け取る。
 */
export type OfferingDraft = {
  title: string;
  tagline: string;
  description: string;
  specification: string;
  shelfLifeText: string;
  featureDiff: string;
  backgroundStory: string;
  usageIdeas: string;
  desiredPartner: string;
  points: string;
  tags: string;
};

/**
 * 下書きが入る項目と、画面に出す見出し（フォームの並び順に合わせる）。
 * foodOnly の項目は、食品カテゴリのときしかフォームに入力欄が無いので、それ以外では出さない。
 */
export const AI_DRAFT_FIELDS: { key: keyof OfferingDraft; label: string; foodOnly?: true }[] = [
  { key: "title", label: "タイトル" },
  { key: "tagline", label: "一言で伝わる特徴" },
  { key: "description", label: "商品・原料の説明" },
  { key: "specification", label: "品質・規格", foodOnly: true },
  { key: "shelfLifeText", label: "賞味・取扱期限", foodOnly: true },
  { key: "featureDiff", label: "他の商品との違い" },
  { key: "backgroundStory", label: "生まれた背景・販売したい理由" },
  { key: "usageIdeas", label: "おすすめの使い方・売り場" },
  { key: "desiredPartner", label: "希望する相手" },
  { key: "points", label: "おすすめポイント" },
  { key: "tags", label: "タグ" },
];

/** メモの上限（これ以上は切り詰める）。長文を貼られてもコストが跳ねないように。 */
export const AI_DRAFT_MEMO_MAX = 1200;

/** タグの上限（フォームの「最大8」に合わせる）。 */
export const AI_DRAFT_TAG_MAX = 8;

/**
 * 下書きの生成を委託している事業者名。
 * 会員に送信先を明示するため画面に出す。**規約・プライバシーポリシーの記載と必ず揃えること。**
 * 事業者を替えるときは、ここと src/lib/ai.ts と規約の3か所を同時に直す。
 */
export const AI_PROVIDER_NAME = "OpenAI";
