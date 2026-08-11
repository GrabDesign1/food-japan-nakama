"use client";

// 掲載代行フォーム（事務局が会員に代わって案件の下書きを作る）。
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createOfferingForMember, type ProxyListingState } from "../listing-proxy-actions";
import { OFFERING_CATEGORIES } from "@/lib/offering-taxonomy";
import { btn } from "@/lib/ui";

const fieldCls =
  "w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--green)]";
const labelCls = "text-[12px] font-medium text-[var(--ink-2)]";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btn("primary", "md")}>
      {pending ? "作成中…" : "下書きを作って編集する"}
    </button>
  );
}

export function ProxyListingForm({
  members,
}: {
  members: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ProxyListingState, FormData>(createOfferingForMember, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className={labelCls} htmlFor="proxy-member">
            掲載する会員（名義）
          </label>
          <select id="proxy-member" name="memberId" className={fieldCls} defaultValue="">
            <option value="">選択してください</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls} htmlFor="proxy-direction">
            区分
          </label>
          <select id="proxy-direction" name="direction" className={fieldCls} defaultValue="WANT">
            <option value="WANT">探している（調達したい）</option>
            <option value="GIVE">売りたい（提供したい）</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls} htmlFor="proxy-category">
            分類
          </label>
          <select id="proxy-category" name="category" className={fieldCls} defaultValue="食材・原料">
            {OFFERING_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.key}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls} htmlFor="proxy-title">
            案件名（あとで編集できます）
          </label>
          <input
            id="proxy-title"
            name="title"
            className={fieldCls}
            placeholder="例：クリスマスケーキ用のいちごを探している"
          />
        </div>
      </div>

      {state.error ? <p className="text-[12px] text-[var(--red)]">{state.error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        <span className="text-[11px] leading-5 text-[var(--muted)]">
          下書き（非公開）として作成します。内容を入力したら、必ず掲載者ご本人に確認してから公開してください。
        </span>
      </div>
    </form>
  );
}
