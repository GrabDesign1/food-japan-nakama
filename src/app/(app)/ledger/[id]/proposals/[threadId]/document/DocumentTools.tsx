"use client";

// 帳票の画面上だけのツールバー（印刷では消える）。
// 支払期限・備考は帳票に反映するだけで保存しない（保存すると電子帳簿保存法の要件を負うため）。
import { useState } from "react";
import { btn, input } from "@/lib/ui";

export type DocExtra = { dueText: string; note: string; receivedOn: string; purpose: string };

export function DocumentTools({
  kind,
  onChange,
}: {
  kind: "invoice" | "delivery" | "receipt";
  onChange: (v: DocExtra) => void;
}) {
  const [v, setV] = useState<DocExtra>({ dueText: "", note: "", receivedOn: "", purpose: "" });
  const set = (patch: Partial<DocExtra>) => {
    const next = { ...v, ...patch };
    setV(next);
    onChange(next);
  };

  return (
    <div className="print:hidden mb-4 rounded-[10px] border border-[var(--line)] bg-[#FAFBF9] p-4">
      <div className="flex flex-wrap items-end gap-3">
        {kind === "invoice" ? (
          <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
            お支払い期限（任意）
            <input
              value={v.dueText}
              onChange={(e) => set({ dueText: e.target.value })}
              placeholder="例：2026年9月30日"
              className={`${input("sm")} w-[220px]`}
            />
          </label>
        ) : null}
        {kind === "receipt" ? (
          <>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
              代金を受け取った日
              <input
                value={v.receivedOn}
                onChange={(e) => set({ receivedOn: e.target.value })}
                placeholder="例：2026年9月5日"
                className={`${input("sm")} w-[200px]`}
              />
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
              但し書き
              <input
                value={v.purpose}
                onChange={(e) => set({ purpose: e.target.value })}
                placeholder="例：商品代として"
                className={`${input("sm")} w-[220px]`}
              />
            </label>
          </>
        ) : null}
        <label className="flex flex-1 flex-col gap-1 text-[12px] text-[var(--ink-2)]">
          備考（任意）
          <input
            value={v.note}
            onChange={(e) => set({ note: e.target.value })}
            placeholder="例：振込手数料は貴社にてご負担ください。"
            className={`${input("sm")} w-full`}
          />
        </label>
        <button type="button" onClick={() => window.print()} className={btn("primary", "sm")}>
          印刷 / PDFで保存
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[var(--red)]">
        入力した内容は保存されません。印刷ダイアログで「PDFに保存」を選ぶとファイル保存し、その後自身で相手先へご送付ください。
      </p>
    </div>
  );
}
