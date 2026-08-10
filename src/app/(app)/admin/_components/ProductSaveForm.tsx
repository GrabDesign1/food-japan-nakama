"use client";

// 商品マスター行の保存フォーム（保存後に「✓ 保存しました」を数秒表示する）。
import { useActionState, useEffect, useState } from "react";
import type { ProductUpdateState } from "../billing-actions";
import { btn } from "@/lib/ui";

export function ProductSaveForm({
  formId,
  action,
}: {
  formId: string;
  action: (prev: ProductUpdateState, formData: FormData) => Promise<ProductUpdateState>;
}) {
  const [state, formAction, pending] = useActionState<ProductUpdateState, FormData>(action, {});
  const [shown, setShown] = useState(false);

  // 保存成功のたび（at が毎回変わる）にトーストを出し、2.5秒で消す
  useEffect(() => {
    if (state.ok) {
      setShown(true);
      const t = setTimeout(() => setShown(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state.ok, state.at]);

  return (
    <form id={formId} action={formAction} className="flex items-center gap-2">
      <button disabled={pending} className={`${btn("secondary", "sm")} disabled:opacity-50`}>
        {pending ? "保存中…" : "保存"}
      </button>
      {shown ? (
        <span className="whitespace-nowrap text-[11px] font-bold text-[var(--green-d)]">✓ 保存しました</span>
      ) : state.error ? (
        <span className="whitespace-nowrap text-[11px] text-[var(--red)]">{state.error}</span>
      ) : null}
    </form>
  );
}
