"use client";

// 取引条件の提示・同意（Phase 1）。お金は動かさず、当事者間の合意を記録するだけ。
import { useActionState, useState } from "react";
import { proposeContract, respondToContract, type OfferState } from "./actions";
import { btn, h2Cls, input } from "@/lib/ui";

export type OfferRow = {
  id: string;
  amount: number;
  quantityText: string | null;
  deliveryDate: string | null;
  terms: string | null;
  status: string;
  createdAt: string;
  respondedAt: string | null;
  fromMe: boolean;
  proposerName: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  proposed: { label: "提示中", cls: "bg-[var(--amber-soft)] text-[var(--amber)]" },
  accepted: { label: "合意", cls: "bg-[var(--green-soft)] text-[var(--green-d)]" },
  declined: { label: "見送り", cls: "bg-[var(--red-soft)] text-[var(--red)]" },
  superseded: { label: "置き換え", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
};

function Row({ o }: { o: OfferRow }) {
  const s = STATUS_LABEL[o.status] ?? STATUS_LABEL.superseded;
  const active = o.status === "proposed" || o.status === "accepted";
  return (
    <tr className={`border-b border-[var(--line-soft)] last:border-b-0 ${active ? "" : "opacity-60"}`}>
      <td className="whitespace-nowrap px-4 py-3 align-top">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${s.cls}`}>{s.label}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-top text-[12px] text-[var(--ink-2)]">
        {o.fromMe ? "自分" : o.proposerName}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="text-[16px] font-bold text-[var(--ink)]">
          {o.amount.toLocaleString()}
          <span className="ml-0.5 text-[11px] font-normal text-[var(--muted)]">円（税込）</span>
        </div>
        <div className="mt-0.5 text-[12px] text-[var(--ink-2)]">
          {o.quantityText ? `数量：${o.quantityText}　/　` : ""}
          納品・完了：{o.deliveryDate ?? "未定"}
        </div>
        {o.terms ? (
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-[var(--muted)]">{o.terms}</p>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-top text-[12px] text-[var(--muted)]">
        {o.createdAt}
        {o.respondedAt ? <div>回答 {o.respondedAt}</div> : null}
      </td>
    </tr>
  );
}

export function ContractPanel({
  offeringId,
  threadId,
  offers,
}: {
  offeringId: string;
  threadId: string;
  offers: OfferRow[];
}) {
  const [open, setOpen] = useState(false);
  const pending = offers.find((o) => o.status === "proposed") ?? null;
  const agreed = offers.find((o) => o.status === "accepted") ?? null;

  const [proposeState, proposeAction, proposing] = useActionState<OfferState, FormData>(
    proposeContract.bind(null, offeringId, threadId),
    {}
  );
  const [acceptState, acceptAction, accepting] = useActionState<OfferState, FormData>(
    respondToContract.bind(null, offeringId, threadId, pending?.id ?? "", "accept"),
    {}
  );
  const [declineState, declineAction, declining] = useActionState<OfferState, FormData>(
    respondToContract.bind(null, offeringId, threadId, pending?.id ?? "", "decline"),
    {}
  );

  return (
    <div className="border-b border-[var(--line)] px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={h2Cls}>取引の条件</h2>
        {agreed ? (
          <span className="rounded-full bg-[var(--green)] px-3 py-1 text-[11px] font-bold text-white">
            合意済み（{agreed.amount.toLocaleString()}円）
          </span>
        ) : null}
      </div>

      {offers.length ? (
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-[var(--line)]">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--canvas)] text-[11px] text-[var(--muted)]">
                <th className="px-4 py-2 font-medium">状態</th>
                <th className="px-4 py-2 font-medium">提示者</th>
                <th className="px-4 py-2 font-medium">条件（税込）</th>
                <th className="px-4 py-2 font-medium">日時</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <Row key={o.id} o={o} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-[var(--muted)]">
          まだ条件の提示はありません。金額・数量・納品予定日を提示すると、相手が同意できます。
        </p>
      )}

      {/* 相手からの提示に回答する */}
      {pending && !pending.fromMe ? (
        <div className="mt-3 rounded-[10px] border-2 border-[var(--green)] bg-[var(--green-soft)] p-4">
          <div className="text-[13px] font-bold text-[var(--ink)]">
            相手から条件が提示されています（{pending.amount.toLocaleString()}円・税込）
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={acceptAction}>
              <input type="hidden" name="note" value="" />
              <button disabled={accepting} className={`${btn("action")} disabled:opacity-50`}>
                {accepting ? "処理中…" : "同意する"}
              </button>
            </form>
            <button type="button" onClick={() => setOpen((v) => !v)} className={btn("secondary")}>
              新しい条件を提示する
            </button>
            <form action={declineAction}>
              <input type="hidden" name="note" value="" />
              <button disabled={declining} className={`${btn("secondary")} disabled:opacity-50`}>
                {declining ? "処理中…" : "今回は見送る"}
              </button>
            </form>
          </div>
          {acceptState.error ? (
            <p className="mt-2 text-[12px] text-[var(--red)]">{acceptState.error}</p>
          ) : null}
          {declineState.error ? (
            <p className="mt-2 text-[12px] text-[var(--red)]">{declineState.error}</p>
          ) : null}
          <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
            「同意する」を押すと、この条件で合意したことがやり取りに記録されます。
            <b>支払い・納品の方法はおふたりで取り決めてください</b>（NAKAMAは当事者にならず、代金を預かりません）。
          </p>
        </div>
      ) : null}

      {/* 自分から提示する */}
      <div className="mt-3">
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className={btn("secondary", "sm")}>
            ＋ {pending ? "新しい条件を提示する" : "条件を提示する"}
          </button>
        ) : (
          <form action={proposeAction} className="rounded-[10px] border border-[var(--line)] bg-white p-4">
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
                金額（税込・円）
                <input
                  name="amount"
                  required
                  inputMode="numeric"
                  placeholder="例：120000"
                  className={`${input()} w-[180px]`}
                />
              </label>
              <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
                数量・ロット（任意）
                <input
                  name="quantityText"
                  placeholder="例：20kg × 4回"
                  className={`${input()} w-[200px]`}
                />
              </label>
              <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
                納品・完了の予定日（任意）
                <input
                  type="date"
                  name="deliveryDate"
                  className={input()}
                />
              </label>
            </div>
            <label className="mt-3 flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
              内容・条件（任意）
              <textarea
                name="terms"
                rows={3}
                placeholder="例：規格はM〜L混合。送料は当方負担。支払いは月末締め翌月末払い。"
                className={`${input()} w-full`}
              />
            </label>
            {proposeState.error ? (
              <p className="mt-2 text-[12px] text-[var(--red)]">{proposeState.error}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button disabled={proposing} className={`${btn("primary", "sm")} disabled:opacity-50`}>
                {proposing ? "送信中…" : "この条件を提示する"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className={btn("secondary", "sm")}>
                キャンセル
              </button>
              <span className="text-[11px] text-[var(--muted)]">
                提示すると、やり取りにも記録が残ります。
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
