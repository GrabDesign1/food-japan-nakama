"use client";

import { useState } from "react";
import { saveNote } from "./actions";
import { btn, input } from "@/lib/ui";

/**
 * 交換した相手への自分用メモ。
 * ⚠️ **相手には見えない**（CardExchange の noteA / noteB を当事者ごとに分けている）。
 *    画面にもその旨を出すこと。見えると思われると誰も書かない。
 */
export function CardNote({ exchangeId, note }: { exchangeId: string; note: string | null }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-[12px] text-[var(--green-d)] hover:underline"
      >
        {note ? "メモを編集" : "メモを書く"}
      </button>
    );
  }

  return (
    <form action={saveNote} className="mt-2" onSubmit={() => setOpen(false)}>
      <input type="hidden" name="exchangeId" value={exchangeId} />
      <textarea
        name="note"
        defaultValue={note ?? ""}
        rows={3}
        maxLength={2000}
        autoFocus
        placeholder="どんな話をしたか、次に何をするか"
        className={`${input("sm")} w-full resize-y`}
      />
      <div className="mt-1 flex items-center gap-2">
        <button type="submit" className={btn("primary", "sm")}>保存</button>
        <button type="button" onClick={() => setOpen(false)} className={btn("ghost", "sm")}>やめる</button>
        <span className="text-[11px] text-[var(--muted)]">相手には見えません</span>
      </div>
    </form>
  );
}
