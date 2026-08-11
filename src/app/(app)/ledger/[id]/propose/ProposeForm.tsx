"use client";

// 提案送信フォーム／クレジット購入ボタン（useActionStateでエラー表示・送信中disabled）。
import { useActionState } from "react";
import { sendProposal, buyProposalProduct, type ProposeState } from "./actions";
import { btn } from "@/lib/ui";

export function ProposeForm(props: {
  mode: "send" | "buy";
  offeringId: string;
  needsCredit?: boolean;
  creditBalance?: number;
  /** この案件に必要なクレジット数（通常1・NAKAMA確認済み案件3）。 */
  creditCost?: number;
  buyOptions?: { code: string; label: string }[];
}) {
  if (props.mode === "buy") {
    return (
      <div className="mt-3 flex flex-col gap-2">
        {(props.buyOptions ?? []).map((o) => (
          <BuyButton key={o.code} offeringId={props.offeringId} code={o.code} label={o.label} />
        ))}
      </div>
    );
  }
  return <SendForm {...props} />;
}

function SendForm({
  offeringId,
  needsCredit,
  creditBalance,
  creditCost = 1,
}: {
  offeringId: string;
  needsCredit?: boolean;
  creditBalance?: number;
  creditCost?: number;
}) {
  const [state, action, pending] = useActionState<ProposeState, FormData>(
    sendProposal.bind(null, offeringId),
    {}
  );
  // 確認済み案件は3クレジット必要。残高が足りているかは必要数で判定する
  const noCredit = !!needsCredit && (creditBalance ?? 0) < creditCost;
  return (
    <form action={action} className="mt-3 flex flex-col gap-3">
      <textarea
        name="message"
        required
        rows={6}
        placeholder="例：規格外トマトを年間○トン供給できます。糖度・サイズ・出荷時期は〜"
        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
      />
      {state.error ? (
        <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">{state.error}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending || noCredit} className={`${btn("primary", "md")} disabled:opacity-50`}>
          {pending
            ? "送信中…"
            : needsCredit
              ? `${creditCost}クレジットを使って提案を送信する`
              : "提案を送信する（無料）"}
        </button>
        {noCredit ? (
          <span className="text-[12px] text-[var(--red)]">
            クレジットが不足しています（この案件には{creditCost}クレジット必要です）。上の購入からお求めください。
          </span>
        ) : null}
      </div>
    </form>
  );
}

function BuyButton({ offeringId, code, label }: { offeringId: string; code: string; label: string }) {
  const [state, action, pending] = useActionState<ProposeState, FormData>(
    buyProposalProduct.bind(null, offeringId, code),
    {}
  );
  return (
    <form action={action}>
      {state.error ? <p className="mb-1 text-[12px] text-[var(--red)]">{state.error}</p> : null}
      <button disabled={pending} className={`${btn("secondary", "sm")} w-full sm:w-auto disabled:opacity-50`}>
        {pending ? "決済画面へ移動中…" : label}
      </button>
    </form>
  );
}
