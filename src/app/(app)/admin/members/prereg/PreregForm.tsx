"use client";

// 事務局：登壇者を先に登録する欄（2026-11-23）。
// ⚠️ 入力は制御コンポーネントにする（React 19 はアクション完了時に form をリセットするため、
//    defaultValue 方式だと送信エラーで書いた内容が消える）。
import { useActionState, useEffect, useState } from "react";
import { CATEGORY_L1, PREFECTURES } from "@/lib/member-taxonomy";
import { input as inputCls, btn } from "@/lib/ui";
import { aCard, aCardBody, aCardHead, aH2, aLabel, aNote } from "../../_components/adminUi";
import { addPrereg, type PreregState } from "../prereg-actions";

const EMPTY = { name: "", contactName: "", categoryL1: "", prefecture: "", website: "", email: "", note: "" };

export function PreregForm({ defaultNote }: { defaultNote: string }) {
  const [v, setV] = useState({ ...EMPTY, note: defaultNote });
  const [state, action, pending] = useActionState<PreregState, FormData>(addPrereg, {});

  useEffect(() => {
    if (state?.ok) setV({ ...EMPTY, note: defaultNote });
  }, [state, defaultNote]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form action={action} className={aCard}>
      <div className={aCardHead}>
        <h2 className={aH2}>登壇者を先に登録する</h2>
        <span className="ml-auto text-[11px] text-[var(--muted)]">
          非公開で作ります・メールは送りません
        </span>
      </div>
      <div className={aCardBody}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={aLabel}>事業者名（必須）</span>
            <input value={v.name} onChange={set("name")} required maxLength={120}
              placeholder="株式会社〇〇" className={`${inputCls("sm")} mt-1 w-full`} name="name" />
          </label>
          <label className="block">
            <span className={aLabel}>登壇者のお名前</span>
            <input value={v.contactName} onChange={set("contactName")} maxLength={80}
              placeholder="山田 太一" className={`${inputCls("sm")} mt-1 w-full`} name="contactName" />
          </label>
          <label className="block">
            <span className={aLabel}>業種（必須）</span>
            <select value={v.categoryL1} onChange={set("categoryL1")} required
              className={`${inputCls("sm")} mt-1 w-full`} name="categoryL1">
              <option value="">選んでください</option>
              {CATEGORY_L1.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={aLabel}>都道府県</span>
            <select value={v.prefecture} onChange={set("prefecture")}
              className={`${inputCls("sm")} mt-1 w-full`} name="prefecture">
              <option value="">選んでください</option>
              {PREFECTURES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={aLabel}>ホームページ</span>
            <input value={v.website} onChange={set("website")} maxLength={300} type="url"
              placeholder="https://" className={`${inputCls("sm")} mt-1 w-full`} name="website" />
          </label>
          <label className="block">
            <span className={aLabel}>ご本人のメール（任意）</span>
            <input value={v.email} onChange={set("email")} maxLength={200} type="email"
              placeholder="example@example.co.jp" className={`${inputCls("sm")} mt-1 w-full`}
              name="email" autoComplete="off" />
          </label>
        </div>
        <label className="mt-3 block">
          <span className={aLabel}>控え（どの会のどの登壇か）</span>
          <input value={v.note} onChange={set("note")} maxLength={500}
            className={`${inputCls("sm")} mt-1 w-full`} name="note" />
        </label>

        <p className={`${aNote} mt-3`}>
          入れたメールには<strong>何も送りません</strong>。ご本人が同じメールでご自身で登録されたとき、
          この行につながります（会社名・都道府県が引き継がれ、二重に増えません）。
          <br />
          登録した時点では<strong>誰にも見えません</strong>。検索・プロフィール・メッセージの送り先の
          どこにも出ません。見えるようにするのは下の一覧の「公開する」からです。
        </p>

        {state?.error ? (
          <p className="mt-3 rounded border border-[#E7C7BE] bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">
            {state.error}
          </p>
        ) : null}
        {state?.ok ? (
          <p className="mt-3 rounded border border-[#BCD9C6] bg-[var(--green-soft)] px-3 py-2 text-[12px] text-[var(--green-d)]">
            {state.message}
          </p>
        ) : null}

        <div className="mt-3">
          <button type="submit" disabled={pending} className={btn("primary", "sm")}>
            {pending ? "登録しています…" : "非公開で登録する"}
          </button>
        </div>
      </div>
    </form>
  );
}
