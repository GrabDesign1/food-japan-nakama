"use client";

// 差し戻しボタン＋理由入力モーダル（事務局用）。
// 理由は必須。掲載者の編集画面に表示され、メールでも届く。
import { useActionState, useState } from "react";
import { adminSendBackProject, type ProjectState } from "../actions";
import { btn, input, h2FormCls } from "@/lib/ui";

export function SendBackButton({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const action = adminSendBackProject.bind(null, projectId);
  const [state, formAction, pending] = useActionState<ProjectState, FormData>(action, {});

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn("danger", "sm")}>
        差し戻し
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
            aria-labelledby="send-back-title"
            className="relative w-full max-w-[480px] rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-xl"
          >
            {state.ok ? (
              <>
                <h2 id="send-back-title" className={h2FormCls}>
                  差し戻しました
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-[var(--ink-2)]">
                  掲載者に理由をメールでお知らせしました。編集画面にも同じ内容が表示されます。
                </p>
                <div className="mt-5 flex justify-end">
                  <button type="button" onClick={() => setOpen(false)} className={btn("secondary", "sm")}>
                    閉じる
                  </button>
                </div>
              </>
            ) : (
              <form action={formAction}>
                <h2 id="send-back-title" className={h2FormCls}>
                  掲載を差し戻しますか？
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-[var(--ink-2)]">
                  「{projectTitle || "（無題）"}」を下書きに戻します。理由と修正してほしい箇所は、掲載者にメールで届き、編集画面にも表示されます。
                </p>
                <label className="mt-4 flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
                  <span>
                    差し戻しの理由・修正してほしい箇所
                    <span className="ml-1 text-[11px] text-[var(--red)]">必須</span>
                  </span>
                  <textarea
                    name="reason"
                    rows={5}
                    autoFocus
                    placeholder={"例：\n・募集する役割に「お願いしたいこと」を具体的に書いてください\n・実施地域と募集期限の記載をお願いします"}
                    className={input()}
                  />
                </label>
                {state.error ? (
                  <p className="mt-2 text-[12px] text-[var(--red)]">{state.error}</p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className={btn("secondary", "sm")}
                  >
                    今はしない
                  </button>
                  <button type="submit" disabled={pending} className={btn("danger", "sm")}>
                    {pending ? "送信中…" : "理由を送って差し戻す"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
