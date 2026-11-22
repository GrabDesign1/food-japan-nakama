"use client";

// 集まりを立てる欄（2026-11-23）。
// ⚠️ **軽く書けること**を最優先。題名と本文だけで出せる。
//    日時・場所・人数が必須だと、「5月ごろ田んぼやりたい」が書けなくなる。
// ⚠️ 入力は制御コンポーネント（React 19 はアクション完了時に form をリセットする）。
import { useActionState, useEffect, useState } from "react";
import { PREFECTURES } from "@/lib/member-taxonomy";
import { btn, input as inputCls } from "@/lib/ui";
import {
  GATHERING_TITLE_MAX, GATHERING_BODY_MAX, TIME_NOTE_EXAMPLES,
} from "@/lib/gathering-core";
import { submitGathering, type GatheringState } from "../actions";

const EMPTY = { title: "", body: "", startAt: "", timeNote: "", prefecture: "", place: "", capacity: "" };

export function GatheringComposer({ myName }: { myName: string }) {
  const [v, setV] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<GatheringState, FormData>(submitGathering, {});

  useEffect(() => {
    if (state?.ok) { setV(EMPTY); setOpen(false); }
  }, [state]);

  const set =
    (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setV((p) => ({ ...p, [k]: e.target.value }));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-[10px] border border-dashed border-[var(--line)] bg-white px-4 py-5 text-left text-[14px] text-[var(--muted)] transition hover:border-[var(--green)] hover:text-[var(--green-d)]"
      >
        {myName}さん、集まりませんか？　──　押して書く
      </button>
    );
  }

  return (
    <form action={action} className="rounded-[10px] border border-[var(--line)] bg-white px-4 py-4 sm:px-5" noValidate>
      <label className="block">
        <span className="text-[11px] font-medium text-[var(--muted)]">どんな集まり？（必須）</span>
        <input
          name="title" value={v.title} onChange={set("title")} maxLength={GATHERING_TITLE_MAX}
          placeholder="田植えを一緒にやりませんか（宮崎）"
          className={`${inputCls()} mt-1 w-full`}
        />
      </label>

      <label className="mt-3 block">
        <span className="text-[11px] font-medium text-[var(--muted)]">中身（必須）</span>
        <textarea
          name="body" value={v.body} onChange={set("body")} rows={4}
          maxLength={GATHERING_BODY_MAX}
          placeholder={"どなたに来てほしいか、何をするか、何を持ち帰ってほしいかを書いてください。\n決まっていないことは「相談しながら決めます」で構いません。"}
          className={`${inputCls()} mt-1 w-full resize-y leading-[1.9]`}
        />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-medium text-[var(--muted)]">日時（決まっていれば）</span>
          <input type="datetime-local" name="startAt" value={v.startAt} onChange={set("startAt")}
            className={`${inputCls("sm")} mt-1 w-full`} />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-[var(--muted)]">
            まだなら、ざっくりで（{TIME_NOTE_EXAMPLES.join("・")}）
          </span>
          <input name="timeNote" value={v.timeNote} onChange={set("timeNote")} maxLength={60}
            placeholder="5月ごろ" className={`${inputCls("sm")} mt-1 w-full`} />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-[var(--muted)]">都道府県</span>
          <select name="prefecture" value={v.prefecture} onChange={set("prefecture")}
            className={`${inputCls("sm")} mt-1 w-full`}>
            <option value="">選んでください</option>
            {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-[var(--muted)]">場所（ざっくりで）</span>
          <input name="place" value={v.place} onChange={set("place")} maxLength={100}
            placeholder="都城市内／オンライン／未定" className={`${inputCls("sm")} mt-1 w-full`} />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-[var(--muted)]">何人くらい（任意）</span>
          <input name="capacity" value={v.capacity} onChange={set("capacity")} inputMode="numeric"
            placeholder="10" className={`${inputCls("sm")} mt-1 w-full`} />
        </label>
      </div>

      <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0" />

      {state?.error ? (
        <p className="mt-3 rounded-[8px] border border-[#E7C7BE] bg-[var(--red-soft)] px-3 py-2 text-[13px] leading-6 text-[var(--red)]">
          {state.error}
        </p>
      ) : null}

      <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
        会員の方全員に見えます。日時も場所も未定で出して構いません。
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button type="submit" disabled={pending} className={btn("primary", "sm")}>
          {pending ? "立てています…" : "集まりを立てる"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btn("secondary", "sm")}>
          やめる
        </button>
        <span className="ml-auto text-[11px] text-[var(--muted)]">
          {v.title.length} / {GATHERING_TITLE_MAX}
        </span>
      </div>
    </form>
  );
}
