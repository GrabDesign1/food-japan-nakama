"use client";

/**
 * 【取引のあとの評価】2026-11-28（ユーザー決定・B案）。
 *
 * ⚠️⚠️ **星はつけない。** 1問だけ＝「またこの会社と取引したいですか」。
 *    取引件数が少ないうちは、星の平均がブレて意味を持たない（会員211名・記録はほぼ0）。
 * ⚠️⚠️ **両者が出すまで、相手の答えは見えない。** 画面にもそう書いてある。
 *    書いてないと「相手の評価を見てから書こう」と待たれ、どちらも書かなくなる。
 * ⚠️ 出し直しはできない（1取引1回）。だから送信前に注意書きを出す。
 */
import { useActionState } from "react";
import { submitDealReview, type ReviewState } from "./review-actions";
import { btn, h2FormCls } from "@/lib/ui";

const COMMENT_MAX = 80;

export function ReviewPanel({
  offeringId,
  threadId,
  otherName,
  /** 自分が出した評価（null＝まだ） */
  mine: mineInit,
  /** 相手も出したか。両方そろうと公開される */
  bothDone,
}: {
  offeringId: string;
  threadId: string;
  otherName: string;
  mine: { wouldWorkAgain: boolean; comment: string | null } | null;
  bothDone: boolean;
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(
    submitDealReview.bind(null, offeringId, threadId),
    {}
  );

  // すでに出している（サーバー側の値、または今送ったところ）
  if (mineInit || state.ok) {
    return (
      <section className="rounded-[16px] border border-[var(--line)] bg-white px-5 py-4">
        <h2 className={h2FormCls}>この取引の評価</h2>
        <p className="mt-1 text-[14px] leading-[21px] text-[var(--ink-2)]">
          ありがとうございました。評価をお預かりしています。
        </p>
        <p className="mt-1 text-[12px] leading-[17px] text-[var(--muted)]">
          {bothDone
            ? `${otherName} の評価もそろったので、両方とも公開されています。`
            : `${otherName} が出すまで、どちらの内容も公開されません（14日たてば、出していただいた分だけ公開します）。`}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[16px] border border-[var(--line)] bg-white px-5 py-4">
      <h2 className={h2FormCls}>この取引の評価</h2>
      <p className="mt-1 text-[12px] leading-[17px] text-[var(--muted)]">
        {/* ⚠️ この2行を消さないこと。報復を防ぐ仕組みは、書いてあって初めて効く */}
        <b className="text-[var(--ink)]">{otherName} が出すまで、あなたの答えは相手に見えません。</b>
        <br />
        出し直しはできません。金額やお取引の中身は公開されません。
      </p>

      <form action={action} className="mt-3 flex flex-col gap-3">
        <fieldset className="border-0 p-0">
          <legend className="text-[14px] font-bold leading-[21px] text-[var(--ink)]">
            また {otherName} と取引したいですか
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { v: "yes", label: "はい" },
              { v: "no", label: "いいえ" },
            ].map((o) => (
              <label
                key={o.v}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--line)] px-5 py-2.5 text-[14px] text-[var(--ink)] has-[:checked]:border-[var(--green)] has-[:checked]:bg-[var(--green-soft)]"
              >
                <input
                  type="radio"
                  name="wouldWorkAgain"
                  value={o.v}
                  required
                  className="h-[18px] w-[18px] accent-[var(--green)]"
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="review-comment"
            className="text-[12px] leading-[17px] text-[var(--muted)]"
          >
            一言（任意・{COMMENT_MAX}字まで）
          </label>
          <textarea
            id="review-comment"
            name="comment"
            rows={2}
            maxLength={COMMENT_MAX}
            placeholder="例：連絡が早く、数量の相談にも応じてくれました"
            className="mt-1 w-full resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[16px] leading-[26px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
          />
        </div>

        {state.error ? (
          <p className="text-[14px] text-[var(--red)]">{state.error}</p>
        ) : null}

        <div>
          <button type="submit" disabled={pending} className={btn("primary", "md")}>
            {pending ? "送っています…" : "評価を出す"}
          </button>
        </div>
      </form>
    </section>
  );
}
