"use client";

// 新規登録フォーム用の画像アップローダ（共創プロジェクト版。売りたい（提供したい）の TempImageUploader と同仕様）。
// 選んだ瞬間に一時領域へアップロードし、URLは親（フォーム）のstateで管理。
// 保存時に hidden input（tempImageUrls）として送信され、サーバー側でプロジェクトへ紐付く。
import { useRef, useState, useTransition } from "react";
import { uploadTempProjectImage, removeTempProjectImage } from "../actions";

const MAX = 6;

export function ProjectTempImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setWarning(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const res = await uploadTempProjectImage(fd);
      if (res.error) setError(res.error);
      if (res.warning) setWarning(res.warning);
      if (res.url) onChange([...images, res.url]);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] text-[var(--ink-2)]">
        画像（最大{MAX}枚。<b>1枚目がメイン画像</b>です。ドラッグ、または ◀ ▶ で並べ替えできます）
        <div className="mt-0.5 text-[11px] text-[var(--muted)]">
          おすすめ：①対象の商品・原料・現場 ②課題が分かる写真 ③完成イメージ ④生産・製造風景
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div
            key={url}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIdx !== null) move(dragIdx, i);
              setDragIdx(null);
            }}
            onDragEnd={() => setDragIdx(null)}
            className={`relative h-28 w-28 cursor-grab overflow-hidden rounded-md border active:cursor-grabbing ${
              dragIdx === i ? "border-[var(--green)] opacity-60" : "border-[var(--line)]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
            {i === 0 ? (
              <span className="absolute left-1 top-1 rounded bg-[var(--green)] px-1.5 py-0.5 text-[9px] text-white">
                メイン
              </span>
            ) : null}
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await removeTempProjectImage(url);
                  onChange(images.filter((u) => u !== url));
                })
              }
              disabled={pending}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white hover:bg-black/80"
              aria-label="削除"
            >
              ×
            </button>
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/40 px-1">
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                className="px-1 py-0.5 text-[11px] text-white disabled:opacity-30"
                aria-label="左へ移動"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === images.length - 1}
                className="px-1 py-0.5 text-[11px] text-white disabled:opacity-30"
                aria-label="右へ移動"
              >
                ▶
              </button>
            </div>
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
      {warning ? (
        <p className="rounded-md bg-[#FAF0D6] px-3 py-2 text-[12px] leading-5 text-[#7A5A0B]">⚠️ {warning}</p>
      ) : null}
    </div>
  );
}
