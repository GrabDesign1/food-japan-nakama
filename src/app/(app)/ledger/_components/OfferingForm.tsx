"use client";

// 台帳の登録・編集フォーム（2026-08-10 売りたい改善）。
// - 「基本情報」「価格と数量」「状態と提供時期」「詳しい取引条件」のセクション構成
// - カテゴリに応じて食品・物品固有の項目を切り替え
// - 右側に「買い手からの見え方」ライブプレビュー
// - id が null のときは新規作成モード（保存時に初めてDBレコードを作る。写真は保存後）
import { useActionState, useState } from "react";
import { saveOffering, createOffering, type OfferingState } from "../actions";
import { OfferingImageUploader } from "./OfferingImageUploader";
import { TempImageUploader } from "./TempImageUploader";
import { OfferingSlotImage } from "./OfferingSlotImage";
import {
  CATEGORY_KEYS,
  isStructured,
  isFoodCategory,
  isGoodsCategory,
  AMOUNT_UNITS,
  AMOUNT_PERIODS,
  TIMINGS,
  PRICE_TYPES,
  PRICE_UNITS,
  ITEM_CONDITIONS,
  STORAGE_TYPES,
  SUPPLY_FREQUENCIES,
  DELIVERY_METHODS,
  SHIPPING_BEARERS,
  categoryMeta,
} from "@/lib/offering-taxonomy";
import { btn } from "@/lib/ui";

export type OfferingData = {
  id: string | null; // null = 新規作成（保存時にレコード作成）
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
  priceType: string | null;
  priceAmount: number | null;
  priceUnit: string | null;
  minOrderText: string | null;
  itemCondition: string | null;
  storageType: string | null;
  shelfLifeText: string | null;
  specification: string | null;
  supplyFrequency: string | null;
  deliveryMethods: string[];
  shippingCostBearer: string | null;
  applicationDeadline: string | null; // YYYY-MM-DD
  desiredPartner: string | null;
};

const labelCls = "flex flex-col gap-1 text-[12px] text-[var(--ink-2)]";
const inputCls =
  "rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]";

function Req() {
  return <span className="ml-1 text-[11px] text-[var(--red)]">必須</span>;
}
function Opt() {
  return <span className="ml-1 text-[11px] text-[var(--muted)]">任意</span>;
}

function SectionHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="border-t border-[var(--line)] pt-5">
      <h2 className="text-[16px] font-bold text-[var(--ink)]">{title}</h2>
      {desc ? <p className="mt-0.5 text-[12px] text-[var(--muted)]">{desc}</p> : null}
    </div>
  );
}

