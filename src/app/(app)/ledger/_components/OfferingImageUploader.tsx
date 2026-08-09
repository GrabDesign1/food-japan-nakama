"use client";

// 台帳のギャラリー画像。ドラッグ＆ドロップ（スマホは◀▶ボタン）で並べ替え可能。1枚目=メイン画像。
import { useRef, useState, useTransition } from "react";
import { uploadOfferingImage, removeOfferingImage, reorderOfferingImages } from "../actions";

const MAX = 10;

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
  const [warning, setWarning] = useState<string | null>(null);
  const [list, setList] = useState<string[]>(images);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setWarning(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const res = await uploadOfferingImage(offeringId, fd);
      if (res.error) setError(res.error);
      if (res.warning) setWarning(res.warning);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function applyOrder(next: string[]) {
    setList(next);
    startTransition(async () => {
      await reorderOfferingImages(offeringId, next);
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    applyOrder(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] text-[var(--ink-2)]">
        サムネイル・ギャラリー画像（最大{MAX}枚。<b>1枚目がメイン画像</b>です。ドラッグ、または ◀ ▶ で並べ替えできます）
        <div className="mt-0.5 text-[11px] text-[var(--muted)]">
          おすすめ：①商品全体 ②パッケージ ③中身・提供シーン ④製造風景 ⑤作り手 ⑥原料や産地の風景
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {list.map((url, i) => (
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
                  await removeOfferingImage(offeringId, url);
                  setList((cur) => cur.filter((u) => u !== url));
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
                disabled={pending || i === 0}
                className="px-1 py-0.5 text-[11px] text-white disabled:opacity-30"
                aria-label="左へ移動"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={pending || i === list.length - 1}
                className="px-1 py-0.5 text-[11px] text-white disabled:opacity-30"
                aria-label="右へ移動"
              >
                ▶
              </button>
            </div>
          </div>
        ))}
        {list.length < MAX ? (
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
