"use client";

// 会員一覧から、選んだ会員へまとめてメールを送るモーダル（2026-08-16）。
//
// 個別送信（MemberMailButton）との違い＝**広告のときは未同意の宛先をスキップして送る**。
// 何件に送って何件を外すのかを、送信前に画面で必ず見せる。
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendBulkEmail } from "../crm-actions";
import { useCloseOnEscape } from "@/components/useCloseOnEscape";
import { btn, input } from "@/lib/ui";
import { aH2, aNote } from "./adminUi";

export type BulkTarget = { id: string; name: string; optIn: boolean; suspended: boolean };

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button className={btn("primary", "sm")} disabled={pending || count === 0}>
      {pending ? "送信を開始しています…" : `${count}社に送信する`}
    </button>
  );
}

export function BulkMailButton({ targets }: { targets: BulkTarget[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"notice" | "ad">("notice");
  const [state, action] = useActionState(sendBulkEmail, null);
  useCloseOnEscape(open, () => setOpen(false));

  // 実際に送る先＝停止中を除き、広告なら同意者のみ
  const sendable = targets.filter((t) => !t.suspended && (kind === "notice" || t.optIn));
  const skipped = targets.length - sendable.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={targets.length === 0}
        className={btn("action", "sm")}
      >
        メールを送る{targets.length > 0 ? `（${targets.length}社）` : ""}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-[8px] bg-white p-6">
            <h2 className={aH2}>選んだ会員にメールを送る</h2>
            <p className={`${aNote} mt-1`}>
              送信はバックグラウンドで進みます（画面を閉じても続きます）。送り終えると、会員ごとの対応履歴に自動で記録されます。会員間のメッセージには入りません。
            </p>

            <form action={action} className="mt-4 flex flex-col gap-4">
              {targets.map((t) => (
                <input key={t.id} type="hidden" name="memberIds" value={t.id} />
              ))}

              <fieldset className="rounded-[6px] border border-[#E3E6E8] p-3">
                <legend className="px-1 text-[12px] font-bold text-[var(--ink)]">メールの種類</legend>
                <label className="flex items-start gap-2 py-1 text-[13px]">
                  <input
                    type="radio"
                    name="kind"
                    value="notice"
                    checked={kind === "notice"}
                    onChange={() => setKind("notice")}
                    className="mt-1 accent-[var(--green)]"
                  />
                  <span>
                    <b>利用案内（手続きの連絡）</b>
                    <span className="block text-[12px] text-[var(--muted)]">
                      登録手続、掲載内容の確認依頼、審査結果など。同意していない方にも送れます。
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 py-1 text-[13px]">
                  <input
                    type="radio"
                    name="kind"
                    value="ad"
                    checked={kind === "ad"}
                    onChange={() => setKind("ad")}
                    className="mt-1 accent-[var(--green)]"
                  />
                  <span>
                    <b>広告・宣伝を含む案内</b>
                    <span className="block text-[12px] text-[var(--muted)]">
                      <b>案内メールに同意した方にだけ</b>送ります。同意していない方は自動で外れます。
                    </span>
                  </span>
                </label>
              </fieldset>

              <div className="rounded-[6px] bg-[#F4F5F7] px-4 py-3 text-[13px]">
                送信対象：<b className="text-[var(--green-d)]">{sendable.length}社</b>
                {skipped > 0 ? (
                  <span className="ml-2 text-[var(--muted)]">
                    （{skipped}社は{kind === "ad" ? "未同意または停止中" : "停止中"}のため送りません）
                  </span>
                ) : null}
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-bold text-[var(--ink)]">件名</span>
                <input name="subject" maxLength={120} required className={`${input()} w-full`} />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-bold text-[var(--ink)]">本文</span>
                <textarea name="body" rows={10} maxLength={4000} required className={`${input()} w-full`} />
                <span className="text-[11px] text-[var(--muted)]">
                  署名（事務局名・住所・連絡先）と、広告のときの配信停止の案内は自動で付きます。
                </span>
              </label>

              {state?.ok ? (
                <p className="rounded-md bg-[var(--green-soft)] px-3 py-2 text-[12px] text-[var(--green-d)]">
                  {state.message}
                </p>
              ) : null}
              {state?.error ? (
                <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">
                  {state.error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className={btn("secondary", "sm")}>
                  閉じる
                </button>
                <SubmitButton count={sendable.length} />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
