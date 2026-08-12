"use client";

// この取引について事務局へ違反を報告するモーダル。
// 別ページ（/report）へ飛ばすと、どのやり取りの話か分からなくなり戻るのも面倒なため、
// やり取りの画面のまま出す。対象（スレッド）は固定で送る。
//
// **本文は事務局にも見せない**（規約17条の通信の秘密）。報告に必要なのは対象のIDと種類・詳細だけ。
import { useActionState, useState } from "react";
import { submitViolationReport, type ReportState } from "../../../../report/actions";
import { VIOLATION_KINDS } from "@/lib/violation";
import { btn, h2FormCls, input } from "@/lib/ui";
import { useCloseOnEscape } from "@/components/useCloseOnEscape";

export function ReportModal({ threadId, otherName }: { threadId: string; otherName: string }) {
  const [open, setOpen] = useState(false);
  // Escで閉じる（キーボードだけでも閉じられるように）
  useCloseOnEscape(open, () => setOpen(false));
  const [state, formAction, pending] = useActionState<ReportState, FormData>(
    submitViolationReport,
    {}
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] text-[var(--muted)] underline hover:text-[var(--red)]"
      >
        違反報告する
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !pending && setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="relative max-h-[86vh] w-full max-w-[560px] overflow-y-auto rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-xl"
          >
            <h2 id="report-title" className={h2FormCls}>
              この取引について報告する
            </h2>
            <p className="mt-2 text-[12px] leading-6 text-[var(--ink-2)]">
              <b>{otherName}</b> とのやり取りで、気になることがあれば事務局へお知らせください。
              内容を確認し、必要に応じて当事者への確認・掲載の停止・利用の制限などを行います。
            </p>

            {state.ok ? (
              <div className="mt-4 rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-4 text-[13px] leading-6 text-[var(--ink)]">
                報告を受け付けました。事務局で確認します。
                <p className="mt-1 text-[12px] text-[var(--ink-2)]">
                  個別のご回答は行っておりません。取引の継続はご自身でご判断ください。
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={`${btn("secondary", "sm")} mt-3`}
                >
                  閉じる
                </button>
              </div>
            ) : (
              <form action={formAction} className="mt-4 flex flex-col gap-4">
                <input type="hidden" name="targetType" value="thread" />
                <input type="hidden" name="targetId" value={threadId} />

                <div>
                  <div className="text-[13px] font-bold text-[var(--ink)]">
                    どのようなことがありましたか
                    <span className="ml-1 text-[11px] text-[var(--red)]">必須</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    {VIOLATION_KINDS.map(([value, label]) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-[13px] leading-6 text-[var(--ink)] hover:bg-[var(--canvas)]"
                      >
                        <input type="radio" name="kind" value={value} required className="mt-1.5" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
                  詳しい状況（任意）
                  <textarea
                    name="detail"
                    rows={5}
                    placeholder="例：8月10日に納品予定でしたが連絡が取れず、期日を過ぎても発送されていません。"
                    className={`${input()} w-full`}
                  />
                  <span className="text-[11px] text-[var(--muted)]">
                    日付・金額・約束の内容など、分かる範囲でお書きいただくと確認が早くなります。
                    <b>やり取りの本文は事務局からは見えません</b>（通信の秘密のため）。
                  </span>
                </label>

                {state.error ? (
                  <p className="text-[12px] text-[var(--red)]">{state.error}</p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className={btn("secondary", "sm")}
                  >
                    やめる
                  </button>
                  <button disabled={pending} className={`${btn("action", "sm")} disabled:opacity-50`}>
                    {pending ? "送信中…" : "報告する"}
                  </button>
                </div>
                <p className="text-[11px] leading-5 text-[var(--muted)]">
                  個別のご回答は行っておりません。緊急の場合や被害が生じている場合は、
                  警察・消費生活センター等へもご相談ください。
                </p>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
