"use client";

import { useActionState, useState } from "react";
import { saveOffering, type OfferingState } from "../actions";
import { OfferingImageUploader } from "./OfferingImageUploader";
import { OfferingSlotImage } from "./OfferingSlotImage";
import {
  CATEGORY_KEYS,
  isStructured,
  AMOUNT_UNITS,
  AMOUNT_PERIODS,
  TIMINGS,
} from "@/lib/offering-taxonomy";

export type OfferingData = {
  id: string;
  direction: string;
  category: string;
  title: string;
  description: string | null;
  points: string | null;
  tags: string[];
  amountValue: number | null;
  amountUnit: string | null;
  amountPeriod: string | null;
  amountText: string | null;
  timing: string | null;
  area: string | null;
  imageUrls: string[];
  descriptionImageUrl: string | null;
  pointsImageUrl: string | null;
};

const labelCls = "flex flex-col gap-1 text-[12px] text-[var(--ink-2)]";
const inputCls =
  "rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]";

export function OfferingForm({ offering }: { offering: OfferingData }) {
  const [category, setCategory] = useState(offering.category);
  const structured = isStructured(category);
  const save = saveOffering.bind(null, offering.id);
  const [state, formAction, pending] = useActionState<OfferingState, FormData>(
    save,
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* 画像 */}
      <OfferingImageUploader offeringId={offering.id} images={offering.imageUrls} />

      <div className="grid grid-cols-2 gap-4">
        <label className={labelCls}>
          カテゴリ（9分類）
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {CATEGORY_KEYS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          地域（一覧に表示）
          <input
            name="area"
            defaultValue={offering.area ?? ""}
            placeholder="宮崎県"
            className={inputCls}
          />
        </label>
      </div>

      <label className={labelCls}>
        <span>
          タイトル<span className="text-[var(--red)]"> ＊</span>
        </span>
        <input
          name="title"
          defaultValue={offering.title}
          placeholder="例：規格外の完熟マンゴー、加工用に譲ります"
          className={inputCls}
        />
      </label>

      {/* 数量（C案） */}
      {structured ? (
        <div>
          <div className="mb-1 text-[12px] text-[var(--ink-2)]">
            数量（食材・原料は数値で登録 → 範囲検索できます）
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
              期間
              <select
                name="amountPeriod"
                defaultValue={offering.amountPeriod ?? ""}
                className={inputCls}
              >
                <option value="">未選択</option>
                {AMOUNT_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}あたり
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
              数量
              <input
                name="amountValue"
                type="number"
                step="any"
                defaultValue={offering.amountValue ?? ""}
                placeholder="12"
                className={`${inputCls} w-28`}
              />
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
              単位
              <select
                name="amountUnit"
                defaultValue={offering.amountUnit ?? ""}
                className={inputCls}
              >
                <option value="">未選択</option>
                {AMOUNT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : (
        <label className={labelCls}>
          数量・規模（自由記述）
          <input
            name="amountText"
            defaultValue={offering.amountText ?? ""}
            placeholder="例：月20ケース / 2〜3店舗 / 1名 など"
            className={inputCls}
          />
        </label>
      )}

      <div className={labelCls}>
        詳細（本文）
        <textarea
          name="description"
          defaultValue={offering.description ?? ""}
          rows={5}
          placeholder="内容の説明。背景・状態・条件など。"
          className={inputCls}
        />
        <OfferingSlotImage
          offeringId={offering.id}
          slot="description"
          url={offering.descriptionImageUrl}
        />
      </div>

      <div className={labelCls}>
        おすすめポイント（1行に1つ）
        <textarea
          name="points"
          defaultValue={offering.points ?? ""}
          rows={3}
          placeholder={"高品質な果実の生産ノウハウがあります\n少量からでも相談可能です"}
          className={inputCls}
        />
        <OfferingSlotImage
          offeringId={offering.id}
          slot="points"
          url={offering.pointsImageUrl}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className={labelCls}>
          時期
          <select
            name="timing"
            defaultValue={offering.timing ?? ""}
            className={inputCls}
          >
            <option value="">未選択</option>
            {TIMINGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          タグ（カンマ区切り・最大8）
          <input
            name="tags"
            defaultValue={offering.tags.join(", ")}
            placeholder="規格外, 加工用, 少量可"
            className={inputCls}
          />
        </label>
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--line)] pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--green)] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[var(--green-d)] disabled:opacity-60"
        >
          {pending ? "保存中…" : "保存する"}
        </button>
        {state.ok ? (
          <span className="text-[12px] text-[var(--green-d)]">保存しました。</span>
        ) : null}
        {state.error ? (
          <span className="text-[12px] text-[var(--red)]">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
