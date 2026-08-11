"use client";

// 帳票の画面上だけのツールバー（印刷では消える）。
// ここで入れた値は帳票に反映するだけで保存しない（保存すると電子帳簿保存法の要件を負うため）。
import { useState } from "react";
import { btn, input } from "@/lib/ui";

export type DocExtra = {
  /** 書類番号。既定は自動採番。手で書き換えられる（自社の採番規則に合わせるため） */
  docNo: string;
  /** 発行日（納品書・請求書で入力。空なら今日） */
  issuedOn: string;
  /** 請求書：お支払い期限 */
  dueText: string;
  /** 領収書：代金を受け取った日 */
  receivedOn: string;
  /** 領収書：但し書き */
  purpose: string;
  note: string;
  /** 軽減税率（8%）の対象品目か。チェックすると帳票の税率と内訳が8%になる */
  reduced: boolean;
};

const LABEL: Record<"invoice" | "delivery" | "receipt", string> = {
  invoice: "請求書番号",
  delivery: "納品書番号",
  receipt: "領収書番号",
};

export function DocumentTools({
  kind,
  defaultDocNo,
  defaultReduced,
  onChange,
}: {
  kind: "invoice" | "delivery" | "receipt";
  defaultDocNo: string;
  defaultReduced: boolean;
  onChange: (v: DocExtra) => void;
}) {
  const [v, setV] = useState<DocExtra>({
    docNo: defaultDocNo,
    issuedOn: "",
    dueText: "",
    receivedOn: "",
    purpose: "",
    note: "",
    reduced: defaultReduced,
  });
  const set = (patch: Partial<DocExtra>) => {
    const next = { ...v, ...patch };
    setV(next);
    onChange(next);
  };

  const labelCls = "flex flex-col gap-1 text-[12px] text-[var(--ink-2)]";

  return (
    <div className="print:hidden mb-4 rounded-[10px] border border-[var(--line)] bg-[#FAFBF9] p-4">
      <div className="flex flex-wrap items-end gap-3">
        {kind !== "receipt" ? (
          <label className={labelCls}>
            発行日
            <input
              value={v.issuedOn}
              onChange={(e) => set({ issuedOn: e.target.value })}
              placeholder="例：2026年9月5日（空欄なら本日）"
              className={`${input("sm")} w-[220px]`}
            />
          </label>
        ) : null}

        {kind === "receipt" ? (
          <>
            <label className={labelCls}>
              代金を受け取った日
              <input
                value={v.receivedOn}
                onChange={(e) => set({ receivedOn: e.target.value })}
                placeholder="例：2026年9月5日"
                className={`${input("sm")} w-[200px]`}
              />
            </label>
            <label className={labelCls}>
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

        {kind === "invoice" ? (
          <label className={labelCls}>
            お支払い期限（任意）
            <input
              value={v.dueText}
              onChange={(e) => set({ dueText: e.target.value })}
              placeholder="例：2026年9月30日"
              className={`${input("sm")} w-[220px]`}
            />
          </label>
        ) : null}

        <label className={labelCls}>
          {LABEL[kind]}（自動採番・変更できます）
          <input
            value={v.docNo}
            onChange={(e) => set({ docNo: e.target.value })}
            className={`${input("sm")} w-[220px]`}
          />
        </label>

      </div>

      {/* 軽減税率の切り替え（飲食料品は8%） */}
      <label className="mt-3 flex items-start gap-2 text-[12px] leading-5 text-[var(--ink-2)]">
        <input
          type="checkbox"
          checked={v.reduced}
          onChange={(e) => set({ reduced: e.target.checked })}
          className="mt-0.5"
        />
        <span>
          <b>軽減税率（8%）の対象品目</b>にする（酒類・外食を除く飲食料品）。
          チェックを外すと標準税率10%で計算します。送料・資材・役務が含まれる場合はご注意ください。
        </span>
      </label>

      {/* 備考は長くなるので独立した行にする */}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className={`${labelCls} min-w-[260px] flex-1`}>
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
        入力した内容は保存されません。印刷ダイアログで「PDFに保存」を選ぶとファイル保存し、その後、ご自身で相手先へご送付ください。
      </p>
    </div>
  );
}
