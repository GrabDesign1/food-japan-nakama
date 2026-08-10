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
  LISTING_PURPOSES,
  SAMPLE_AVAILABILITY,
  PRICE_TAX_TYPES,
  SEEKING_TYPES,
  SEEKING_TYPE_SHORT,
  REQUIREMENT_KINDS,
  REQUIREMENT_LEVELS,
  REQUIREMENT_LEVEL_LABEL,
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
  listingPurpose: string | null;
  tagline: string | null;
  featureDiff: string | null;
  backgroundStory: string | null;
  usageIdeas: string | null;
  challengeCurrent: string | null;
  challengeScale: string | null;
  challengeTried: string | null;
  challengeAsk: string | null;
  challengeValue: string | null;
  sampleAvailability: string | null;
  priceTaxType: string | null;
  // 探している（WANT）
  seekingType: string | null;
  usageContext: string | null;
  requirements: { kind: string; text: string; level: string }[];
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

// プレビューの本文ブロック（空なら非表示・3行で省略）
function PreviewBlock({ label, text }: { label: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold text-[var(--muted)]">{label}</div>
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12px] leading-5 text-[var(--ink-2)]">
        {text.trim()}
      </p>
    </div>
  );
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
  const [listingPurpose, setListingPurpose] = useState(offering.listingPurpose ?? "trade");
  const [category, setCategory] = useState(offering.category);
  const [title, setTitle] = useState(offering.title);
  const [tagline, setTagline] = useState(offering.tagline ?? "");
  const [description, setDescription] = useState(offering.description ?? "");
  const [points, setPoints] = useState(offering.points ?? "");
  const [tags, setTags] = useState(offering.tags.join(", "));
  const [featureDiff, setFeatureDiff] = useState(offering.featureDiff ?? "");
  const [backgroundStory, setBackgroundStory] = useState(offering.backgroundStory ?? "");
  const [usageIdeas, setUsageIdeas] = useState(offering.usageIdeas ?? "");
  const [desiredPartner, setDesiredPartner] = useState(offering.desiredPartner ?? "");
  const [challengeCurrent, setChallengeCurrent] = useState(offering.challengeCurrent ?? "");
  const [challengeAsk, setChallengeAsk] = useState(offering.challengeAsk ?? "");
  const [challengeValue, setChallengeValue] = useState(offering.challengeValue ?? "");
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
  // 探している（WANT）：募集タイプ・使用目的・条件リスト
  const [seekingType, setSeekingType] = useState(offering.seekingType ?? "");
  const [usageContext, setUsageContext] = useState(offering.usageContext ?? "");
  const [requirements, setRequirements] = useState<{ kind: string; text: string; level: string }[]>(
    offering.requirements ?? []
  );
  // 新規作成モード：一時アップロードした写真（保存時に案件へ紐付け）
  const [tempImages, setTempImages] = useState<string[]>([]);

  function updateRequirement(i: number, patch: Partial<{ kind: string; text: string; level: string }>) {
    setRequirements((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

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

  // プレビュー行はカテゴリに連動させる（入力欄が無い項目は表示しない）。
  // 未入力時は該当の入力欄へジャンプできるリンクを出す。
  const previewRows: { label: string; value: string | null; anchor: string }[] = [
    { label: "希望価格", value: previewPrice, anchor: "f-price" },
    { label: "提供量", value: previewAmount, anchor: "f-amount" },
    ...(isGive && food
      ? [{ label: "最小取引量", value: minOrderText || null, anchor: "f-minorder" }]
      : []),
    ...(isGive && goods
      ? [{ label: "状態", value: previewCondition, anchor: "f-condition" }]
      : []),
    { label: isGive ? "発送元" : "発送先", value: area || null, anchor: "f-area" },
    { label: "募集期限", value: previewDeadline, anchor: "f-deadline" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
      <form action={formAction} className="flex min-w-0 flex-col gap-5">
        {/* WANT: 条件リストはJSONで送る（サーバー側で検証） */}
        {!isGive ? (
          <input type="hidden" name="requirementsJson" value={JSON.stringify(requirements)} />
        ) : null}

        {/* ── 募集タイプ（探しているのみ） ── */}
        {!isGive ? (
          <div>
            <h2 className="text-[16px] font-bold text-[var(--ink)]">何を探していますか？<Req /></h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              商品名が決まっていなくても、用途や条件から募集できます。途中で変更しても入力内容は消えません。
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SEEKING_TYPES.map(([value, label, desc]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-[10px] border px-3.5 py-3 transition ${
                    seekingType === value
                      ? "border-[var(--green)] bg-[var(--green-soft)]"
                      : "border-[var(--line)] bg-white hover:border-[var(--green)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="seekingType"
                      value={value}
                      checked={seekingType === value}
                      onChange={() => setSeekingType(value)}
                      className="accent-[var(--green)]"
                    />
                    <span className={`text-[13px] font-bold ${seekingType === value ? "text-[var(--green-d)]" : "text-[var(--ink)]"}`}>
                      {label}
                    </span>
                  </span>
                  <span className="pl-6 text-[11px] leading-4 text-[var(--muted)]">{desc}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── 掲載タイプ（売りたいのみ） ── */}
        {isGive ? (
          <div>
            <h2 className="text-[16px] font-bold text-[var(--ink)]">今回、何をしたいですか？</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {LISTING_PURPOSES.map(([value, label, desc]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-[10px] border p-4 transition ${
                    listingPurpose === value
                      ? "border-[var(--green)] bg-[var(--green-soft)]"
                      : "border-[var(--line)] bg-white hover:border-[var(--green)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="listingPurpose"
                      value={value}
                      checked={listingPurpose === value}
                      onChange={() => setListingPurpose(value)}
                      className="accent-[var(--green)]"
                    />
                    <span className={`text-[14px] font-bold ${listingPurpose === value ? "text-[var(--green-d)]" : "text-[var(--ink)]"}`}>
                      {label}
                    </span>
                  </span>
                  <span className="text-[12px] leading-5 text-[var(--muted)]">{desc}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── 基本情報 ── */}
        <div className="border-t border-[var(--line)] pt-5">
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
          <label id="f-area" className={`${labelCls} scroll-mt-24`}>
            {/* 売りたい＝送り出す側なので「発送元」、探している＝受け取る側なので「発送先」 */}
            <span>
              {isGive ? "発送元・受渡地域" : "発送先・受取地域"}
              {isGive && goods ? <Req /> : <Opt />}
            </span>
            <input
              name="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder={isGive ? "例：宮崎県 宮崎市" : "例：東京都 千代田区（納品先）"}
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
            placeholder={
              isGive
                ? "例：宮崎産の柑橘を使った香り豊かなクラフトビール"
                : "例：クリスマスで使うイチゴを探している"
            }
            className={inputCls}
          />
        </label>

        {isGive ? (
          <label className={labelCls}>
            <span>一言で伝わる特徴<Opt /></span>
            <input
              name="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="例：地域の素材とストーリーを一緒に届けられるクラフトビールです"
              className={inputCls}
            />
            <span className="text-[11px] text-[var(--muted)]">一覧カードと詳細ページの冒頭に表示されます。</span>
          </label>
        ) : null}

        <div className={labelCls}>
          <span>
            {isGive ? <>この商品・原料について<Req /></> : <>何を探していますか？（詳しく）<Req /></>}
          </span>
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder={
              isGive
                ? "どのような商品・原料ですか？ 産地・製法・味わい・用途などを紹介してください。"
                : "例：クリスマスケーキの製造に使用する国産いちごを探しています。\nデコレーション用途のため、粒揃いがよく、色付き・形状が安定したものを希望しています。品種は問いませんが、ケーキに使用した際に見栄えがよく、適度な酸味と甘みがあるものを希望します。"
            }
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

        {/* ── 使用目的と条件（探しているのみ） ── */}
        {!isGive ? (
          <>
            <div id="f-usage" className={`${labelCls} scroll-mt-24`}>
              <span>使用目的・販売先<Req /></span>
              <textarea
                name="usageContext"
                value={usageContext}
                onChange={(e) => setUsageContext(e.target.value)}
                rows={13}
                placeholder={
                  "例：\n・用途：クリスマスケーキのデコレーション\n・産地：国産\n・規格：秀品〜優品相当を希望\n・サイズ：M〜L中心（粒揃い希望）\n・荷姿：パック・平詰め等、応相談\n・必要数量：1日あたり50〜100パック程度\n・納品希望：12月20日〜25日\n・納品場所：東京都内店舗\n・価格：相場を踏まえてご相談\n・継続取引：条件が合えば通常期の仕入れも検討\n\nクリスマス期間は使用量が多いため、必要数量を安定して確保したいと考えています。"
                }
                className={inputCls}
              />
              <span className="text-[11px] text-[var(--muted)]">
                何に使うかが分かると、売り手が代替案も含めて提案しやすくなります。
              </span>
            </div>

            <SectionHead
              title="条件（必須・希望・相談可能）"
              desc="条件ごとに「必須／希望／相談可能」を選べます。"
            />
            <div id="f-requirements" className="scroll-mt-24">
              <div className="flex flex-col gap-2">
                {requirements.map((r, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 rounded-[10px] border border-[var(--line)] bg-[#FAFBF9] p-3 sm:flex-row sm:items-center"
                  >
                    <select
                      value={r.kind}
                      onChange={(e) => updateRequirement(i, { kind: e.target.value })}
                      className={`${inputCls} sm:w-[130px]`}
                    >
                      {REQUIREMENT_KINDS.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <input
                      value={r.text}
                      onChange={(e) => updateRequirement(i, { text: e.target.value })}
                      placeholder="例：常温で保存できること"
                      className={`${inputCls} flex-1`}
                    />
                    <select
                      value={r.level}
                      onChange={(e) => updateRequirement(i, { level: e.target.value })}
                      className={`${inputCls} font-bold sm:w-[110px] ${
                        r.level === "must" ? "text-[var(--red)]" : r.level === "want" ? "text-[#B77F0B]" : "text-[var(--green-d)]"
                      }`}
                    >
                      {REQUIREMENT_LEVELS.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setRequirements((cur) => cur.filter((_, idx) => idx !== i))}
                      className="text-[12px] text-[var(--red)] underline"
                    >
                      削除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setRequirements((cur) => [...cur, { kind: "origin", text: "", level: "want" }])
                  }
                  className={`${btn("secondary", "sm")} w-fit`}
                >
                  ＋ 条件を追加
                </button>
                <p className="text-[11px] text-[var(--muted)]">
                  例：産地・地域「宮崎県産が望ましい」＝希望／保存方法「常温保存必須」＝必須／価格「〜500円/個で相談可」＝相談可能／支払い方法「請求書払い（振込）・PayPay・応相談」
                </p>
              </div>
            </div>
          </>
        ) : null}

        {/* ── 魅力と背景（質問に答える形式・売りたいのみ） ── */}
        {isGive ? (
          <>
            <SectionHead
              title="魅力と背景"
              desc="質問に答えるだけで、買い手に伝わる掲載ページになります。1問2〜3行でも十分です。"
            />

            <div className={labelCls}>
              <span>他の商品と何が違いますか？<Req /></span>
              <textarea
                name="featureDiff"
                value={featureDiff}
                onChange={(e) => setFeatureDiff(e.target.value)}
                rows={3}
                placeholder="例：地元産の日向夏を果皮ごと使用。香りが強く、柑橘系クラフトビールの中でも苦味が控えめです。"
                className={inputCls}
              />
            </div>

            <div className={labelCls}>
              <span>なぜこの商品を作った・販売したいのですか？<Opt /></span>
              <textarea
                name="backgroundStory"
                value={backgroundStory}
                onChange={(e) => setBackgroundStory(e.target.value)}
                rows={3}
                placeholder="例：規格外で出荷できない日向夏を活かすため、地元農家と一緒に開発しました。作り手の紹介もどうぞ。"
                className={inputCls}
              />
            </div>

            <div className={labelCls}>
              <span>どのような売り場・料理・用途に合いますか？<Req /></span>
              <textarea
                name="usageIdeas"
                value={usageIdeas}
                onChange={(e) => setUsageIdeas(e.target.value)}
                rows={3}
                placeholder="例：地元食材を扱う飲食店のペアリング、ホテルのミニバー、ふるさとギフト、イベントでの提供など。"
                className={inputCls}
              />
            </div>

            <div className={labelCls}>
              <span>どのような相手と取引したいですか？<Req /></span>
              <textarea
                name="desiredPartner"
                value={desiredPartner}
                onChange={(e) => setDesiredPartner(e.target.value)}
                rows={3}
                placeholder="例：飲食店、小売・酒販店、ホテル・観光施設、ギフト事業者、イベント主催者、共同開発したい企業など。"
                className={inputCls}
              />
            </div>

            {listingPurpose === "challenge" ? (
              <div className="flex flex-col gap-4 rounded-[10px] border border-[#E7D9A6] bg-[#FFFBF0] p-4">
                <div>
                  <div className="text-[13px] font-bold text-[#7A5A0B]">課題について教えてください</div>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    背景が伝わると、協力したい相手が動きやすくなります。
                  </p>
                </div>
                <div className={labelCls}>
                  <span>いま、どのような課題が起きていますか？<Req /></span>
                  <textarea
                    name="challengeCurrent"
                    value={challengeCurrent}
                    onChange={(e) => setChallengeCurrent(e.target.value)}
                    rows={3}
                    placeholder="例：ビール製造のたびに麦芽粕が週200kg発生し、大半を有償で廃棄しています。"
                    className={inputCls}
                  />
                </div>
                <div className={labelCls}>
                  <span>課題の規模や期限はどのくらいですか？<Opt /></span>
                  <textarea
                    name="challengeScale"
                    defaultValue={offering.challengeScale ?? ""}
                    rows={2}
                    placeholder="例：年間約10t。廃棄費用は年間約50万円。通年で発生します。"
                    className={inputCls}
                  />
                </div>
                <div className={labelCls}>
                  <span>これまでに試したことはありますか？<Opt /></span>
                  <textarea
                    name="challengeTried"
                    defaultValue={offering.challengeTried ?? ""}
                    rows={2}
                    placeholder="例：近隣の畜産農家へ飼料として少量提供。ただし水分が多く運搬がネックでした。"
                    className={inputCls}
                  />
                </div>
                <div className={labelCls}>
                  <span>どのような協力・提案を求めていますか？<Req /></span>
                  <textarea
                    name="challengeAsk"
                    value={challengeAsk}
                    onChange={(e) => setChallengeAsk(e.target.value)}
                    rows={3}
                    placeholder="例：菓子・パン・発酵食品などへの加工パートナー。小規模な試作からの相談も歓迎です。"
                    className={inputCls}
                  />
                </div>
                <div className={labelCls}>
                  <span>解決できると、誰にどのような価値が生まれますか？<Req /></span>
                  <textarea
                    name="challengeValue"
                    value={challengeValue}
                    onChange={(e) => setChallengeValue(e.target.value)}
                    rows={3}
                    placeholder="例：廃棄コストの削減に加え、地域の食品ロス削減と新商品づくりにつながります。"
                    className={inputCls}
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {/* ── 価格と数量 ── */}
        <SectionHead
          title={isGive ? "価格と数量" : "希望条件と数量"}
          desc={isGive ? "買い手が最初に確認する条件です。未確定の場合は「応相談」を選べます。" : undefined}
        />

        <div id="f-price" className="scroll-mt-24">
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
                <select name="priceTaxType" defaultValue={offering.priceTaxType ?? ""} className={inputCls}>
                  <option value="">税区分</option>
                  {PRICE_TAX_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
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
          <div id="f-amount" className="scroll-mt-24">
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
          <label id="f-amount" className={`${labelCls} scroll-mt-24`}>
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
            <label id="f-minorder" className={`${labelCls} scroll-mt-24`}>
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
            <label id="f-condition" className={`${labelCls} scroll-mt-24`}>
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
          <label id="f-deadline" className={`${labelCls} scroll-mt-24`}>
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
              <label className={labelCls}>
                <span>サンプル提供<Opt /></span>
                <select name="sampleAvailability" defaultValue={offering.sampleAvailability ?? ""} className={inputCls}>
                  <option value="">未選択</option>
                  {SAMPLE_AVAILABILITY.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : null}

        {/* ── アピール・タグ ── */}
        <SectionHead title="アピール" />
        <div className={labelCls}>
          {/* 売りたい＝商品の推しどころ、探している＝自社の特徴（売り手が取引したくなる理由） */}
          {isGive ? "おすすめポイント（1行に1つ）" : "うちの特徴（1行に1つ）"}
          <textarea
            name="points"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            rows={3}
            placeholder={
              isGive
                ? "高品質な果実の生産ノウハウがあります\n少量からでも相談可能です"
                : "毎年クリスマスになるとケーキに使ういちごが不足しています\nはじめてのお取引から再発注につながる可能性もございます"
            }
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
            value={tags}
            onChange={(e) => setTags(e.target.value)}
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

      {/* ── 相手からの見え方（ライブプレビュー） ── */}
      <aside className="h-fit rounded-[12px] border border-[var(--line)] bg-white p-5 lg:sticky lg:top-20">
        <h2 className="text-[15px] font-bold text-[var(--ink)]">
          {isGive ? "買い手からの見え方" : "売り手からの見え方"}
        </h2>
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
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted)]">
          <span
            className={`rounded px-1.5 py-0.5 font-bold text-white ${
              isGive ? "bg-[var(--green)]" : "bg-[#B77F0B]"
            }`}
          >
            {isGive ? "売りたい" : "探している"}
          </span>
          {isGive && listingPurpose === "challenge" ? (
            <span className="rounded bg-[#FAF0D6] px-1.5 py-0.5 font-bold text-[#B77F0B]">課題解決</span>
          ) : null}
          {!isGive && seekingType ? (
            <span className="rounded bg-[#FAF0D6] px-1.5 py-0.5 font-bold text-[#B77F0B]">
              {SEEKING_TYPE_SHORT[seekingType] ?? seekingType}
            </span>
          ) : null}
          <span>{meta?.icon} {category}</span>
        </div>
        <div className="mt-1 line-clamp-2 text-[14px] font-semibold leading-5 text-[var(--ink)]">
          {title || "（タイトル未入力）"}
        </div>
        {tagline.trim() ? (
          <div className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-[var(--ink-2)]">{tagline.trim()}</div>
        ) : null}
        <dl className="mt-3 border-t border-[var(--line)]">
          {previewRows.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-3 border-b border-[#EDF0EA] py-2">
              <dt className="shrink-0 text-[12px] text-[var(--muted)]">{r.label}</dt>
              <dd className="m-0 text-right text-[12px] font-bold">
                {r.value ? (
                  <span className="text-[var(--ink)]">{r.value}</span>
                ) : (
                  <a href={`#${r.anchor}`} className="font-bold text-[var(--green-d)] underline">
                    入力する →
                  </a>
                )}
              </dd>
            </div>
          ))}
        </dl>
        {/* 本文プレビュー（実際の詳細ページと同じ並び） */}
        <PreviewBlock label={isGive ? "この商品・原料について" : "探しているもの"} text={description} />
        {!isGive ? (
          <>
            {usageContext.trim() ? (
              <PreviewBlock label="使用目的・販売先" text={usageContext} />
            ) : (
              <div className="mt-3">
                <div className="text-[11px] font-bold text-[var(--muted)]">使用目的・販売先</div>
                <a href="#f-usage" className="text-[12px] font-bold text-[var(--green-d)] underline">
                  入力する →
                </a>
              </div>
            )}
            {requirements.filter((r) => r.text.trim()).length ? (
              <div className="mt-3">
                <div className="text-[11px] font-bold text-[var(--muted)]">条件</div>
                <ul className="mt-1 flex flex-col gap-1">
                  {requirements
                    .filter((r) => r.text.trim())
                    .slice(0, 6)
                    .map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12px] leading-5 text-[var(--ink-2)]">
                        <span
                          className={`mt-0.5 shrink-0 rounded px-1 py-0.5 text-[10px] font-bold ${
                            r.level === "must"
                              ? "bg-[#FBF1EE] text-[var(--red)]"
                              : r.level === "want"
                                ? "bg-[#FAF0D6] text-[#B77F0B]"
                                : "bg-[var(--green-soft)] text-[var(--green-d)]"
                          }`}
                        >
                          {REQUIREMENT_LEVEL_LABEL[r.level] ?? r.level}
                        </span>
                        <span>{r.text.trim()}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
        {isGive ? (
          <>
            <PreviewBlock label="特徴・こだわり" text={featureDiff} />
            <PreviewBlock label="生まれた背景・販売したい理由" text={backgroundStory} />
            {listingPurpose === "challenge" &&
            (challengeCurrent.trim() || challengeAsk.trim() || challengeValue.trim()) ? (
              <div className="mt-3 rounded-[8px] border border-[#E7D9A6] bg-[#FFFBF0] p-2.5">
                <div className="text-[11px] font-bold text-[#7A5A0B]">いま起きている課題と、求めている協力</div>
                <div className="mt-1 flex flex-col gap-2">
                  {(
                    [
                      ["課題", challengeCurrent],
                      ["求める協力", challengeAsk],
                      ["解決後の価値", challengeValue],
                    ] as [string, string][]
                  )
                    .filter(([, v]) => v.trim())
                    .map(([k, v]) => (
                      <div key={k}>
                        <div className="text-[10px] font-bold text-[#7A5A0B]">{k}</div>
                        <p className="line-clamp-3 whitespace-pre-wrap text-[12px] leading-5 text-[var(--ink-2)]">
                          {v.trim()}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
            <PreviewBlock label="おすすめの使い方・売り場" text={usageIdeas} />
          </>
        ) : null}

        {/* おすすめポイント */}
        {points
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean).length ? (
          <div className="mt-3">
            <div className="text-[11px] font-bold text-[var(--muted)]">
              {isGive ? "おすすめポイント" : "うちの特徴"}
            </div>
            <ul className="mt-1 flex flex-col gap-1">
              {points
                .split("\n")
                .map((p) => p.trim())
                .filter(Boolean)
                .slice(0, 4)
                .map((p) => (
                  <li key={p} className="flex gap-1.5 text-[12px] leading-5 text-[var(--ink-2)]">
                    <span className="shrink-0 text-[var(--green-d)]">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {isGive ? <PreviewBlock label="希望する相手" text={desiredPartner} /> : null}

        {/* タグ */}
        {tags.trim() ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags
              .split(/[,、\s]+/)
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 8)
              .map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--ink-2)]"
                >
                  #{t}
                </span>
              ))}
          </div>
        ) : null}

        <p className="mt-3 rounded-[8px] bg-[var(--green-soft)] p-3 text-[11px] leading-5 text-[var(--ink-2)]">
          価格・量・状態・時期・場所・受け渡しが揃うと、買い手が問い合わせを判断しやすくなります。
        </p>
      </aside>
    </div>
  );
}
