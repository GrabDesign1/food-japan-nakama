"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createBanner, type BannerState } from "../banner-actions";
import { btn, input } from "@/lib/ui";

const INIT: BannerState = {};

export function BannerManager() {
  const [state, action, pending] = useActionState(createBanner, INIT);
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // 追加成功でフォームをリセット（プレビューは form の reset イベントで消す）
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok, state.message]);

  return (
    <form
      ref={formRef}
      action={action}
      onReset={() => setPreview(null)}
      className="flex flex-col gap-3 rounded-[10px] border border-[var(--line)] bg-white p-4"
    >
      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        バナー画像（横長・5MBまで）
        <input
          type="file"
          name="file"
          accept="image/*"
          required
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
          className="text-[13px]"
        />
      </label>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="プレビュー"
          className="max-h-[110px] w-full rounded-lg border border-[var(--line)] object-contain bg-[var(--canvas)]"
        />
      ) : null}

      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        リンク先URL（クリックで開くページ・任意）
        <input
          name="linkUrl"
          placeholder="https://example.com/campaign"
          className={input()}
        />
      </label>

      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        管理用の名前（任意）
        <input
          name="title"
          placeholder="例：relay体験キャンペーン"
          className={input()}
        />
      </label>

      {state.error ? (
        <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="rounded-md bg-[var(--green-soft)] px-3 py-2 text-[12px] text-[var(--green-d)]">{state.message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <p className="text-[11px] text-[var(--muted)]">
          画像は横長（目安 5:1）だときれいに並びます。
        </p>
        <button
          disabled={pending}
          className={`${btn("primary")} ml-auto`}
        >
          {pending ? "アップロード中…" : "バナーを追加"}
        </button>
      </div>
    </form>
  );
}
