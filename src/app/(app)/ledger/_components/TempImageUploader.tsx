"use client";

// 新規登録フォーム用の画像アップローダ。
// 選んだ瞬間に一時領域へアップロードし、URLは親（フォーム）のstateで管理。
// 保存時に hidden input（tempImageUrls）として送信され、サーバー側で案件へ紐付く。
import { useRef, useState, useTransition } from "react";
import { uploadTempOfferingImage, removeTempOfferingImage } from "../actions";

const MAX = 6;

export function TempImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
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
      const res = await uploadTempOfferingImage(fd);
      if (res.error) setError(res.error);
      if (res.url) onChange([...images, res.url]);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] text-[var(--ink-2)]">
        写真（最大{MAX}枚。1枚目が一覧のサムネイルになります。商品の状態や量が分かる写真を3枚程度推奨）
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
                  await removeTempOfferingImage(url);
                  onChange(images.filter((u) => u !== url));
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
