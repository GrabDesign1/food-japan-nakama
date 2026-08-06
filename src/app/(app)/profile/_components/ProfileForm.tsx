"use client";

import { useActionState, useState } from "react";
import { saveProfile, type ProfileState } from "../actions";
import { ImageUploader } from "./ImageUploader";
import { AvatarUploader } from "./AvatarUploader";
import { LogoUploader } from "./LogoUploader";
import {
  CATEGORY_L1,
  l2Options,
  PREFECTURES,
  SIZES,
  START_TIMINGS,
} from "@/lib/member-taxonomy";
import { btn } from "@/lib/ui";

export type MemberData = {
  name: string;
  avatarUrl: string | null;
  companyLogoUrl: string | null;
  brandLogoUrl: string | null;
  contactName: string | null;
  contactKana: string | null;
  categoryL1: string;
  categoryL2: string | null;
  prefecture: string | null;
  city: string | null;
  postalCode: string | null;
  address: string | null;
  website: string | null;
  founded: string | null;
  size: string | null;
  description: string | null;
  imageUrls: string[];
  featureText: string | null;
  hasLicense: boolean;
  licenseName: string | null;
  productItems: string | null;
  productVolume: string | null;
  equipmentText: string | null;
  salesAreaText: string | null;
  logisticsText: string | null;
  foodlossText: string | null;
  collabStyle: string | null;
  challengeText: string | null;
  startTiming: string | null;
};

const TABS = ["基本情報", "事業内容", "組みたい相手"] as const;

const labelCls = "flex flex-col gap-1 text-[12px] text-[var(--ink-2)]";
const inputBase =
  "rounded-md px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]";
const normalSkin = "border border-[var(--line)] bg-white";
// 未入力の重要項目を促すための淡い黄色ハイライト
const guideSkin = "border border-[#E7D9A6] bg-[#FEFBF0]";
const inputCls = `${inputBase} ${normalSkin}`;

// 記入を促したい項目と、それが属するタブ（アドバイス＆ハイライト用）
const GUIDE_FIELDS: { key: keyof MemberData; label: string; tab: number }[] = [
  { key: "name", label: "事業者名", tab: 0 },
  { key: "contactName", label: "担当者名", tab: 0 },
  { key: "categoryL1", label: "会員種別（大分類）", tab: 0 },
  { key: "categoryL2", label: "会員種別（細分類）", tab: 0 },
  { key: "prefecture", label: "都道府県", tab: 0 },
  { key: "city", label: "市区町村", tab: 0 },
  { key: "postalCode", label: "郵便番号", tab: 0 },
  { key: "address", label: "住所", tab: 0 },
  { key: "description", label: "事業紹介", tab: 1 },
  { key: "featureText", label: "強み・特徴", tab: 1 },
  { key: "equipmentText", label: "設備・加工能力", tab: 1 },
  { key: "salesAreaText", label: "販路・売り場", tab: 1 },
  { key: "logisticsText", label: "現在の困りごと", tab: 1 },
  { key: "foodlossText", label: "余っている食材・規格外品", tab: 1 },
  { key: "collabStyle", label: "組みたい相手・共創のイメージ", tab: 2 },
  { key: "challengeText", label: "解決したい課題", tab: 2 },
  { key: "startTiming", label: "共創を始めたい時期", tab: 2 },
];

function isEmpty(v?: string | null) {
  return !((v ?? "").trim());
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  guide,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  guide?: boolean;
}) {
  const hl = guide && isEmpty(defaultValue);
  return (
    <label className={labelCls}>
      <span>
        {label}
        {required ? <span className="text-[var(--red)]"> ＊</span> : null}
        {hl ? <span className="ml-1 text-[11px] text-[#B77F0B]">未入力</span> : null}
      </span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={`${inputBase} ${hl ? guideSkin : normalSkin}`}
      />
    </label>
  );
}

