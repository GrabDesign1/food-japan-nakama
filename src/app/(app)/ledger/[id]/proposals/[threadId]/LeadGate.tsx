"use client";

// 未開封のリード（売りたてに届いた問い合わせ）の入口。
// 本文と連絡先はサーバー側で返していないので、ここで開封してから読む。
import { useActionState } from "react";
import Link from "next/link";
import { openLeadAction, type OfferState } from "./actions";
import { btn, h2FormCls } from "@/lib/ui";

export function LeadGate({
  offeringId,
  threadId,
  buyerName,
  preview,
  receivedAt,
  balance,
}: {
  offeringId: string;
  threadId: string;
  buyerName: string;
  /** 冒頭だけの概要（全文は開封後） */
  preview: string;
  receivedAt: string;
  balance: number;
}) {
  const [state, formAction, pending] = useActionState<OfferState, FormData>(
    openLeadAction.bind(null, offeringId, threadId),
    {}
  );
  const enough = balance >= 1;

  return (
    <div className="border-b border-[var(--line)] px-6 py-6">
      <div className="rounded-[12px] border-2 border-[var(--orange)] bg-[var(--amber-bg)] p-5">
        <h2 className={h2FormCls}>{buyerName} から問い合わせが届いています</h2>
        <p className="mt-1 text-[12px] text-[var(--muted)]">受信：{receivedAt}</p>

        <div className="mt-3 rounded-[10px] border border-[var(--line)] bg-white p-4">
          <div className="text-[13px] leading-7 text-[var(--ink)]">
            {preview}
            <span className="text-[var(--muted)]">…</span>
          </div>
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            この先の本文と、担当者名・連絡先は開封すると読めます。
          </p>
        </div>

        <p className="mt-3 text-[13px] leading-6 text-[var(--ink-2)]">
          開封には<b>1クレジット（1,100円相当）</b>を使います。
          <b>開封したあとのやり取りは、何往復でも無料</b>です。
        </p>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          残高：{balance}クレジット
        </p>

        {state.error ? (
          <p className="mt-2 text-[12px] text-[var(--red)]">{state.error}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {enough ? (
            <form action={formAction}>
              <button disabled={pending} className={`${btn("action")} disabled:opacity-50`}>
                {pending ? "処理中…" : "1クレジットを使って開く"}
              </button>
            </form>
          ) : (
            <Link href="/billing" className={btn("action")}>
              クレジットを購入する
            </Link>
          )}
          <Link href={`/ledger/${offeringId}/proposals`} className={btn("secondary")}>
            あとで見る
          </Link>
        </div>
      </div>
    </div>
  );
}
