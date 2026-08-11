"use client";

// 届いた提案の表（チェックボックスでの一括送信・5段階評価・非公開メモ）。
// クラウドワークスの応募者一覧に合わせた（2026-08-11 ユーザー指示）。
import { useActionState, useState } from "react";
import Link from "next/link";
import { saveProposalNote, bulkSendToProposals } from "./actions";
import { BusinessMemberPromo } from "@/components/BusinessMemberPromo";
import { btn, input } from "@/lib/ui";

export type ProposalRow = {
  threadId: string;
  offeringId: string;
  isGive: boolean;
  otherId: string;
  otherName: string;
  otherLogoUrl: string | null;
  otherPlace: string;
  otherIndustry: string;
  /** 未開封＝本文は冒頭だけ（サーバー側で切ってある） */
  locked: boolean;
  firstBody: string;
  firstAt: string;
  lastAt: string;
  lastFromMe: boolean;
  unread: number;
  phaseLabel: string;
  proposedAmount: number | null;
  rating: number | null;
  memo: string;
};

/** 5段階の評価（押すとその場で保存する）。 */
function Stars({
  offeringId,
  threadId,
  value,
  memo,
}: {
  offeringId: string;
  threadId: string;
  value: number | null;
  memo: string;
}) {
  const [current, setCurrent] = useState(value ?? 0);
  return (
    <form action={saveProposalNote.bind(null, offeringId, threadId)} className="flex items-center gap-0.5">
      <input type="hidden" name="rating" value={current} />
      <input type="hidden" name="memo" value={memo} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="submit"
          onClick={() => setCurrent(n === current ? 0 : n)}
          aria-label={`${n}段階の評価`}
          className={`text-[16px] leading-none ${n <= current ? "text-[#F59E0B]" : "text-[var(--line)]"}`}
        >
          ★
        </button>
      ))}
    </form>
  );
}

function MemoBox({
  offeringId,
  threadId,
  rating,
  memo,
}: {
  offeringId: string;
  threadId: string;
  rating: number | null;
  memo: string;
}) {
  const [value, setValue] = useState(memo);
  return (
    <form action={saveProposalNote.bind(null, offeringId, threadId)} className="mt-1 flex flex-col gap-1">
      <input type="hidden" name="rating" value={rating ?? 0} />
      <textarea
        name="memo"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        placeholder="社内メモ（相手には見えません）"
        className={`${input("xs")} w-[190px]`}
      />
      <button className={`${btn("secondary", "sm")} w-fit`}>保存</button>
    </form>
  );
}