function Area({
  label,
  name,
  defaultValue,
  placeholder,
  guide,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  guide?: boolean;
}) {
  const hl = guide && isEmpty(defaultValue);
  return (
    <label className={labelCls}>
      <span>
        {label}
        {hl ? <span className="ml-1 text-[11px] text-[#B77F0B]">未入力</span> : null}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={3}
        className={`${inputBase} ${hl ? guideSkin : normalSkin}`}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  guide,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string | null;
  guide?: boolean;
}) {
  const hl = guide && isEmpty(defaultValue);
  return (
    <label className={labelCls}>
      <span>
        {label}
        {hl ? <span className="ml-1 text-[11px] text-[#B77F0B]">未選択</span> : null}
      </span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className={`${inputBase} ${hl ? guideSkin : normalSkin}`}
      >
        <option value="">未選択</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProfileForm({ member }: { member: MemberData }) {
  const [tab, setTab] = useState(0);
  const [l1, setL1] = useState(member.categoryL1 ?? "");
  const [hasLicense, setHasLicense] = useState(member.hasLicense);
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    saveProfile,
    {}
  );

  // 未入力の重要項目（アドバイス表示用）。categoryL1は選択状態を反映。
  const missing = GUIDE_FIELDS.filter((f) =>
    f.key === "categoryL1" ? isEmpty(l1) : isEmpty(member[f.key] as string | null)
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* 記入アドバイス */}
      {missing.length > 0 ? (
        <div className="rounded-[10px] border border-[#E7D9A6] bg-[#FEFBF0] p-4">
          <div className="text-[13px] font-semibold text-[#7A5A0B]">
            あと {missing.length}項目でプロフィールが完成します
          </div>
          <p className="mt-1 text-[12px] leading-5 text-[#7A5A0B]">
            埋めるほど検索で上位に表示され、共創パートナーに見つけてもらいやすくなります。未入力の欄は黄色くハイライトしています（クリックで移動）。
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {missing.map((f) => (
              <button
                type="button"
                key={f.key}
                onClick={() => setTab(f.tab)}
                className="rounded-full border border-[#E7D9A6] bg-white px-2.5 py-1 text-[11px] font-medium text-[#7A5A0B] transition hover:bg-[#FAF0D6]"
              >
                {f.label} →
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--green-d)]">
          ✓ プロフィールはすべて入力済みです。ありがとうございます！
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-1 border-b border-[var(--line)]">
        {TABS.map((t, i) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(i)}
            className={`-mb-px border-b-2 px-4 py-2 text-[13px] ${
              tab === i
                ? "border-[var(--green)] text-[var(--green-d)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--ink-2)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 1. 基本情報 */}
      <div className={tab === 0 ? "grid grid-cols-2 gap-4" : "hidden"}>
        <div className="col-span-2 flex flex-col gap-5 border-b border-[var(--line)] pb-5">
          <AvatarUploader
            url={member.avatarUrl}
            initial={(member.name?.[0] ?? "?").toUpperCase()}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <LogoUploader kind="company" label="会社ロゴ" url={member.companyLogoUrl} />
            <LogoUploader kind="brand" label="ブランドロゴ" url={member.brandLogoUrl} />
          </div>
        </div>
        <div className="col-span-2">
          <Field
            label="事業者名"
            name="name"
            defaultValue={member.name}
            placeholder="株式会社◯◯"
            required
            guide
          />
        </div>
        <Field
          label="担当者名"
          name="contactName"
          defaultValue={member.contactName}
          placeholder="宮崎 太郎"
          required
          guide
        />
        <Field
          label="担当者名（ひらがな）"
          name="contactKana"
          defaultValue={member.contactKana}
          placeholder="みやざき たろう"
        />

        <label className={labelCls}>
          <span>
            会員種別（大分類）<span className="text-[var(--red)]"> ＊</span>
            {isEmpty(l1) ? <span className="ml-1 text-[11px] text-[#B77F0B]">未選択</span> : null}
          </span>
          <select
            name="categoryL1"
            value={l1}
            onChange={(e) => setL1(e.target.value)}
            className={`${inputBase} ${isEmpty(l1) ? guideSkin : normalSkin}`}
          >
            <option value="">未選択</option>
            {CATEGORY_L1.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <SelectField
          label="会員種別（細分類）"
          name="categoryL2"
          options={l2Options(l1)}
          defaultValue={member.categoryL2}
          guide
        />

        <SelectField
          label="都道府県"
          name="prefecture"
          options={PREFECTURES}
          defaultValue={member.prefecture}
          guide
        />
        <Field
          label="市区町村"
          name="city"
          defaultValue={member.city}
          placeholder="宮崎市"
          guide
        />

        {/* 本店所在地 */}
        <div className="col-span-2 rounded-md border border-[var(--line)] bg-[var(--canvas)] p-4">
          <div className="mb-3 text-[12px] font-medium text-[var(--ink-2)]">
            本店所在地
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="郵便番号"
              name="postalCode"
              defaultValue={member.postalCode}
              placeholder="880-0000"
              guide
            />
            <div />
            <div className="col-span-2">
              <Field
                label="住所"
                name="address"
                defaultValue={member.address}
                placeholder="宮崎県宮崎市中央通1-2-3◯◯ビル４F"
                guide
              />
            </div>
          </div>
        </div>

        <Field
          label="Webサイト"
          name="website"
          defaultValue={member.website}
          placeholder="https://"
        />
        <Field
          label="設立"
          name="founded"
          defaultValue={member.founded}
          placeholder="2010年"
        />
        <SelectField
          label="事業規模"
          name="size"
          options={SIZES}
          defaultValue={member.size}
        />
      </div>

      {/* 2. 事業内容 */}
      <div className={tab === 1 ? "flex flex-col gap-4" : "hidden"}>
        <Area
          label="事業紹介（どんな事業をしているか）"
          name="description"
          defaultValue={member.description}
          placeholder="どんな事業をしているかを簡潔に"
          guide
        />

        <ImageUploader images={member.imageUrls} />

        <Area
          label="強み・特徴"
          name="featureText"
          defaultValue={member.featureText}
          guide
        />

        {/* 許認可 */}
        <div className="flex flex-col gap-2">
          <div className="text-[12px] text-[var(--ink-2)]">許認可</div>
          <div className="flex gap-5 text-[13px] text-[var(--ink)]">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="hasLicense"
                value="yes"
                checked={hasLicense}
                onChange={() => setHasLicense(true)}
              />
              あり
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="hasLicense"
                value="no"
                checked={!hasLicense}
                onChange={() => setHasLicense(false)}
              />
              なし
            </label>
          </div>
          {hasLicense ? (
            <input
              name="licenseName"
              defaultValue={member.licenseName ?? ""}
              placeholder="許認可名（例：食品衛生法 営業許可、HACCP認証 など）"
              className={inputCls}
            />
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="生産品目名"
            name="productItems"
            defaultValue={member.productItems}
            placeholder="リーフレタス、ネギ、ブロッコリー 等"
          />
          <Field
            label="生産量"
            name="productVolume"
            defaultValue={member.productVolume}
            placeholder="露地2ha／各品目50ケース/週 程度"
          />
        </div>

        <Area
          label="設備・加工能力"
          name="equipmentText"
          defaultValue={member.equipmentText}
          placeholder="例：真空パック、急速冷凍、HACCP対応ライン"
          guide
        />
        <Area
          label="現在行っている販路・売り場"
          name="salesAreaText"
          defaultValue={member.salesAreaText}
          guide
        />
        <Area
          label="現在の困りごと"
          name="logisticsText"
          defaultValue={member.logisticsText}
          placeholder="例：小ロットの配送先が見つからない、繁忙期の人手が足りない など"
          guide
        />
        <Area
          label="余っている食材や規格外品"
          name="foodlossText"
          defaultValue={member.foodlossText}
          guide
        />
      </div>

      {/* 3. 組みたい相手 */}
      <div className={tab === 2 ? "flex flex-col gap-4" : "hidden"}>
        <Area
          label="組みたい相手・共創のイメージ"
          name="collabStyle"
          defaultValue={member.collabStyle}
          placeholder="例：規格外の野菜を加工してくれる食品メーカーを探しています"
          guide
        />
        <Area
          label="解決したい課題"
          name="challengeText"
          defaultValue={member.challengeText}
          guide
        />
        <SelectField
          label="共創を始めたい時期"
          name="startTiming"
          options={START_TIMINGS}
          defaultValue={member.startTiming}
          guide
        />
      </div>

      {/* 保存 */}
      <div className="flex items-center gap-3 border-t border-[var(--line)] pt-4">
        <button
          type="submit"
          disabled={pending}
          className={btn("primary")}
        >
          {pending ? "保存中…" : "保存する"}
        </button>
        {state.ok ? (
          <span className="text-[12px] text-[var(--green-d)]">保存しました。</span>
        ) : null}
        {state.error ? (
          <span className="text-[12px] text-[var(--red)]">{state.error}</span>
        ) : null}
        <span className="ml-auto text-[11px] text-[var(--muted)]">
          ＊は必須。画像は選ぶとすぐ保存されます。
        </span>
      </div>
    </form>
  );
}
