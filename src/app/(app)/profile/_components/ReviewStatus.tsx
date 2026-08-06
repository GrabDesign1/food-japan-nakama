"use client";

import { useActionState } from "react";
import { submitProfile, type ProfileState } from "../actions";

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "下書き", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
  PENDING: { label: "審査中", cls: "bg-[#FAF0D6] text-[#B77F0B]" },
  APPROVED: { label: "承認済み", cls: "bg-[var(--green-soft)] text-[var(--green-d)]" },
  AWAITING_PAYMENT: { label: "お支払い待ち", cls: "bg-[#FAF0D6] text-[#B77F0B]" },
  REJECTED: { label: "要修正", cls: "bg-[var(--red-soft)] text-[var(--red)]" },
  SUSPENDED: { label: "停止中", cls: "bg-[var(--red-soft)] text-[var(--red)]" },
};

export function ReviewStatus({ status }: { status: string }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    submitProfile,
    {}
  );
  const s = STATUS[status] ?? STATUS.DRAFT;
  const canSubmit = status === "DRAFT" || status === "REJECTED";

  // 下書き・要修正のときは、目立つ行動喚起（CTA）を出す
  if (canSubmit) {
    const isRejected = status === "REJECTED";
    return (
      <div
        className={`rounded-[10px] border-2 p-5 ${
          isRejected
            ? "border-[var(--red)] bg-[var(--red-soft)]"
            : "border-[var(--green)] bg-[var(--green-soft)]"
        }`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[11px] ${s.cls}`}>
                {s.label}
              </span>
              <span className="text-[14px] font-semibold text-[var(--ink)]">
                {isRejected
                  ? "内容を修正して、もう一度申請してください"
                  : "まだ申請されていません"}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-6 text-[var(--ink-2)]">
              入力が終わったら、下のボタンから<b>事務局に審査を申請</b>してください。
              承認されると、あなたの情報が他の会員に公開され、パートナー探しの対象になります。
            </p>
          </div>

          <form action={formAction}>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[var(--green)] px-6 py-3.5 text-[15px] font-bold text-white shadow-md transition hover:bg-[var(--green-d)] hover:shadow-lg disabled:opacity-60"
            >
              {pending ? "申請中…" : "事務局に審査を申請する →"}
            </button>
          </form>
        </div>
        {state.error ? (
          <p className="mt-3 text-[12px] text-[var(--red)]">{state.error}</p>
        ) : null}
      </div>
    );
  }

  // それ以外（審査中・承認済み・お支払い待ち・停止中）は状態表示のみ
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--canvas)] px-5 py-3">
      <span className={`rounded-full px-3 py-1 text-[11px] ${s.cls}`}>
        {s.label}
      </span>
      {status === "PENDING" ? (
        <span className="text-[12px] text-[var(--muted)]">
          事務局の承認をお待ちください。
        </span>
      ) : status === "AWAITING_PAYMENT" ? (
        <span className="text-[12px] text-[var(--muted)]">
          事務局よりお支払いのご案内をします（オンライン決済は準備中です）。
        </span>
      ) : status === "APPROVED" ? (
        <span className="text-[12px] text-[var(--muted)]">
          承認済みです。あなたの情報は他の会員に公開されています。
        </span>
      ) : null}
    </div>
  );
}
