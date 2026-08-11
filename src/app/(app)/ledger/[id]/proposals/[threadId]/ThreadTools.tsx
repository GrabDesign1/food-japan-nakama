"use client";

// やり取りの補助操作（見送り・秘密保持契約・違反報告）。
// クラウドワークスの「応募・スカウトを辞退する／秘密保持契約を締結する／違反報告する」に相当。
import { useActionState, useState } from "react";
import Link from "next/link";
import { closeThread, reopenThread, requestNda, respondNda, type OfferState } from "./actions";
import { btn, h2Cls, input } from "@/lib/ui";

export type NdaView = {
  status: string;
  partyAName: string;
  partyBName: string;
  specialTerms: string | null;
  agreedAt: string | null;
  mine: boolean;
  articles: { head: string; body: string }[];
  title: string;
};

export function ThreadTools({
  offeringId,
  threadId,
  closed,
  closedReason,
  nda,
}: {
  offeringId: string;
  threadId: string;
  closed: boolean;
  closedReason: string | null;
  nda: NdaView | null;
}) {
  const [open, setOpen] = useState<null | "close" | "nda">(null);
  const [closeState, closeAction, closing] = useActionState<OfferState, FormData>(
    closeThread.bind(null, offeringId, threadId),
    {}
  );
  const [ndaState, ndaAction, requesting] = useActionState<OfferState, FormData>(
    requestNda.bind(null, offeringId, threadId),
    {}
  );
  const [agreeState, agreeAction, agreeing] = useActionState<OfferState, FormData>(
    respondNda.bind(null, offeringId, threadId, "agree"),
    {}
  );
  const [declineState, declineAction, decliningNda] = useActionState<OfferState, FormData>(
    respondNda.bind(null, offeringId, threadId, "decline"),
    {}
  );

  return (
    <div className="border-t border-[var(--line)] px-6 py-5">
      <h2 className={h2Cls}>このやり取りについて</h2>

      {/* 見送りの状態 */}
      {closed ? (
        <div className="mt-2 rounded-[10px] border border-[var(--line)] bg-[var(--canvas)] p-4">
          <div className="text-[13px] font-bold text-[var(--ink-2)]">このやり取りは見送りになっています</div>
          {closedReason ? (
            <p className="mt-1 whitespace-pre-wrap text-[12px] text-[var(--muted)]">{closedReason}</p>
          ) : null}
          <form action={reopenThread.bind(null, offeringId, threadId)} className="mt-2">
            <button className={btn("secondary", "sm")}>やり取りを再開する</button>
          </form>
        </div>
      ) : null}

      {/* 秘密保持契約 */}
      <div className="mt-3 rounded-[10px] border border-[var(--line)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[13px] font-bold text-[var(--ink)]">秘密保持契約（NDA）</div>
          {nda?.status === "agreed" ? (
            <span className="rounded-full bg-[var(--green)] px-3 py-1 text-[11px] font-bold text-white">
              締結済み{nda.agreedAt ? `（${nda.agreedAt}）` : ""}
            </span>
          ) : nda?.status === "requested" ? (
            <span className="rounded-full bg-[var(--amber-soft)] px-3 py-1 text-[11px] font-bold text-[var(--amber)]">
              同意リクエスト中
            </span>
          ) : null}
        </div>

        {nda ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-[12px] text-[var(--green-d)] underline">
              契約書の内容を見る（甲：{nda.partyAName}／乙：{nda.partyBName}）
            </summary>
            <div className="mt-2 max-h-[360px] overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--canvas)] p-4">
              <div className="text-[13px] font-bold text-[var(--ink)]">{nda.title}</div>
              {nda.articles.map((a) => (
                <div key={a.head} className="mt-3">
                  <div className="text-[12px] font-bold text-[var(--ink)]">{a.head}</div>
                  <p className="whitespace-pre-wrap text-[12px] leading-6 text-[var(--ink-2)]">{a.body}</p>
                </div>
              ))}
              {nda.specialTerms ? (
                <div className="mt-3">
                  <div className="text-[12px] font-bold text-[var(--ink)]">特記事項</div>
                  <p className="whitespace-pre-wrap text-[12px] leading-6 text-[var(--ink-2)]">
                    {nda.specialTerms}
                  </p>
                </div>
              ) : null}
            </div>
          </details>
        ) : (
          <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
            条件や商品の情報を詳しくやり取りする前に、秘密保持契約を結べます。
            雛形を相手に送り、相手が同意すると締結されます。
          </p>
        )}

        {/* 相手からのリクエストに回答 */}
        {nda?.status === "requested" && !nda.mine ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={agreeAction}>
              <button disabled={agreeing} className={`${btn("primary", "sm")} disabled:opacity-50`}>
                {agreeing ? "処理中…" : "内容に同意する"}
              </button>
            </form>
            <form action={declineAction}>
              <button disabled={decliningNda} className={`${btn("secondary", "sm")} disabled:opacity-50`}>
                {decliningNda ? "処理中…" : "同意しない"}
              </button>
            </form>
          </div>
        ) : null}
        {agreeState.error ? <p className="mt-1 text-[12px] text-[var(--red)]">{agreeState.error}</p> : null}
        {declineState.error ? (
          <p className="mt-1 text-[12px] text-[var(--red)]">{declineState.error}</p>
        ) : null}

        {/* 自分から送る */}
        {nda?.status !== "agreed" ? (
          <div className="mt-3">
            {open === "nda" ? (
              <form action={ndaAction} className="rounded-md border border-[var(--line)] p-3">
                <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
                  特記事項（任意）
                  <textarea
                    name="specialTerms"
                    rows={3}
                    placeholder="雛形に追加したい取り決めがあれば記入してください。"
                    className={input()}
                  />
                </label>
                {ndaState.error ? (
                  <p className="mt-1 text-[12px] text-[var(--red)]">{ndaState.error}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button disabled={requesting} className={`${btn("primary", "sm")} disabled:opacity-50`}>
                    {requesting ? "送信中…" : "同意リクエストを送信する"}
                  </button>
                  <button type="button" onClick={() => setOpen(null)} className={btn("secondary", "sm")}>
                    キャンセル
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => setOpen("nda")} className={btn("secondary", "sm")}>
                {nda?.status === "requested" && nda.mine
                  ? "内容を変えて送り直す"
                  : "秘密保持契約を締結する"}
              </button>
            )}
          </div>
        ) : null}

        <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
          この契約は当事者間のものです。NAKAMAは当事者にならず、同意した事実・日時・同意時点の文面を記録します（電子署名ではありません）。
        </p>
      </div>

      {/* 見送り・違反報告 */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!closed ? (
          open === "close" ? (
            <form action={closeAction} className="w-full rounded-[10px] border border-[var(--line)] bg-white p-4">
              <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
                見送りの理由（任意・相手に届きます）
                <textarea
                  name="reason"
                  rows={3}
                  placeholder="例：今回は数量が合わないため見送らせていただきます。"
                  className={input()}
                />
              </label>
              {closeState.error ? (
                <p className="mt-1 text-[12px] text-[var(--red)]">{closeState.error}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button disabled={closing} className={`${btn("danger", "sm")} disabled:opacity-50`}>
                  {closing ? "処理中…" : "見送る"}
                </button>
                <button type="button" onClick={() => setOpen(null)} className={btn("secondary", "sm")}>
                  キャンセル
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setOpen("close")}
              className="text-[12px] text-[var(--muted)] underline hover:text-[var(--ink-2)]"
            >
              今回は見送る
            </button>
          )
        ) : null}

        <span className="text-[11px] text-[var(--muted)]">
          ※ やり取りしているメッセージ（添付を含む）は、最後のやり取りから1年が経過すると自動的に削除されます。
          必要な記録はお手元に保存してください。
        </span>

        <Link
          href={`/report?targetType=thread&targetId=${threadId}`}
          className="text-[12px] text-[var(--muted)] underline hover:text-[var(--red)]"
        >
          違反報告する
        </Link>
      </div>
    </div>
  );
}
