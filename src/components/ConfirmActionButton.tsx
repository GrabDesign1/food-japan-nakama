"use client";

// 汎用の確認モーダルつきボタン（公開・申請など）。確認してから server action を実行する。
import { useState, useTransition } from "react";
import { btn } from "@/lib/ui";

export function ConfirmActionButton({
  action,
  buttonLabel,
  buttonClassName,
  title,
  description,
  confirmLabel,
  cancelLabel = "今はしない",
}: {
  action: () => Promise<void>;
  buttonLabel: string;
  buttonClassName?: string;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName ?? btn("primary", "sm")}
      >
        {buttonLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !pending && setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-action-title"
            className="relative w-full max-w-[400px] rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-xl"
          >
            <h2 id="confirm-action-title" className="text-[16px] font-bold text-[var(--ink)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-[13px] leading-6 text-[var(--ink-2)]">{description}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className={btn("secondary", "sm")}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await action();
                    setOpen(false);
                  })
                }
                disabled={pending}
                className={btn("primary", "sm")}
              >
                {pending ? "処理中…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
