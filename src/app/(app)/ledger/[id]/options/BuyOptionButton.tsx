"use client";

// 掲載オプションの購入ボタン。決済へ進む前に「購入内容の確認」を必ず表示する（2026-08-11）。
// 特定商取引法の最終確認画面の考え方に合わせ、分量（期間・件数）・金額・支払時期・
// 適用時期・返金条件を、決済に進む前の画面で明示する。
import { useState } from "react";
import { useActionState } from "react";
import { buyListingOption, type OptionState } from "./actions";
import { btn } from "@/lib/ui";

export function BuyOptionButton({
  offeringId,
  code,
  label,
  productName,
  offeringTitle,
  amount,
  listAmount,
  durationDays,
  requiresReview,
  unitLimit,
  effectType,
}: {
  offeringId: string;
  code: string;
  label: string;
  productName: string;
  offeringTitle: string;
  amount: number;
  listAmount: number;
  durationDays: number | null;
  requiresReview: boolean;
  unitLimit: number | null;
  effectType: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<OptionState, FormData>(
    buyListingOption.bind(null, offeringId, code),
    {}
  );

  const rows: [string, string][] = [
    ["オプション", productName],
    ["対象の案件", offeringTitle || "（無題）"],
    [
      "分量",
      [
        durationDays ? `${durationDays}日間` : null,
        unitLimit && effectType === "matched_notice" ? `最大${unitLimit}件` : null,
      ]
        .filter(Boolean)
        .join("・") || "1回",
    ],
    [
      "お支払い金額",
      amount < listAmount
        ? `${amount.toLocaleString()}円（税込）※定価${listAmount.toLocaleString()}円のビジネス会員割引後`
        : `${amount.toLocaleString()}円（税込）`,
    ],
    ["お支払い時期", "この後のStripe決済画面でカード決済（即時）"],
    [
      "適用の開始",
      requiresReview
        ? "決済完了後、当社の審査を経て開始（掲載開始日をお知らせします）"
        : "決済完了後すぐに適用",
    ],
  ];

  return (
    <>
      {state.error ? <p className="mt-2 text-[12px] text-[var(--red)]">{state.error}</p> : null}
      <button type="button" onClick={() => setOpen(true)} className={`${btn("primary", "sm")} mt-3 w-full`}>
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !pending && setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="buy-option-title"
            className="relative max-h-[86vh] w-full max-w-[460px] overflow-y-auto rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-xl"
          >
            <h2 id="buy-option-title" className="text-[16px] font-bold text-[var(--ink)]">
              購入内容の確認
            </h2>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              内容をご確認のうえ、決済画面へお進みください。
            </p>

            <dl className="mt-3 overflow-hidden rounded-[10px] border border-[var(--line)]">
              {rows.map(([k, v], i) => (
                <div
                  key={k}
                  className={`flex gap-3 px-3 py-2 text-[12px] ${i > 0 ? "border-t border-[#EDF0EA]" : ""}`}
                >
                  <dt className="w-[92px] shrink-0 text-[var(--muted)]">{k}</dt>
                  <dd className="flex-1 leading-5 text-[var(--ink)]">{v}</dd>
                </div>
              ))}
            </dl>

            <ul className="mt-3 flex flex-col gap-1 text-[11px] leading-5 text-[var(--muted)]">
              <li>・有料枠には「広告」表記が付きます。自然な並び順を料金で入れ替えることはしません。</li>
              <li>・閲覧数・問い合わせ・取引の成立・売上を保証するものではありません。</li>
              <li>・適用開始後の、お客様のご都合による返金はできません（開始前はキャンセル可能）。</li>
              {requiresReview ? (
                <li>・審査の結果、適用しない場合は全額返金します。</li>
              ) : null}
              <li>
                ・詳しくは<a href="/tokushoho" target="_blank" rel="noreferrer" className="underline">特定商取引法に基づく表記</a>と
                <a href="/terms" target="_blank" rel="noreferrer" className="underline">利用規約 第7条の3</a>をご確認ください。
              </li>
            </ul>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className={btn("secondary", "sm")}
              >
                やめる
              </button>
              <form action={action}>
                <button type="submit" disabled={pending} className={`${btn("primary", "sm")} disabled:opacity-50`}>
                  {pending ? "決済画面へ移動中…" : "この内容で決済へ進む"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
