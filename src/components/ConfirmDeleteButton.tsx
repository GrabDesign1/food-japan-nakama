"use client";

// 削除の確認モーダル。「今はしない」「削除する」で確認してから server action を実行する。
import { useState, useTransition } from "react";
import { btn } from "@/lib/ui";

export function ConfirmDeleteButton({
  action,
  buttonLabel,
  buttonClassName,
  title = "本当に削除しますか？",
  description = "この操作は元に戻せません。",
}: {
  action: () => Promise<void>;
  buttonLabel: string;
  buttonClassName?: string;
  title?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName ?? "text-[12px] text-[var(--red)] underline"}
      >
        {buttonLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !pending && setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            className="relative w-full max-w-[400px] rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-xl"
          >
            <h2 id="confirm-delete-title" className="text-[16px] font-bold text-[var(--ink)]">
              {title}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[var(--ink-2)]">{description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className={btn("secondary", "sm")}
              >
                今はしない
              </button>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await action();
                  })
                }
                disabled={pending}
                className={btn("danger", "sm")}
              >
                {pending ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
