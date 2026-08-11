"use client";

// 帳票の画面上だけのツールバー（印刷では消える）。
//
// 「発行して相手に送る」を押すと**内容だけ**を保存し、相手のやり取りにも知らせる。
// 相手は同じ内容の帳票を開いて印刷・PDF保存できる。PDFそのものは保存しない
// （保存すると電子帳簿保存法の検索機能・訂正削除防止の要件を負うため）。
import { useActionState, useState } from "react";
import { issueDocument, type OfferState } from "../actions";
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
  invoice: "請求書",
  delivery: "納品書",
  receipt: "領収書",
};

export function DocumentTools({
  kind,
  offeringId,
  threadId,
  initial,
  canIssue,
  issuedAt,
  onChange,
}: {
  kind: "invoice" | "delivery" | "receipt";
  offeringId: string;
  threadId: string;
  initial: DocExtra;
  /** 発行できるのは売り手だけ。買い手は保存済みの内容を見て印刷するだけ */
  canIssue: boolean;
  /** 発行済みならその日時（表示用） */
  issuedAt: string | null;
  onChange: (v: DocExtra) => void;
}) {
  const [v, setV] = useState<DocExtra>(initial);
  const [state, formAction, pending] = useActionState<OfferState, FormData>(
    issueDocument.bind(null, offeringId, threadId, kind),
    {}
  );
  const set = (patch: Partial<DocExtra>) => {
    const next = { ...v, ...patch };
    setV(next);
    onChange(next);
  };

  const labelCls = "flex flex-col gap-1 text-[12px] text-[var(--ink-2)]";
  const label = LABEL[kind];

  // 買い手：入力させず、状態と印刷ボタンだけ出す
  if (!canIssue) {
    return (
      <div className="print:hidden mb-4 rounded-[10px] border border-[var(--line)] bg-[#FAFBF9] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[12px] text-[var(--ink-2)]">
            {issuedAt
              ? `お相手が発行した${label}です（発行 ${issuedAt}）。`
              : `この${label}はまだ発行されていません。お相手の発行をお待ちください。`}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className={`${btn("primary", "sm")} ml-auto`}
          >
            印刷 / PDFで保存
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="print:hidden mb-4 rounded-[10px] border border-[var(--line)] bg-[#FAFBF9] p-4"
    >
      {/* 表示は制御コンポーネントなので、送信値は隠しフィールドで渡す */}
      <input type="hidden" name="taxRate" value={v.reduced ? "8" : "10"} />
      <input type="hidden" name="issuedOn" value={v.issuedOn} />
      <input type="hidden" name="dueText" value={v.dueText} />
      <input type="hidden" name="receivedOn" value={v.receivedOn} />
      <input type="hidden" name="purpose" value={v.purpose} />
      <input type="hidden" name="note" value={v.note} />

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
          {label}番号（自動採番・変更できます）
          <input
            name="docNo"
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

        <button disabled={pending} className={`${btn("action", "sm")} disabled:opacity-50`}>
          {pending ? "送信中…" : issuedAt ? "この内容で出し直して相手に送る" : "この内容で発行して相手に送る"}
        </button>
        <button type="button" onClick={() => window.print()} className={btn("primary", "sm")}>
          印刷 / PDFで保存
        </button>
      </div>

      {state.error ? <p className="mt-2 text-[12px] text-[var(--red)]">{state.error}</p> : null}
      {issuedAt ? (
        <p className="mt-2 text-[11px] leading-5 text-[var(--green-d)]">
          発行済み（{issuedAt}）。相手も同じ内容の{label}を開けます。
        </p>
      ) : null}
      <p className="mt-2 text-[11px] leading-5 text-[var(--red)]">
        PDFそのものは保存されません。印刷ダイアログで「PDFに保存」を選ぶとファイル保存できます。
        「発行して相手に送る」を押すと、相手のやり取りにも同じ内容の{label}が届きます。
      </p>
    </form>
  );
}
