"use client";

// 「興味があります」フォーム（重い参加申請ではなく、軽い接点づくり。指示書 §8）
import { useActionState } from "react";
import { applyToProject, type ProjectState } from "../actions";
import { MEETING_WISHES } from "@/lib/project-taxonomy";
import { btn } from "@/lib/ui";

const inputCls =
  "rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]";
const labelCls = "flex flex-col gap-1 text-[12px] text-[var(--ink-2)]";

export function InterestForm({
  projectId,
  roleNames,
}: {
  projectId: string;
  roleNames: string[];
}) {
  const action = applyToProject.bind(null, projectId);
  const [state, formAction, pending] = useActionState<ProjectState, FormData>(action, {});

  if (state.ok) {
    return (
      <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-5 text-center">
        <p className="text-[14px] font-bold text-[var(--green-d)]">興味を伝えました</p>
        <p className="mt-1 text-[13px] text-[var(--ink-2)]">
          主催者に通知が届きました。返信をお待ちください。
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="text-[15px] font-bold text-[var(--ink)]">このプロジェクトに興味があります</div>
      <p className="text-[12px] leading-5 text-[var(--muted)]">
        まずは気軽に接点をつくるための連絡です。参加の確約ではありません。
      </p>

      <label className={labelCls}>
        <span>興味を持った理由<span className="ml-1 text-[11px] text-[var(--red)]">必須</span></span>
        <textarea
          name="reason"
          rows={3}
          placeholder="例：規格外原料の活用に取り組んでおり、加工の面で力になれそうだと感じました。"
          className={inputCls}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          <span>自社・本人が提供できるもの<span className="ml-1 text-[11px] text-[var(--muted)]">任意</span></span>
          <textarea
            name="offer"
            rows={2}
            placeholder="例：菓子製造ライン・小ロット試作の設備"
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          <span>希望する関わり方<span className="ml-1 text-[11px] text-[var(--muted)]">任意</span></span>
          <textarea
            name="involvement"
            rows={2}
            placeholder="例：まず試作で協力し、量産まで見据えたい"
            className={inputCls}
          />
        </label>
      </div>

      {roleNames.length ? (
        <label className={labelCls}>
          <span>希望する役割<span className="ml-1 text-[11px] text-[var(--muted)]">任意</span></span>
          <select name="desiredRole" defaultValue="" className={inputCls}>
            <option value="">未選択</option>
            {roleNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
            <option value="その他">その他・相談したい</option>
          </select>
        </label>
      ) : null}

      <div>
        <div className="mb-1.5 text-[12px] text-[var(--ink-2)]">面談の希望</div>
        <div className="flex flex-wrap gap-2">
          {MEETING_WISHES.map(([value, label], i) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3.5 py-2 text-[13px] text-[var(--ink)] has-[:checked]:border-[var(--green)] has-[:checked]:bg-[var(--green-soft)] has-[:checked]:font-bold has-[:checked]:text-[var(--green-d)]"
            >
              <input
                type="radio"
                name="meetingWish"
                value={value}
                defaultChecked={i === 1}
                className="accent-[var(--green)]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <label className={labelCls}>
        <span>主催者へ伝えたいこと<span className="ml-1 text-[11px] text-[var(--muted)]">任意</span></span>
        <textarea
          name="note"
          rows={2}
          placeholder="そのほか、伝えておきたいことがあればお書きください。"
          className={inputCls}
        />
      </label>

      <div className="flex items-center gap-3">
        <button disabled={pending} className={`${btn("primary")} w-fit`}>
          {pending ? "送信中…" : "興味があります を送る"}
        </button>
        {state.error ? <span className="text-[12px] text-[var(--red)]">{state.error}</span> : null}
      </div>
      <p className="text-[11px] leading-5 text-[var(--muted)]">
        送信すると、入力内容が主催者に共有されます（利用規約の範囲内で取り扱われます）。
      </p>
    </form>
  );
}