export function OfferingForm({ offering }: { offering: OfferingData }) {
  const isCreate = offering.id === null;
  const isGive = offering.direction === "GIVE";

  // プレビューに使う項目は制御コンポーネントにする
  const [category, setCategory] = useState(offering.category);
  const [title, setTitle] = useState(offering.title);
  const [area, setArea] = useState(offering.area ?? "");
  const [priceType, setPriceType] = useState(offering.priceType ?? "");
  const [priceAmount, setPriceAmount] = useState(
    offering.priceAmount != null ? String(offering.priceAmount) : ""
  );
  const [priceUnit, setPriceUnit] = useState(offering.priceUnit ?? "");
  const [amountValue, setAmountValue] = useState(
    offering.amountValue != null ? String(offering.amountValue) : ""
  );
  const [amountUnit, setAmountUnit] = useState(offering.amountUnit ?? "");
  const [amountPeriod, setAmountPeriod] = useState(offering.amountPeriod ?? "");
  const [amountText, setAmountText] = useState(offering.amountText ?? "");
  const [minOrderText, setMinOrderText] = useState(offering.minOrderText ?? "");
  const [itemCondition, setItemCondition] = useState(offering.itemCondition ?? "");
  const [storageType, setStorageType] = useState(offering.storageType ?? "");
  const [deadline, setDeadline] = useState(offering.applicationDeadline ?? "");
  // 新規作成モード：一時アップロードした写真（保存時に案件へ紐付け）
  const [tempImages, setTempImages] = useState<string[]>([]);

  const structured = isStructured(category);
  const food = isFoodCategory(category);
  const goods = isGoodsCategory(category);

  const action = isCreate
    ? createOffering.bind(null, offering.direction as "GIVE" | "WANT")
    : saveOffering.bind(null, offering.id as string);
  const [state, formAction, pending] = useActionState<OfferingState, FormData>(action, {});

  // ── プレビュー表示用の整形 ──
  const previewPrice =
    priceType === "free"
      ? "無償"
      : priceType === "fixed"
        ? priceAmount
          ? `${Number(priceAmount).toLocaleString()}${priceUnit || "円"}`
          : "（金額未入力）"
        : priceType === "negotiable"
          ? priceAmount
            ? `${Number(priceAmount).toLocaleString()}${priceUnit || "円"}（応相談）`
            : "応相談"
          : null;
  const previewAmount = structured
    ? amountValue
      ? `${amountPeriod ? `${amountPeriod}あたり ` : ""}${amountValue}${amountUnit}`
      : null
    : amountText || null;
  const previewCondition = [itemCondition, storageType].filter(Boolean).join("・") || null;
  const previewDeadline = deadline
    ? `${deadline.slice(0, 4)}年${Number(deadline.slice(5, 7))}月${Number(deadline.slice(8, 10))}日まで`
    : null;
  const meta = categoryMeta(category);

  const previewRows: [string, string | null][] = [
    ["希望価格", previewPrice],
    ["提供量", previewAmount],
    ["最小取引量", minOrderText || null],
    ["状態", previewCondition],
    ["発送元", area || null],
    ["募集期限", previewDeadline],
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
      <form action={formAction} className="flex min-w-0 flex-col gap-5">
        {/* ── 基本情報 ── */}
        <div>
          <h2 className="text-[16px] font-bold text-[var(--ink)]">基本情報</h2>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">
            カテゴリに合わせて、必要な入力項目が切り替わります。
          </p>
        </div>

        {/* 画像（新規作成時は一時アップロード→保存時に自動で紐付け） */}
        {isCreate ? (
          <>
            <TempImageUploader images={tempImages} onChange={setTempImages} />
            {tempImages.map((u) => (
              <input key={u} type="hidden" name="tempImageUrls" value={u} />
            ))}
          </>
        ) : (
          <OfferingImageUploader offeringId={offering.id as string} images={offering.imageUrls} />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            <span>カテゴリ<Req /></span>
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
            <span>
              発送元・受渡地域
              {isGive && goods ? <Req /> : <Opt />}
            </span>
            <input
              name="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="例：宮崎県 宮崎市"
              className={inputCls}
            />
          </label>
        </div>

        <label className={labelCls}>
          <span>タイトル<Req /></span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：クラフトビール製造時に出る麦芽粕を活用しませんか"
            className={inputCls}
          />
        </label>

        <div className={labelCls}>
          <span>詳細説明<Req /></span>
          <textarea
            name="description"
            defaultValue={offering.description ?? ""}
            rows={5}
            placeholder="内容の説明。背景・状態・条件など。"
            className={inputCls}
          />
          {!isCreate ? (
            <OfferingSlotImage
              offeringId={offering.id as string}
              slot="description"
              url={offering.descriptionImageUrl}
            />
          ) : null}
        </div>

        {/* ── 価格と数量 ── */}
        <SectionHead
          title={isGive ? "価格と数量" : "希望条件と数量"}
          desc={isGive ? "買い手が最初に確認する条件です。未確定の場合は「応相談」を選べます。" : undefined}
        />

        <div>
          <div className="mb-1 text-[12px] text-[var(--ink-2)]">
            {isGive ? <span>希望価格<Req /></span> : <span>希望価格・予算感<Opt /></span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              name="priceType"
              value={priceType}
              onChange={(e) => setPriceType(e.target.value)}
              className={inputCls}
            >
              <option value="">未選択</option>
              {PRICE_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            {priceType !== "free" ? (
              <>
                <input
                  name="priceAmount"
                  type="number"
                  min={0}
                  step="any"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  placeholder="30"
                  className={`${inputCls} w-28`}
                />
                <select
                  name="priceUnit"
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(e.target.value)}
                  className={inputCls}
                >
                  <option value="">単位</option>
                  {PRICE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            固定価格は金額と単位が必要です。応相談は金額なしでも公開できます。
          </p>
        </div>

        {/* 数量（C案：食材・原料は構造化） */}
        {structured ? (
          <div>
            <div className="mb-1 text-[12px] text-[var(--ink-2)]">
              提供可能量{isGive && food ? <Req /> : <Opt />}
              <span className="ml-2 text-[11px] text-[var(--muted)]">数値で登録すると範囲検索できます</span>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className={labelCls}>
                期間
                <select
                  name="amountPeriod"
                  value={amountPeriod}
                  onChange={(e) => setAmountPeriod(e.target.value)}
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
              <label className={labelCls}>
                数量
                <input
                  name="amountValue"
                  type="number"
                  min={0}
                  step="any"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                  placeholder="200"
                  className={`${inputCls} w-28`}
                />
              </label>
              <label className={labelCls}>
                単位
                <select
                  name="amountUnit"
                  value={amountUnit}
                  onChange={(e) => setAmountUnit(e.target.value)}
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
            <span>数量・規模（自由記述）<Opt /></span>
            <input
              name="amountText"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="例：月20ケース / 2〜3店舗 / 1名 など"
              className={inputCls}
            />
          </label>
        )}

        {isGive && food ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              <span>最小取引量<Req /></span>
              <input
                name="minOrderText"
                value={minOrderText}
                onChange={(e) => setMinOrderText(e.target.value)}
                placeholder="例：20kgから"
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              <span>提供頻度<Req /></span>
              <select name="supplyFrequency" defaultValue={offering.supplyFrequency ?? ""} className={inputCls}>
                <option value="">未選択</option>
                {SUPPLY_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {/* ── 状態と提供時期 ── */}
        <SectionHead title="状態と提供時期" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isGive && goods ? (
            <label className={labelCls}>
              <span>商品・原料の状態<Req /></span>
              <select
                name="itemCondition"
                value={itemCondition}
                onChange={(e) => setItemCondition(e.target.value)}
                className={inputCls}
              >
                <option value="">未選択</option>
                {ITEM_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {isGive && food ? (
            <label className={labelCls}>
              <span>保存状態<Req /></span>
              <select
                name="storageType"
                value={storageType}
                onChange={(e) => setStorageType(e.target.value)}
                className={inputCls}
              >
                <option value="">未選択</option>
                {STORAGE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={labelCls}>
            <span>提供・希望時期<Opt /></span>
            <select name="timing" defaultValue={offering.timing ?? ""} className={inputCls}>
              <option value="">未選択</option>
              {TIMINGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            <span>募集期限{isGive ? <Req /> : <Opt />}</span>
            <input
              name="applicationDeadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>

        {isGive && food ? (
          <label className={labelCls}>
            <span>品質・規格<Req /></span>
            <textarea
              name="specification"
              defaultValue={offering.specification ?? ""}
              rows={3}
              placeholder="例：ビール醸造後24時間以内。水分を含むため、受け取り後は冷蔵または速やかな加工が必要です。"
              className={inputCls}
            />
          </label>
        ) : null}

        {/* ── 詳しい取引条件 ── */}
        {isGive ? (
          <>
            <SectionHead
              title="詳しい取引条件"
              desc="問い合わせ前に確認してほしい条件を入力すると、希望に合う相手とつながりやすくなります。"
            />

            {goods ? (
              <div>
                <div className="mb-1.5 text-[12px] text-[var(--ink-2)]">
                  受け渡し方法<Req />
                  <span className="ml-2 text-[11px] text-[var(--muted)]">複数選択できます</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_METHODS.map((m) => (
                    <label
                      key={m}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3.5 py-2 text-[13px] text-[var(--ink)] has-[:checked]:border-[var(--green)] has-[:checked]:bg-[var(--green-soft)] has-[:checked]:font-bold has-[:checked]:text-[var(--green-d)]"
                    >
                      <input
                        type="checkbox"
                        name="deliveryMethods"
                        value={m}
                        defaultChecked={offering.deliveryMethods.includes(m)}
                        className="accent-[var(--green)]"
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {food || goods ? (
                <label className={labelCls}>
                  <span>送料負担<Opt /></span>
                  <select
                    name="shippingCostBearer"
                    defaultValue={offering.shippingCostBearer ?? ""}
                    className={inputCls}
                  >
                    <option value="">未選択</option>
                    {SHIPPING_BEARERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {food ? (
                <label className={labelCls}>
                  <span>賞味・取扱期限<Req /></span>
                  <input
                    name="shelfLifeText"
                    defaultValue={offering.shelfLifeText ?? ""}
                    placeholder="例：製造後3日以内 / 醸造後24時間以内の引取を希望"
                    className={inputCls}
                  />
                </label>
              ) : null}
            </div>

            <label className={labelCls}>
              <span>希望する相手・活用用途<Opt /></span>
              <textarea
                name="desiredPartner"
                defaultValue={offering.desiredPartner ?? ""}
                rows={3}
                placeholder="例：飼料、菓子、パン、発酵食品などへの活用を検討できる事業者。まずは小規模な実証から相談可能です。"
                className={inputCls}
              />
            </label>
          </>
        ) : null}

        {/* ── アピール・タグ ── */}
        <SectionHead title="アピール" />
        <div className={labelCls}>
          おすすめポイント（1行に1つ）
          <textarea
            name="points"
            defaultValue={offering.points ?? ""}
            rows={3}
            placeholder={"高品質な果実の生産ノウハウがあります\n少量からでも相談可能です"}
            className={inputCls}
          />
          {!isCreate ? (
            <OfferingSlotImage
              offeringId={offering.id as string}
              slot="points"
              url={offering.pointsImageUrl}
            />
          ) : null}
        </div>
        <label className={labelCls}>
          タグ（カンマ区切り・最大8）
          <input
            name="tags"
            defaultValue={offering.tags.join(", ")}
            placeholder="規格外, 加工用, 少量可"
            className={inputCls}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
          <button type="submit" disabled={pending} className={btn("primary")}>
            {pending ? "保存中…" : isCreate ? "下書きを保存する" : "保存する"}
          </button>
          {state.ok ? <span className="text-[12px] text-[var(--green-d)]">保存しました。</span> : null}
          {state.error ? <span className="text-[12px] text-[var(--red)]">{state.error}</span> : null}
          <span className="ml-auto text-[11px] text-[var(--muted)]">
            公開は保存後、画面上部の「公開する」から
          </span>
        </div>
      </form>

      {/* ── 買い手からの見え方（ライブプレビュー） ── */}
      <aside className="h-fit rounded-[12px] border border-[var(--line)] bg-white p-5 lg:sticky lg:top-20">
        <h2 className="text-[15px] font-bold text-[var(--ink)]">買い手からの見え方</h2>
        <div className="mt-3 grid aspect-[4/3] place-items-center overflow-hidden rounded-[10px] bg-[var(--green-soft)]">
          {(isCreate ? tempImages[0] : offering.imageUrls[0]) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={isCreate ? tempImages[0] : offering.imageUrls[0]}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[36px] opacity-60">{meta?.icon ?? "📦"}</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
          <span
            className={`rounded px-1.5 py-0.5 font-bold text-white ${
              isGive ? "bg-[var(--green)]" : "bg-[#B77F0B]"
            }`}
          >
            {isGive ? "売りたい" : "買いたい"}
          </span>
          <span>{meta?.icon} {category}</span>
        </div>
        <div className="mt-1 line-clamp-2 text-[14px] font-semibold leading-5 text-[var(--ink)]">
          {title || "（タイトル未入力）"}
        </div>
        <dl className="mt-3 border-t border-[var(--line)]">
          {previewRows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-3 border-b border-[#EDF0EA] py-2">
              <dt className="shrink-0 text-[12px] text-[var(--muted)]">{k}</dt>
              <dd className={`m-0 text-right text-[12px] font-bold ${v ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                {v ?? "未入力"}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 rounded-[8px] bg-[var(--green-soft)] p-3 text-[11px] leading-5 text-[var(--ink-2)]">
          価格・量・状態・時期・場所・受け渡しが揃うと、買い手が問い合わせを判断しやすくなります。
        </p>
      </aside>
    </div>
  );
}
