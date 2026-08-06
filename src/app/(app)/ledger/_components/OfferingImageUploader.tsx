"use client";

import { useRef, useState, useTransition } from "react";
import { uploadOfferingImage, removeOfferingImage } from "../actions";

const MAX = 6;

export function OfferingImageUploader({
  offeringId,
  images,
}: {
  offeringId: string;
  images: string[];
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
      const res = await uploadOfferingImage(offeringId, fd);
      if (res.error) setError(res.error);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] text-[var(--ink-2)]">
        サムネイル・ギャラリー画像（最大{MAX}枚。1枚目が一覧のサムネイルになります）
      </div>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div
            key={url}
            className="relative h-28 w-28 overflow-hidden rounded-md border border-[var(--line)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            {i === 0 ? (
              <span className="absolute left-1 top-1 rounded bg-[var(--green)] px-1.5 py-0.5 text-[9px] text-white">
                サムネ
              </span>
            ) : null}
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await removeOfferingImage(offeringId, url);
                })
              }
              disabled={pending}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white hover:bg-black/80"
              aria-label="削除"
            >
              ×
            </button>
          </div>
        ))}
        {images.length < MAX ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="grid h-28 w-28 place-items-center rounded-md border border-dashed border-[var(--line)] text-[12px] text-[var(--muted)] hover:border-[var(--green)] hover:text-[var(--green-d)] disabled:opacity-60"
          >
            {pending ? "処理中…" : "＋ 追加"}
          </button>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
      {error ? <p className="text-[12px] text-[var(--red)]">{error}</p> : null}
    </div>
  );
}
