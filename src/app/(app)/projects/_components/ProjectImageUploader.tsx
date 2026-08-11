"use client";

// 編集画面用の画像アップローダ（旧 ProjectForm から切り出し。DnD＋◀▶並べ替え・低解像度警告つき）。
import { useRef, useState, useTransition } from "react";
import {
  uploadProjectImage,
  removeProjectImage,
  reorderProjectImages,
} from "../actions";

const MAX = 6;

export function ProjectImageUploader({
  projectId,
  images,
}: {
  projectId: string;
  images: string[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [imgList, setImgList] = useState<string[]>(images);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= imgList.length || from === to) return;
    const next = [...imgList];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setImgList(next);
    startTransition(async () => {
      await reorderProjectImages(projectId, next);
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setError(null);
    setWarning(null);
    startTransition(async () => {
      // 一覧の反映は revalidatePath ＋ フォームの key（updatedAt）再マウントに任せる（台帳と同じ方式）
      const res = await uploadProjectImage(projectId, fd);
      if (res.error) setError(res.error);
      if (res.warning) setWarning(res.warning);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] text-[var(--ink-2)]">
        画像（最大{MAX}枚。<b>1枚目がメイン画像</b>です。ドラッグ、または ◀ ▶ で並べ替えできます）
      </div>
      <div className="flex flex-wrap gap-3">
        {imgList.map((url, i) => (
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
                  await removeProjectImage(projectId, url);
                  setImgList((cur) => cur.filter((u) => u !== url));
                })
              }
              disabled={pending}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white"
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
                disabled={pending || i === imgList.length - 1}
                className="px-1 py-0.5 text-[11px] text-white disabled:opacity-30"
                aria-label="右へ移動"
              >
                ▶
              </button>
            </div>
          </div>
        ))}
        {imgList.length < MAX ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="grid h-28 w-28 place-items-center rounded-md border border-dashed border-[var(--line)] text-[12px] text-[var(--muted)] hover:border-[var(--green)]"
          >
            {pending ? "処理中…" : "＋ 追加"}
          </button>
        ) : null}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
      {error ? <p className="text-[12px] text-[var(--red)]">{error}</p> : null}
      {warning ? (
        <p className="rounded-md bg-[var(--amber-soft)] px-3 py-2 text-[12px] leading-5 text-[var(--amber-ink)]">⚠️ {warning}</p>
      ) : null}
    </div>
  );
}
