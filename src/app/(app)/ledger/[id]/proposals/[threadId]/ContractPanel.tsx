"use client";

// 取引条件の提示・同意（Phase 1）。お金は動かさず、当事者間の合意を記録するだけ。
// 合意後は売り手が「発送しました」、買い手が「受け取りました」を記録し、
// **両方そろって初めて完了**＝納品書・請求書を作成できるようになる。
import { useActionState, useState } from "react";
import Link from "next/link";
import {
  proposeContract,
  respondToContract,
  markDelivery,
  markPaymentReceived,
  type OfferState,
} from "./actions";
import { btn, h2Cls, h2FormCls, input } from "@/lib/ui";
import { PHASE_PAID } from "@/lib/deal-constants";

export type OfferRow = {
  id: string;
  amount: number;
  quantityText: string | null;
  deliveryDate: string | null;
  terms: string | null;
  status: string;
  createdAt: string;
  respondedAt: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  completedAt: string | null;
  taxRate: number;
  fromMe: boolean;
  proposerName: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  proposed: { label: "提示中", cls: "bg-[var(--amber-soft)] text-[var(--amber)]" },
  accepted: { label: "合意", cls: "bg-[var(--green-soft)] text-[var(--green-d)]" },
  declined: { label: "見送り", cls: "bg-[var(--red-soft)] text-[var(--red)]" },
  superseded: { label: "置き換え", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
};

const ISSUE_NOTE =
  "入力した内容は保存されません。印刷ダイアログで「PDFに保存」を選ぶとファイル保存し、その後、ご自身で相手先へご送付ください。";

/**
 * 確認モーダル。押し間違いを防ぐため、記録も帳票の発行も一度確認してから実行する。
 * children に実行側のボタン（form の submit でも Link でも）を入れる。
 */
function ConfirmModal({
  trigger,
  title,
  note,
  cancelLabel,
  children,
}: {
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  note?: string;
  cancelLabel: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-[420px] rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-xl"
          >
            <h2 className={h2FormCls}>{title}</h2>
            {note ? (
              <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">{note}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className={btn("secondary", "sm")}>
                {cancelLabel}
              </button>
              {children(() => setOpen(false))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Row({ o, latest = false }: { o: OfferRow; latest?: boolean }) {
  const s = STATUS_LABEL[o.status] ?? STATUS_LABEL.superseded;
  const active = o.status === "proposed" || o.status === "accepted";
  return (
    <tr
      className={`border-b border-[var(--line-soft)] last:border-b-0 ${active ? "" : "opacity-60"} ${
        latest ? "bg-[var(--amber-bg)]" : ""
      }`}
    >
      <td className="whitespace-nowrap px-4 py-3 align-top">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${s.cls}`}>{s.label}</span>
        {latest ? (
          <span className="ml-1 rounded-full bg-[var(--orange)] px-2 py-0.5 text-[10px] font-bold text-white">
            最新
          </span>
        ) : null}
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
          消費税{o.taxRate}%　/　{o.quantityText ? `数量：${o.quantityText}　/　` : ""}
          納品・完了：{o.deliveryDate ?? "未定"}
        </div>
        {o.shippedAt || o.receivedAt || o.completedAt ? (
          <div className={`mt-1 text-[12px] font-bold ${o.completedAt ? "text-[var(--red)]" : "text-[var(--green-d)]"}`}>
            {o.completedAt
              ? `発送・受け取り完了（${o.completedAt}）`
              : o.shippedAt
                ? `発送済み（${o.shippedAt}）・受け取り待ち`
                : `受け取り済み（${o.receivedAt}）・発送の記録待ち`}
          </div>
        ) : null}
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
  defaultTaxRate = "10",
  viewerRole,
  dealPhase,
  issuedKinds,
  listingTerms,
}: {
  offeringId: string;
  threadId: string;
  offers: OfferRow[];
  /** 案件の分類から決めた既定の税率（飲食料品は8%） */
  defaultTaxRate?: "8" | "10";
  /** 見ている人の立場。売り手だけが発送、買い手だけが受け取りを記録できる */
  viewerRole: "seller" | "buyer";
  /** 現在の段階（入金確認ボタンを出すかの判定に使う） */
  dealPhase: number;
  /** 発行済みの帳票の種類（invoice / delivery / receipt） */
  issuedKinds: string[];
  /** 案件そのものの募集条件（比較の基準として一覧の先頭に出す） */
  listingTerms: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pending = offers.find((o) => o.status === "proposed") ?? null;
  const agreed = offers.find((o) => o.status === "accepted") ?? null;
  // 発送・受け取りの記録か帳票の発行まで進んだら、条件は動かせない
  const locked =
    !!agreed && (!!agreed.shippedAt || !!agreed.receivedAt || !!agreed.completedAt || issuedKinds.length > 0);

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
  const [shipState, shipAction, shipping] = useActionState<OfferState, FormData>(
    markDelivery.bind(null, offeringId, threadId, agreed?.id ?? "", "shipped"),
    {}
  );
  const [recvState, recvAction, receiving] = useActionState<OfferState, FormData>(
    markDelivery.bind(null, offeringId, threadId, agreed?.id ?? "", "received"),
    {}
  );
  const [payState, payAction, paying] = useActionState<OfferState, FormData>(
    markPaymentReceived.bind(null, offeringId, threadId),
    {}
  );

  return (
    <div className="border-b border-[var(--line)] px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={h2Cls}>これまでの条件提示</h2>
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
              {/* 比較の基準として、案件そのものの募集条件を先頭に置く */}
              <tr className="border-b border-[var(--line-soft)] bg-[var(--canvas)]">
                <td className="whitespace-nowrap px-4 py-3 align-top">
                  <span className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--ink-2)]">
                    募集条件
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-[12px] text-[var(--muted)]">—</td>
                <td className="px-4 py-3 align-top text-[12px] text-[var(--ink-2)]">
                  {listingTerms || "この案件に金額の指定はありません"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-[12px] text-[var(--muted)]">—</td>
              </tr>
              {offers.map((o, i) => (
                <Row key={o.id} o={o} latest={i === 0} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-[var(--muted)]">
          まだ条件の提示はありません。金額・数量・納品予定日を提示すると、相手が同意できます。
        </p>
      )}

      {/* 合意後：発送・受け渡しの完了を記録し、そこから帳票を作る */}
      {agreed ? (
        <div className="mt-3 rounded-[10px] border border-[var(--line)] bg-[#FAFBF9] p-4">
          {!agreed.completedAt ? (
            <>
              <div className="text-[13px] font-bold text-[var(--ink)]">
                発送と受け取りの記録
              </div>
              <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
                お渡しする側が「発送しました」、受け取る側が「受け取りました」を押します。
                <b>両方そろうと納品書・請求書を作成できます。</b>
                記録はやり取りに残り、相手にも通知されます。
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {/* 発送（売り手のみ） */}
                <div className="rounded-[10px] border border-[var(--line)] bg-white p-3">
                  <div className="text-[12px] font-bold text-[var(--ink)]">① 発送（お渡しする側）</div>
                  {agreed.shippedAt ? (
                    <div className="mt-2 text-[12px] font-bold text-[var(--green-d)]">
                      ✓ 記録済み（{agreed.shippedAt}）
                    </div>
                  ) : viewerRole === "seller" ? (
                    <ConfirmModal
                      title="確実に相手へ発送（お届け）しましたか？"
                      cancelLabel="まだしていない"
                      trigger={(openModal) => (
                        <button
                          type="button"
                          onClick={openModal}
                          className={`${btn("action", "sm")} mt-2 disabled:opacity-50`}
                          disabled={shipping}
                        >
                          {shipping ? "処理中…" : "発送しました"}
                        </button>
                      )}
                    >
                      {(close) => (
                        <form action={shipAction} onSubmit={() => close()}>
                          <button disabled={shipping} className={`${btn("action", "sm")} disabled:opacity-50`}>
                            発送した
                          </button>
                        </form>
                      )}
                    </ConfirmModal>
                  ) : (
                    <div className="mt-2 text-[12px] text-[var(--muted)]">お相手の記録待ちです。</div>
                  )}
                  {shipState.error ? (
                    <p className="mt-2 text-[12px] text-[var(--red)]">{shipState.error}</p>
                  ) : null}
                </div>

                {/* 受け取り（買い手のみ） */}
                <div className="rounded-[10px] border border-[var(--line)] bg-white p-3">
                  <div className="text-[12px] font-bold text-[var(--ink)]">② 受け取り（受け取る側）</div>
                  {agreed.receivedAt ? (
                    <div className="mt-2 text-[12px] font-bold text-[var(--green-d)]">
                      ✓ 記録済み（{agreed.receivedAt}）
                    </div>
                  ) : viewerRole === "buyer" ? (
                    <ConfirmModal
                      title="確実に受け取りましたか？"
                      cancelLabel="まだ確認出来ていない"
                      trigger={(openModal) => (
                        <button
                          type="button"
                          onClick={openModal}
                          className={`${btn("action", "sm")} mt-2 disabled:opacity-50`}
                          disabled={receiving}
                        >
                          {receiving ? "処理中…" : "受け取りました"}
                        </button>
                      )}
                    >
                      {(close) => (
                        <form action={recvAction} onSubmit={() => close()}>
                          <button disabled={receiving} className={`${btn("action", "sm")} disabled:opacity-50`}>
                            受け取った！
                          </button>
                        </form>
                      )}
                    </ConfirmModal>
                  ) : (
                    <div className="mt-2 text-[12px] text-[var(--muted)]">お相手の記録待ちです。</div>
                  )}
                  {recvState.error ? (
                    <p className="mt-2 text-[12px] text-[var(--red)]">{recvState.error}</p>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px] font-bold text-[var(--red)]">
                発送・受け取り完了（{agreed.completedAt}）
              </div>
              <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
                {viewerRole === "seller" ? (
                  <>
                    合意した内容から帳票を作成できます。発行すると相手にも同じ内容が届きます。
                    <b>NAKAMAは請求も代金の受け取りも行いません。</b>
                  </>
                ) : (
                  <>
                    <b>NAKAMAは請求も代金の受け取りも行いません。</b>
                    お支払いはおふたりの取り決めに従ってください。
                  </>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {/* 発行できるのは売り手だけ。買い手は発行済みのものを見るだけ */}
                {viewerRole === "buyer"
                  ? (
                      [
                        { type: "invoice", label: "請求書" },
                        { type: "delivery", label: "納品書" },
                        { type: "receipt", label: "領収書" },
                      ] as const
                    )
                      .filter((d) => issuedKinds.includes(d.type))
                      .map((d) => (
                        <Link
                          key={d.type}
                          href={`/ledger/${offeringId}/proposals/${threadId}/document?type=${d.type}`}
                          className={btn("secondary", "sm")}
                        >
                          {d.label}を見る
                        </Link>
                      ))
                  : null}
                {viewerRole === "buyer" && issuedKinds.length === 0 ? (
                  <p className="text-[12px] leading-5 text-[var(--muted)]">
                    納品書・請求書・領収書は、代金を請求する側（お相手）が発行します。
                    発行されるとやり取りに届き、ここから同じ内容を保存できます。
                  </p>
                ) : null}
                {viewerRole === "seller"
                  ? (
                  [
                    { type: "invoice", label: "請求書", variant: "primary" as const },
                    { type: "delivery", label: "納品書", variant: "secondary" as const },
                    { type: "receipt", label: "領収書", variant: "secondary" as const },
                  ]
                ).map((d) => (
                  <ConfirmModal
                    key={d.type}
                    title={`${d.label}を発行してもよいですか？`}
                    note={ISSUE_NOTE}
                    cancelLabel="発行しない"
                    trigger={(openModal) => (
                      <button type="button" onClick={openModal} className={btn(d.variant, "sm")}>
                        {d.label}を発行する
                      </button>
                    )}
                  >
                    {() => (
                      <Link
                        href={`/ledger/${offeringId}/proposals/${threadId}/document?type=${d.type}`}
                        className={btn("primary", "sm")}
                      >
                        発行する
                      </Link>
                    )}
                  </ConfirmModal>
                ))
                  : null}
              </div>

              {/* 入金の確認は売り手しか分からない（NAKAMAは代金を預からない） */}
              {viewerRole === "seller" ? (
                dealPhase >= PHASE_PAID ? (
                  <p className="mt-3 text-[12px] font-bold text-[var(--green-d)]">
                    ✓ 入金確認済み
                  </p>
                ) : (
                  <div className="mt-3">
                    <ConfirmModal
                      title="入金を確認できましたか？"
                      note="記録するとやり取りに残り、相手にも通知されます。NAKAMAは代金を預からないため、入金の確認はご自身で行ってください。"
                      cancelLabel="まだ確認できていない"
                      trigger={(openModal) => (
                        <button
                          type="button"
                          onClick={openModal}
                          disabled={paying}
                          className={`${btn("secondary", "sm")} disabled:opacity-50`}
                        >
                          {paying ? "処理中…" : "入金を確認した"}
                        </button>
                      )}
                    >
                      {(close) => (
                        <form action={payAction} onSubmit={() => close()}>
                          <button disabled={paying} className={`${btn("action", "sm")} disabled:opacity-50`}>
                            確認した
                          </button>
                        </form>
                      )}
                    </ConfirmModal>
                    {payState.error ? (
                      <p className="mt-2 text-[12px] text-[var(--red)]">{payState.error}</p>
                    ) : null}
                  </div>
                )
              ) : null}
            </>
          )}
        </div>
      ) : null}

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

      {/* 自分から提示する（発送・受け取り・帳票の発行まで進んだら変更できない） */}
      <div className="mt-3">
        {locked ? (
          <p className="text-[12px] leading-5 text-[var(--muted)]">
            {issuedKinds.length > 0
              ? "帳票を発行済みのため、条件は変更できません。"
              : "発送・受け取りが記録されているため、条件は変更できません。"}
            変更が必要な場合は、下のメッセージでご相談ください。
          </p>
        ) : !open ? (
          <button type="button" onClick={() => setOpen(true)} className={btn("action")}>
            ＋ {agreed ? "条件を変更する（相手の同意が必要）" : pending ? "新しい条件を提示する" : "条件を提示する"}
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
                消費税率
                <select name="taxRate" defaultValue={defaultTaxRate} className={`${input()} w-[190px]`}>
                  <option value="8">8%（飲食料品・軽減税率）</option>
                  <option value="10">10%（標準税率）</option>
                </select>
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
