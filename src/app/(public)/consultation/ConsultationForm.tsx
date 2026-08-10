"use client";

import { useActionState, useState } from "react";
import { submitConsultation, type ConsultationState } from "./actions";
import { btn } from "@/lib/ui";

const inputCls =
  "rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]";
const labelCls = "flex flex-col gap-1 text-[12px] text-[var(--ink-2)]";

const SERVICE_OPTIONS = [
  { value: "produce", label: "共創プロデュースを相談したい" },
  { value: "crowdfunding", label: "クラウドファンディング支援を相談したい" },
  { value: "food-loss", label: "フードロスについて相談したい" },
  { value: "project", label: "共創プロジェクトの伴走を相談したい" },
  { value: "unsure", label: "どちらが合うか相談したい" },
];
const BUDGETS = ["15万円未満", "15万〜40万円", "40万〜100万円", "100万円以上", "未定"];
const PROJECT_SUPPORT_TYPES = ["企画整理", "相手探し", "面談同席", "実証設計", "契約・事業化", "その他"];

export function ConsultationForm({
  defaultType,
  project,
}: {
  defaultType: string;
  project?: { id: string; title: string | null } | null;
}) {
  const [state, action, pending] = useActionState<ConsultationState, FormData>(submitConsultation, {});
  const [serviceType, setServiceType] = useState(
    SERVICE_OPTIONS.some((o) => o.value === defaultType) ? defaultType : ""
  );

  if (state.ok) {
    return (
      <div className="rounded-[12px] border border-[var(--green)] bg-[var(--green-soft)] p-6 text-center">
        <h2 className="font-serif text-[18px] text-[var(--green-d)]">送信しました</h2>
        <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
          受付番号：<b>{state.refNo}</b><br />
          内容を確認のうえ、担当者よりご連絡いたします。確認メールをお送りしました。
        </p>
        <p className="mt-2 text-[12px] text-[var(--muted)]">※ 送信＝受託の確約ではありません。内容を確認してご連絡します。</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-[12px] border border-[var(--line)] bg-white p-5 sm:p-6">
      {/* honeypot：人間には見えない欄。ボット対策のため入力されたら受け付けない */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <label className={labelCls}>
        相談種別<span className="text-[var(--red)]"> ＊</span>
        <select
          name="serviceType"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          required
          className={inputCls}
        >
          <option value="">選択してください</option>
          {SERVICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>会社・団体名<span className="text-[var(--red)]"> ＊</span><input name="company" required className={inputCls} /></label>
        <label className={labelCls}>お名前<span className="text-[var(--red)]"> ＊</span><input name="name" required className={inputCls} /></label>
        <label className={labelCls}>メールアドレス<span className="text-[var(--red)]"> ＊</span><input name="email" type="email" required className={inputCls} /></label>
        <label className={labelCls}>電話番号（任意）<input name="phone" className={inputCls} /></label>
        <label className={labelCls}>所在地／対象地域（任意）<input name="area" className={inputCls} /></label>
        <label className={labelCls}>業種（任意）<input name="industry" className={inputCls} /></label>
      </div>

      <label className={labelCls}>
        商品・地域資源・技術の概要<span className="text-[var(--red)]"> ＊</span>
        <textarea name="productSummary" rows={3} required className={inputCls} />
      </label>

      {serviceType === "food-loss" ? (
        <div className="flex flex-col gap-4 rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-4">
          <p className="text-[12px] font-bold text-[var(--green-d)]">
            フードロス相談の詳細（分かる範囲でご記入ください）
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>原料・食品の状態（常温／冷蔵／冷凍・鮮度など）<input name="flState" className={inputCls} /></label>
            <label className={labelCls}>成分・原材料（分かる範囲）<input name="flIngredients" className={inputCls} /></label>
            <label className={labelCls}>発生量の目安（1日・週・月あたり）<input name="flVolume" placeholder="例：1日約10kg" className={inputCls} /></label>
            <label className={labelCls}>発生する地域・場所<input name="flArea" className={inputCls} /></label>
            <label className={labelCls}>現在の処分方法と費用<input name="flCost" placeholder="例：産廃処理で月3万円" className={inputCls} /></label>
            <label className={labelCls}>安全性で気になる点（保存状態・衛生・アレルゲン等）<input name="flSafety" className={inputCls} /></label>
          </div>
          <label className={labelCls}>過去に対策・検討したことはありますか？<textarea name="flPast" rows={2} placeholder="例：飼料化を検討したが輸送費が合わなかった 等" className={inputCls} /></label>
          <label className={labelCls}>法規制などで確認済みの点・不明な点<textarea name="flLegal" rows={2} placeholder="例：飼料化に必要な手続きが分からない 等" className={inputCls} /></label>
        </div>
      ) : null}

      {serviceType === "project" ? (
        <div className="flex flex-col gap-4 rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-4">
          <p className="text-[12px] font-bold text-[var(--green-d)]">
            共創プロジェクト伴走の詳細
          </p>
          {project ? (
            <div className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[13px] text-[var(--ink)]">
              対象プロジェクト：<b>{project.title || "（無題）"}</b>
              <input type="hidden" name="projectId" value={project.id} />
            </div>
          ) : (
            <p className="text-[12px] text-[var(--ink-2)]">
              対象のプロジェクトが決まっている場合は、下の「解決したい課題」にプロジェクト名をご記入ください。
            </p>
          )}
          <label className={labelCls}>
            希望する支援
            <select name="supportType" defaultValue="" className={inputCls}>
              <option value="">選択してください</option>
              {PROJECT_SUPPORT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      ) : null}

      <label className={labelCls}>
        {serviceType === "project" ? (
          <>現在の困りごと・解決したい課題<span className="text-[var(--red)]"> ＊</span></>
        ) : (
          <>解決したい課題<span className="text-[var(--red)]"> ＊</span></>
        )}
        <textarea name="challenge" rows={3} required className={inputCls} />
      </label>
      <label className={labelCls}>希望する成果（任意）<textarea name="desiredOutcome" rows={2} className={inputCls} /></label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>希望開始時期（任意）<input name="desiredTiming" placeholder="例：3か月以内 / 未定" className={inputCls} /></label>
        <label className={labelCls}>
          想定予算（任意）
          <select name="budget" defaultValue="" className={inputCls}>
            <option value="">選択してください</option>
            {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      </div>

      <label className="flex items-start gap-2 text-[12px] text-[var(--ink-2)]">
        <input type="checkbox" name="consent" value="1" required className="mt-0.5" />
        <span>
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-[var(--green-d)] underline">プライバシーポリシー</a>
          に同意します。<span className="text-[var(--red)]">＊</span>
        </span>
      </label>

      {state.error ? <p className="text-[12px] text-[var(--red)]">{state.error}</p> : null}

      <div>
        <button disabled={pending} className={`${btn("primary", "lg")} w-full sm:w-auto`}>
          {pending ? "送信中…" : "この内容で相談する"}
        </button>
      </div>
      <p className="text-[11px] text-[var(--muted)]">送信＝受託の確約ではありません。内容を確認してご連絡します。</p>
    </form>
  );
}
