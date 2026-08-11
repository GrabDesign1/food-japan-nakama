"use client";

// 違反報告フォーム。判断と対応は事務局が行い、報告者への個別回答は約束しない。
import { useActionState } from "react";
import { submitViolationReport, type ReportState } from "./actions";
import { VIOLATION_KINDS } from "@/lib/violation";
import { btn } from "@/lib/ui";

export function ReportForm({ targetType, targetId }: { targetType: string; targetId: string }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(submitViolationReport, {});

  if (state.ok) {
    return (
      <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-5 text-[13px] leading-7 text-[var(--green-d)]">
        報告を受け付けました。内容は事務局で確認し、必要に応じて対応します。
        <span className="mt-1 block text-[12px] text-[var(--ink-2)]">
          対応の結果について個別のご回答は行っておりません。あらかじめご了承ください。
        </span>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-[10px] border border-[var(--line)] bg-white p-5">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />

      <div>
        <div className="text-[13px] font-bold text-[var(--ink)]">
          違反の種類<span className="ml-1 text-[var(--red)]">必須</span>
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          {VIOLATION_KINDS.map(([value, label]) => (
            <label key={value} className="flex items-start gap-2 text-[13px] text-[var(--ink-2)]">
              <input type="radio" name="kind" value={value} required className="mt-1" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-[13px] text-[var(--ink-2)]">
        詳細（任意）
        <textarea
          name="detail"
          rows={5}
          placeholder="いつ・どのようなやり取りがあったかを書いていただくと、事務局で確認しやすくなります。"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]"
        />
      </label>

      {state.error ? (
        <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">{state.error}</p>
      ) : null}

      <div>
        <button disabled={pending} className={`${btn("primary")} disabled:opacity-50`}>
          {pending ? "送信中…" : "報告する"}
        </button>
      </div>
    </form>
  );
}