export function ProposalRows({
  offeringId,
  rows,
  isGive,
  showMemberPromo = false,
}: {
  offeringId: string;
  rows: ProposalRow[];
  isGive: boolean;
  /** 未開封がある＆まだビジネス会員でないときだけ、会員の案内を出す */
  showMemberPromo?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [compose, setCompose] = useState<null | "message" | "decline">(null);
  const [state, action, pending] = useActionState<{ ok?: number; error?: string }, FormData>(
    bulkSendToProposals.bind(null, offeringId),
    {}
  );

  const allChecked = rows.length > 0 && selected.length === rows.length;
  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const declineTemplate =
    "このたびはご提案いただき、ありがとうございました。\n社内で検討いたしましたが、今回は見送らせていただくことになりました。\n条件が合うご相談がありましたら、改めてご連絡いたします。\n今後ともよろしくお願いいたします。";

  return (
    <div className="flex flex-col gap-3">
      {/* 一括操作 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!selected.length}
          onClick={() => setCompose("message")}
          className={`${btn("secondary", "sm")} disabled:opacity-40`}
        >
          メッセージの一括送信{selected.length ? `（${selected.length}件）` : ""}
        </button>
        <button
          type="button"
          disabled={!selected.length}
          onClick={() => setCompose("decline")}
          className={`${btn("secondary", "sm")} disabled:opacity-40`}
        >
          お断りメッセージの一括送信{selected.length ? `（${selected.length}件）` : ""}
        </button>
        {state.ok ? (
          <span className="text-[12px] font-bold text-[var(--green-d)]">{state.ok}件に送信しました</span>
        ) : null}
        {state.error ? <span className="text-[12px] text-[var(--red)]">{state.error}</span> : null}
      </div>

      {/* 文面の入力（選んだ相手に同じ本文を送る） */}
      {compose ? (
        <form action={action} className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-4">
          {selected.map((id) => (
            <input key={id} type="hidden" name="threadIds" value={id} />
          ))}
          <div className="text-[13px] font-bold text-[var(--ink)]">
            {compose === "decline" ? "お断りメッセージ" : "メッセージ"}を{selected.length}件に送信します
          </div>
          <textarea
            name="body"
            required
            rows={6}
            defaultValue={compose === "decline" ? declineTemplate : ""}
            placeholder="本文を入力してください"
            className={`${input()} mt-2 w-full`}
          />
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            同じ本文が1通ずつ届きます（相手には個別のやり取りとして表示されます）。
          </p>
          <div className="mt-2 flex gap-2">
            <button disabled={pending} className={`${btn("primary", "sm")} disabled:opacity-50`}>
              {pending ? "送信中…" : "送信する"}
            </button>
            <button type="button" onClick={() => setCompose(null)} className={btn("secondary", "sm")}>
              キャンセル
            </button>
          </div>
        </form>
      ) : null}

      {showMemberPromo && rows.some((r) => r.locked) ? (
        <BusinessMemberPromo />
      ) : null}

      <div className="overflow-x-auto rounded-[12px] border border-[var(--line)] bg-white">
        <table className="w-full min-w-[1000px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--canvas)] text-[11px] text-[var(--muted)]">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() => setSelected(allChecked ? [] : rows.map((r) => r.threadId))}
                  aria-label="すべて選択"
                />
              </th>
              {/* 対応ボタンは右端だと横スクロールで隠れて見つけられないため先頭に置く（2026-08-12） */}
              <th className="px-4 py-3 font-medium">対応</th>
              <th className="px-4 py-3 font-medium">ステータス</th>
              <th className="px-4 py-3 font-medium">{isGive ? "問い合わせ企業" : "提案企業"}</th>
              <th className="px-4 py-3 font-medium">提示額（税込）</th>
              <th className="px-4 py-3 font-medium">お気に入り・メモ（非公開）</th>
              <th className="px-4 py-3 font-medium">最終更新日</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.threadId}
                className={`border-b border-[var(--line-soft)] last:border-b-0 ${r.unread > 0 ? "bg-[var(--orange-soft)]" : ""}`}
              >
                <td className="px-3 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={selected.includes(r.threadId)}
                    onChange={() => toggle(r.threadId)}
                    aria-label={`${r.otherName} を選択`}
                  />
                </td>

                <td className="px-4 py-3 align-top">
                  <Link
                    href={`/ledger/${offeringId}/proposals/${r.threadId}`}
                    className={`${btn(r.locked || r.unread > 0 ? "action" : "primary", "sm")} whitespace-nowrap`}
                  >
                    {r.locked ? "開いて読む" : r.unread > 0 ? "対応する" : "やり取りを見る"}
                  </Link>
                </td>

                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col items-start gap-1">
                    {r.locked ? (
                      <span className="rounded-full bg-[var(--orange)] px-2 py-0.5 text-[10px] font-bold text-white">
                        未開封
                      </span>
                    ) : null}
                    {r.unread > 0 ? (
                      <span className="rounded-full bg-[var(--red)] px-2 py-0.5 text-[10px] font-bold text-white">
                        未返信 {r.unread}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-[var(--green-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--green-d)]">
                      {r.phaseLabel}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 align-top">
                  <div className="flex gap-2">
                    <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white font-serif text-[14px] text-[var(--green-d)]">
                      {r.otherLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.otherLogoUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        (r.otherName[0] ?? "?").toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      {/* 事業者ページの戻り先をこの一覧にする（既定は /search で戻れなかった） */}
                      <Link
                        href={`/producers/${r.otherId}?from=${encodeURIComponent(`/ledger/${offeringId}/proposals`)}`}
                        className="block max-w-[190px] truncate font-bold text-[var(--ink)] hover:text-[var(--green-d)] hover:underline"
                      >
                        {r.otherName}
                      </Link>
                      <div className="text-[11px] text-[var(--muted)]">{r.otherPlace || "地域未設定"}</div>
                      <div className="text-[11px] text-[var(--muted)]">{r.otherIndustry}</div>
                      <p className="mt-1 line-clamp-2 max-w-[240px] text-[12px] leading-5 text-[var(--ink-2)]">
                        {r.firstBody || "（ファイル）"}
                      </p>
                      {r.locked ? (
                        <div className="text-[10px] font-bold text-[var(--orange)]">
                          全文は開封すると読めます（1クレジット）
                        </div>
                      ) : null}
                      <div className="text-[10px] text-[var(--muted)]">初回：{r.firstAt}</div>
                    </div>
                  </div>
                </td>

                <td className="whitespace-nowrap px-4 py-3 align-top">
                  {r.proposedAmount != null ? (
                    <span className="text-[15px] font-bold text-[var(--ink)]">
                      {r.proposedAmount.toLocaleString()}
                      <span className="ml-0.5 text-[11px] font-normal text-[var(--muted)]">円</span>
                    </span>
                  ) : (
                    <span className="text-[12px] text-[var(--muted)]">未提示</span>
                  )}
                </td>

                <td className="px-4 py-3 align-top">
                  <Stars offeringId={offeringId} threadId={r.threadId} value={r.rating} memo={r.memo} />
                  <MemoBox
                    offeringId={offeringId}
                    threadId={r.threadId}
                    rating={r.rating}
                    memo={r.memo}
                  />
                </td>

                <td className="whitespace-nowrap px-4 py-3 align-top text-[12px] text-[var(--ink-2)]">
                  {r.lastAt}
                  <div className="text-[10px] text-[var(--muted)]">
                    {r.lastFromMe ? "自分が送信" : "相手から"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
