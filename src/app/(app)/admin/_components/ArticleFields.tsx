"use client";

import { input } from "@/lib/ui";

// 記事キュレーションの入力欄（追加フォームと編集モーダルで共通）。
//
// ⚠️ 追加と編集で欄がずれると「追加では入れられるのに編集で消える」事故が起きるので、
//    欄はここ1か所にまとめている。増やすときは createArticle / updateArticle の両方も直すこと。
// ⚠️ name は両方のサーバーアクションが読む値なので変えない。

const inputCls = input();
const labelCls = "flex flex-col gap-1 text-[12px] text-[var(--ink-2)]";

export type ArticleDefaults = {
  source?: string;
  url?: string;
  title?: string;
  imageUrl?: string | null;
  excerpt?: string | null;
  fromSummit?: boolean;
  publishStart?: string;
  publishEnd?: string;
};

export function ArticleFields({
  d = {},
  mode,
}: {
  d?: ArticleDefaults;
  /** add＝空欄はURLから自動取得する。edit＝自動取得しない（消したい意図を尊重するため） */
  mode: "add" | "edit";
}) {
  const auto = mode === "add" ? "（任意・空欄ならURLから自動取得）" : "";
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          出典
          <input
            name="source"
            required
            defaultValue={d.source}
            placeholder="PR TIMES / note / 日本経済新聞 など"
            className={inputCls}
            list="article-sources"
          />
          <datalist id="article-sources">
            <option value="PR TIMES" />
            <option value="note" />
            <option value="日本経済新聞" />
            <option value="その他" />
          </datalist>
        </label>
        <label className={labelCls}>
          記事URL
          <input name="url" required defaultValue={d.url} placeholder="https://prtimes.jp/..." className={inputCls} />
        </label>
      </div>

      <label className={labelCls}>
        記事タイトル{mode === "add" ? auto : ""}
        <input
          name="title"
          required={mode === "edit"}
          defaultValue={d.title}
          placeholder="例：規格外野菜のアップサイクルが加速"
          className={inputCls}
        />
      </label>

      <label className={labelCls}>
        サムネイル画像URL{auto || "（任意）"}
        <input name="imageUrl" defaultValue={d.imageUrl ?? ""} placeholder="https://.../ogp.jpg" className={inputCls} />
      </label>

      <label className={labelCls}>
        概要{auto || "（任意）"}
        <textarea name="excerpt" rows={2} defaultValue={d.excerpt ?? ""} placeholder="記事の一部・要約を1〜2行で" className={inputCls} />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          掲載開始日（任意・未設定なら即時）
          <input type="date" name="publishStart" defaultValue={d.publishStart} className={inputCls} />
        </label>
        <label className={labelCls}>
          掲載終了日（任意・未設定なら無期限）
          <input type="date" name="publishEnd" defaultValue={d.publishEnd} className={inputCls} />
        </label>
      </div>

      {/* Food Japan Summit がきっかけの取り組みなら、トップでタグを出す */}
      <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-[var(--line)] bg-white px-3 py-2.5">
        <input
          type="checkbox"
          name="fromSummit"
          defaultChecked={d.fromSummit}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--green)]"
        />
        <span className="text-[12px] leading-6 text-[var(--ink-2)]">
          <b className="text-[var(--ink)]">FoodJapanSummit共創</b>
          <span className="mt-0.5 block">
            Food Japan Summit がきっかけで生まれた取り組みの記事にチェックします。公開トップの記事カードにタグが付きます。
          </span>
        </span>
      </label>
    </>
  );
}
