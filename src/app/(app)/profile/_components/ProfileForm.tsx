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

const TABS = ["基本情報", "事業内容", "組みたい相手", "検索タグ"] as const;

const labelCls = "flex flex-col gap-1 text-[12px] text-[var(--ink-2)]";
const inputCls =
  "rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]";

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className={labelCls}>
      <span>
        {label}
        {required ? <span className="text-[var(--red)]"> ＊</span> : null}
      </span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputCls}
      />
    </label>
  );
}

function Area({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className={labelCls}>
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={3}
        className={inputCls}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string | null;
}) {
  return (
    <label className={labelCls}>
      {label}
      <select name={name} defaultValue={defaultValue ?? ""} className={inputCls}>
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

  return (
    <form action={formAction} className="flex flex-col gap-5">
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
          />
        </div>
        <Field
          label="担当者名"
          name="contactName"
          defaultValue={member.contactName}
          placeholder="宮崎 太郎"
          required
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
          </span>
          <select
            name="categoryL1"
            value={l1}
            onChange={(e) => setL1(e.target.value)}
            className={inputCls}
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
        />

        <SelectField
          label="都道府県"
          name="prefecture"
          options={PREFECTURES}
          defaultValue={member.prefecture}
        />
        <Field
          label="市区町村"
          name="city"
          defaultValue={member.city}
          placeholder="宮崎市"
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
            />
            <div />
            <div className="col-span-2">
              <Field
                label="住所"
                name="address"
                defaultValue={member.address}
                placeholder="宮崎県宮崎市中央通1-2-3◯◯ビル４F"
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
        />

        <ImageUploader images={member.imageUrls} />

        <Area
          label="強み・特徴"
          name="featureText"
          defaultValue={member.featureText}
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
        />
        <Area
          label="現在行っている販路・売り場"
          name="salesAreaText"
          defaultValue={member.salesAreaText}
        />
        <Area
          label="現在の困りごと"
          name="logisticsText"
          defaultValue={member.logisticsText}
          placeholder="例：小ロットの配送先が見つからない、繁忙期の人手が足りない など"
        />
        <Area
          label="余っている食材や規格外品"
          name="foodlossText"
          defaultValue={member.foodlossText}
        />
      </div>

      {/* 3. 組みたい相手 */}
      <div className={tab === 2 ? "flex flex-col gap-4" : "hidden"}>
        <Area
          label="組みたい相手・共創のイメージ"
          name="collabStyle"
          defaultValue={member.collabStyle}
          placeholder="例：規格外の野菜を加工してくれる食品メーカーを探しています"
        />
        <Area
          label="解決したい課題"
          name="challengeText"
          defaultValue={member.challengeText}
        />
        <SelectField
          label="共創を始めたい時期"
          name="startTiming"
          options={START_TIMINGS}
          defaultValue={member.startTiming}
        />
      </div>

      {/* 4. 検索タグ（後続タスク） */}
      <div className={tab === 3 ? "block" : "hidden"}>
        <div className="rounded-md border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
          検索タグ（「出せるもの」「探しているもの」）の選択は、
          持ち寄り台帳・検索の実装（タスク4・5）に合わせて追加します。
        </div>
      </div>

      {/* 保存 */}
      <div className="flex items-center gap-3 border-t border-[var(--line)] pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--green)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--green-d)] disabled:opacity-60"
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
