"use client";

import { useRef, useState, useTransition } from "react";
import { uploadMemberImage, removeMemberImage } from "../actions";

const MAX = 4;

export function ImageUploader({ images }: { images: string[] }) {
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
      const res = await uploadMemberImage(fd);
      if (res.error) setError(res.error);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function onRemove(url: string) {
    setError(null);
    startTransition(async () => {
      await removeMemberImage(url);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] text-[var(--ink-2)]">
        サムネイル画像（最大{MAX}枚・各5MBまで）
      </div>
      <div className="flex flex-wrap gap-3">
        {images.map((url) => (
          <div
            key={url}
            className="relative h-24 w-24 overflow-hidden rounded-md border border-[var(--line)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(url)}
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
            className="grid h-24 w-24 place-items-center rounded-md border border-dashed border-[var(--line)] text-[12px] text-[var(--muted)] hover:border-[var(--green)] hover:text-[var(--green-d)] disabled:opacity-60"
          >
            {pending ? "処理中…" : "＋ 追加"}
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />
      {error ? <p className="text-[12px] text-[var(--red)]">{error}</p> : null}
    </div>
  );
}
