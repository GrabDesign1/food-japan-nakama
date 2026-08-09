"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  saveProject,
  uploadProjectImage,
  removeProjectImage,
  reorderProjectImages,
  type ProjectState,
} from "../actions";
import { CATEGORY_L1, PREFECTURES } from "@/lib/member-taxonomy";
import { ProjectBodyImage } from "./ProjectBodyImage";
import { btn } from "@/lib/ui";

export type ProjectData = {
  id: string;
  title: string;
  body: string | null;
  fromRole: string | null;
  toRole: string | null;
  area: string | null;
  budget: string | null;
  tags: string[];
  imageUrls: string[];
  bodyImageUrl: string | null;
};

const inputCls =
  "rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]";

export function ProjectForm({ project }: { project: ProjectData }) {
  const save = saveProject.bind(null, project.id);
  const [state, formAction, pending] = useActionState<ProjectState, FormData>(save, {});
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgPending, startTransition] = useTransition();
  const [imgError, setImgError] = useState<string | null>(null);
  const [imgList, setImgList] = useState<string[]>(project.imageUrls);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= imgList.length || from === to) return;
    const next = [...imgList];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setImgList(next);
    startTransition(async () => {
      await reorderProjectImages(project.id, next);
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const res = await uploadProjectImage(project.id, fd);
      if (res.error) setImgError(res.error);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* 画像 */}
      <div className="flex flex-col gap-2">
        <div className="text-[12px] text-[var(--ink-2)]">
          画像（最大6枚。<b>1枚目がメイン画像</b>です。ドラッグ、または ◀ ▶ で並べ替えできます）
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
                if (dragIdx !== null) moveImage(dragIdx, i);
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
                    await removeProjectImage(project.id, url);
                    setImgList((cur) => cur.filter((u) => u !== url));
                  })
                }
                disabled={imgPending}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white"
              >
                ×
              </button>
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/40 px-1">
                <button
                  type="button"
                  onClick={() => moveImage(i, i - 1)}
                  disabled={imgPending || i === 0}
                  className="px-1 py-0.5 text-[11px] text-white disabled:opacity-30"
                  aria-label="左へ移動"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(i, i + 1)}
                  disabled={imgPending || i === imgList.length - 1}
                  className="px-1 py-0.5 text-[11px] text-white disabled:opacity-30"
                  aria-label="右へ移動"
                >
                  ▶
                </button>
              </div>
            </div>
          ))}
          {imgList.length < 6 ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={imgPending}
              className="grid h-28 w-28 place-items-center rounded-md border border-dashed border-[var(--line)] text-[12px] text-[var(--muted)] hover:border-[var(--green)]"
            >
              {imgPending ? "処理中…" : "＋ 追加"}
            </button>
          ) : null}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
        {imgError ? <p className="text-[12px] text-[var(--red)]">{imgError}</p> : null}
      </div>

      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        <span>困りごと・実現したいこと（タイトル）<span className="text-[var(--red)]"> ＊</span></span>
        <input name="title" defaultValue={project.title} placeholder="例：規格外マンゴーの廃棄に困っています。加工で活かせる方を探しています" className={inputCls} />
      </label>

      <div className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        詳しい状況・背景
        <textarea name="body" defaultValue={project.body ?? ""} rows={7} placeholder="何に困っているか／どうしたいか／どんな相手・協力を求めているか を書いてください。" className={inputCls} />
        <ProjectBodyImage projectId={project.id} url={project.bodyImageUrl} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
          あなたの立場
          <select name="fromRole" defaultValue={project.fromRole ?? ""} className={inputCls}>
            <option value="">未選択</option>
            {CATEGORY_L1.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
          相談したい相手
          <select name="toRole" defaultValue={project.toRole ?? ""} className={inputCls}>
            <option value="">誰でも</option>
            {CATEGORY_L1.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
          対象地域（都道府県）
          <select name="area" defaultValue={project.area ?? ""} className={inputCls}>
            <option value="">全国・未指定</option>
            {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
          予算感
          <input name="budget" defaultValue={project.budget ?? ""} placeholder="例：10〜30万円 / 応相談" className={inputCls} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
        タグ（カンマ区切り・最大8）
        <input name="tags" defaultValue={project.tags.join(", ")} placeholder="商品開発, 規格外活用, 少量可" className={inputCls} />
      </label>

      <div className="flex items-center gap-3 border-t border-[var(--line)] pt-4">
        <button type="submit" disabled={pending} className={btn("primary")}>
          {pending ? "保存中…" : "保存する"}
        </button>
        {state.ok ? <span className="text-[12px] text-[var(--green-d)]">保存しました。</span> : null}
        {state.error ? <span className="text-[12px] text-[var(--red)]">{state.error}</span> : null}
      </div>
    </form>
  );
}
