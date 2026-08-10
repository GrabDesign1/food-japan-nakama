"use client";

// 退会の申し出（規約19条）。その場では削除せず、事務局が課金の解約とデータ削除まで確認して実行する。
import { useActionState, useState } from "react";
import { requestWithdrawal } from "../actions";
import type { ProfileState } from "../actions";
import { btn } from "@/lib/ui";

const initial: ProfileState = {};

export function WithdrawalSection({ requestedAt }: { requestedAt: Date | null }) {
  const [state, formAction, pending] = useActionState(requestWithdrawal, initial);
  const [open, setOpen] = useState(false);

  if (requestedAt) {
    return (
      <div className="rounded-[10px] border border-[#E7D9A6] bg-[#FFFBF0] p-5">
        <div className="text-[13px] font-bold text-[var(--ink)]">退会のお申し出を受け付けています</div>
        <p className="mt-1 text-[12px] leading-6 text-[var(--ink-2)]">
          {requestedAt.toLocaleDateString("ja-JP")}に受け付けました。事務局で内容を確認のうえ、
          ご連絡いたします。取り消しをご希望の場合は info@grab-design.com までご連絡ください。
        </p>
      </div>
    );
  }

  if (state.ok) {
    return (
      <div className="rounded-[10px] border border-[var(--line)] bg-white p-5">
        <p className="text-[13px] text-[var(--ink)]">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-[var(--line)] bg-white p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[12px] text-[var(--muted)] underline"
      >
        退会をご希望の方へ
      </button>

      {open ? (
        <form action={formAction} className="mt-3 flex flex-col gap-3">
          <p className="text-[12px] leading-6 text-[var(--ink-2)]">
            退会をご希望の場合は、下のボタンからお申し出ください。事務局で
            <b>ご契約（ビジネス会員）の解約</b>と<b>登録情報・掲載案件・画像の削除</b>を確認のうえ手続きし、
            完了後にご連絡します。お申し出だけでは即時に削除されません。
          </p>
          <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
            差し支えなければ理由をお聞かせください（任意）
            <textarea
              name="reason"
              rows={3}
              className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
              placeholder="例：事業の方針が変わったため"
            />
          </label>
          <label className="flex items-start gap-2 text-[12px] text-[var(--ink-2)]">
            <input type="checkbox" name="agree" required className="mt-0.5" />
            <span>掲載中の案件・メッセージ・画像がすべて削除されることを理解しました。</span>
          </label>
          {state.error ? (
            <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">
              {state.error}
            </p>
          ) : null}
          <button type="submit" disabled={pending} className={`${btn("danger", "sm")} self-start`}>
            {pending ? "送信中…" : "退会を申し出る"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
