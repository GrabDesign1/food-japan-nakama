"use client";

import { useState } from "react";
import { saveCardSettings } from "./actions";
import { btn, input } from "@/lib/ui";

/**
 * カードに出す内容の設定。
 * ⚠️ 氏名・会社名・地域は **Member から都度引く**のでここには無い。
 *    ここで持つのは「カード用の肩書き」と「一言」と「交換を受け付けるか」だけ。
 *    複製して持つと、プロフィールを直しても古い情報がカードに残る。
 */
export function CardSettings({
  jobTitle,
  headline,
  isActive,
}: {
  jobTitle: string | null;
  headline: string | null;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${btn("ghost", "sm")} mt-3`}>
        カードの内容を設定
      </button>
    );
  }

  return (
    <form action={saveCardSettings} className="mt-4 border-t border-[var(--line)] pt-4" onSubmit={() => setOpen(false)}>
      <label className="block">
        <span className="text-[11px] text-[var(--muted)]">肩書き（任意）</span>
        <input name="jobTitle" defaultValue={jobTitle ?? ""} maxLength={100}
               placeholder="代表取締役 / 営業部長 など" className={`${input("sm")} mt-1 w-full`} />
      </label>
      <label className="mt-3 block">
        <span className="text-[11px] text-[var(--muted)]">一言（任意）</span>
        <input name="headline" defaultValue={headline ?? ""} maxLength={140}
               placeholder="いま探しているもの、話したいこと" className={`${input("sm")} mt-1 w-full`} />
      </label>
      <label className="mt-3 flex items-center gap-2 text-[13px] text-[var(--ink-2)]">
        <input type="checkbox" name="isActive" defaultChecked={isActive} className="h-4 w-4" />
        カードの交換を受け付ける
      </label>
      <div className="mt-3 flex gap-2">
        <button type="submit" className={btn("primary", "sm")}>保存</button>
        <button type="button" onClick={() => setOpen(false)} className={btn("ghost", "sm")}>やめる</button>
      </div>
    </form>
  );
}
