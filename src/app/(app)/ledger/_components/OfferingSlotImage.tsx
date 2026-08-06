"use client";

import { useRef, useState, useTransition } from "react";
import { setOfferingSlotImage, clearOfferingSlotImage } from "../actions";

export function OfferingSlotImage({
  offeringId,
  slot,
  url,
}: {
  offeringId: string;
  slot: "description" | "points";
  url: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const res = await setOfferingSlotImage(offeringId, slot, fd);
      if (res.error) setError(res.error);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="mt-1">
      {url ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="h-32 w-52 rounded-md border border-[var(--line)] object-cover"
          />
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await clearOfferingSlotImage(offeringId, slot);
              })
            }
            disabled={pending}
            className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white hover:bg-black/80"
            aria-label="削除"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="rounded-md border border-dashed border-[var(--line)] px-4 py-2 text-[12px] text-[var(--muted)] hover:border-[var(--green)] hover:text-[var(--green-d)] disabled:opacity-60"
        >
          {pending ? "処理中…" : "＋ このセクションに画像を追加"}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
      {error ? <p className="mt-1 text-[12px] text-[var(--red)]">{error}</p> : null}
    </div>
  );
}
