"use client";

// 帳票の画面上だけのツールバー（印刷では消える）。
// 支払期限・備考は帳票に反映するだけで保存しない（保存すると電子帳簿保存法の要件を負うため）。
import { useState } from "react";
import { btn, input } from "@/lib/ui";

export function DocumentTools({
  showPayment,
  onChange,
}: {
  showPayment: boolean;
  onChange: (v: { dueText: string; note: string }) => void;
}) {
  const [dueText, setDueText] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="print:hidden mb-4 rounded-[10px] border border-[var(--line)] bg-[#FAFBF9] p-4">
      <div className="flex flex-wrap items-end gap-3">
        {showPayment ? (
          <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
            お支払い期限（任意）
            <input
              value={dueText}
              onChange={(e) => {
                setDueText(e.target.value);
                onChange({ dueText: e.target.value, note });
              }}
              placeholder="例：2026年9月30日"
              className={`${input("sm")} w-[220px]`}
            />
          </label>
        ) : null}
        <label className="flex flex-1 flex-col gap-1 text-[12px] text-[var(--ink-2)]">
          備考（任意）
          <input
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              onChange({ dueText, note: e.target.value });
            }}
            placeholder="例：振込手数料は貴社にてご負担ください。"
            className={`${input("sm")} w-full`}
          />
        </label>
        <button type="button" onClick={() => window.print()} className={btn("primary", "sm")}>
          印刷 / PDFで保存
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
        入力した内容は保存されません。印刷ダイアログで「PDFに保存」を選ぶとファイルにできます。
      </p>
    </div>
  );
}
