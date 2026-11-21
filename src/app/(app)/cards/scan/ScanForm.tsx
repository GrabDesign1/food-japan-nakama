"use client";

// 名刺を撮る → AIが読み取る → 本人が直す → 保存。
//
// ⚠️ 送る前にブラウザで縮める。そのままの写真（4000px超）を送ると費用と待ち時間が跳ねる。
// ⚠️ AIが入れた値は**下書き**。保存するのは本人が確認した値だけ。画面でそう明示する。
// ⚠️ 入力は制御コンポーネントにする（React 19 はサーバーアクション完了時に form をリセットする）。
import { useActionState, useEffect, useRef, useState } from "react";
import { btn, input as inputCls } from "@/lib/ui";
import {
  CARD_FIELDS, CARD_IMAGE_LONG_EDGE, CARD_FIELD_MAX, confidenceNote,
} from "@/lib/contact-card-core";
import { scanCard, saveCard, type ScanState, type SaveState } from "./actions";

const labelCls = "flex flex-col gap-1.5 text-[13px] font-semibold text-[var(--ink)]";
const hintCls = "text-[12px] font-normal leading-5 text-[var(--muted)]";

/** 長辺を縮めて JPEG の data URL にする */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, CARD_IMAGE_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function ScanForm({ defaultMetAt }: { defaultMetAt: string | null }) {
  const [dataUrl, setDataUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [metAt, setMetAt] = useState(defaultMetAt ?? "");
  const [metOn, setMetOn] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [localError, setLocalError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [scanState, scanAction, scanning] = useActionState<ScanState, FormData>(scanCard, {});
  const [saveState, saveAction, saving] = useActionState<SaveState, FormData>(saveCard, {});

  // 読み取れたら各欄に流し込む（本人がここから直す）
  useEffect(() => {
    if (scanState?.draft) {
      const d = scanState.draft as unknown as Record<string, string>;
      setValues(Object.fromEntries(CARD_FIELDS.map((f) => [f.key, d[f.key] ?? ""])));
    }
  }, [scanState]);

  // 保存できたら次の1枚へ
  useEffect(() => {
    if (saveState?.ok) {
      setDataUrl(""); setValues({}); setNote(""); setTags(""); setLocalError("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [saveState]);

  const scanned = !!scanState?.draft;
  const note1 = scanState?.draft ? confidenceNote(scanState.draft.confidence) : null;

  async function pick(file: File | undefined) {
    if (!file) return;
    setLocalError("");
    setBusy(true);
    try {
      setDataUrl(await shrink(file));
    } catch {
      setLocalError("写真を読み込めませんでした。別の写真でお試しください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. 撮る */}
      <section className="rounded-[10px] border border-[var(--line)] bg-white px-4 py-4 sm:px-5">
        <h2 className="text-[15px] font-bold text-[var(--ink)]">1. 名刺を撮る</h2>
        <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
          明るいところで、名刺だけが入るように撮ってください。
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="mt-3 block w-full text-[13px]"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        {dataUrl ? (
          <div className="mt-3">
            {/* 送信前のプレビュー。next/image は data: を扱えないので img を使う */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt="撮影した名刺"
              className="max-h-56 rounded-[8px] border border-[var(--line)] object-contain"
            />
          </div>
        ) : null}

        {localError ? (
          <p className="mt-3 text-[13px] text-[var(--red)]">{localError}</p>
        ) : null}

        <form action={scanAction} className="mt-3">
          <input type="hidden" name="image" value={dataUrl} />
          <button type="submit" disabled={!dataUrl || scanning || busy} className={btn("primary", "sm")}>
            {scanning ? "読み取っています…" : "読み取る"}
          </button>
        </form>

        {scanState?.error ? (
          <p className="mt-3 rounded-[8px] border border-[#E7C7BE] bg-[var(--red-soft)] px-3 py-2 text-[13px] leading-6 text-[var(--red)]">
            {scanState.error}
          </p>
        ) : null}
      </section>

      {/* 2. 確かめて保存 */}
      <section className="rounded-[10px] border border-[var(--line)] bg-white px-4 py-4 sm:px-5">
        <h2 className="text-[15px] font-bold text-[var(--ink)]">2. 確かめて保存する</h2>
        <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
          {scanned
            ? "読み取った内容です。間違いを直してから保存してください。"
            : "読み取らずに、手で入力しても保存できます。"}
        </p>

        {note1 ? (
          <p className="mt-3 rounded-[8px] border border-[var(--amber-line)] bg-[var(--amber-bg)] px-3 py-2 text-[13px] leading-6 text-[var(--amber-ink)]">
            {note1}
          </p>
        ) : null}

        <form action={saveAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="imagePath" value={scanState?.imagePath ?? ""} />
          <input type="hidden" name="source" value={scanned ? "scan" : "manual"} />

          {CARD_FIELDS.map((f) => (
            <label key={f.key} className={labelCls}>
              {f.label}
              {f.hint ? <span className={hintCls}>{f.hint}</span> : null}
              <input
                type="text"
                name={f.key}
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value.slice(0, CARD_FIELD_MAX) }))
                }
                inputMode={f.inputMode}
                autoComplete="off"
                className={`${inputCls("sm")} w-full`}
              />
            </label>
          ))}

          <label className={labelCls}>
            出会った場
            <input
              type="text"
              name="metAt"
              value={metAt}
              onChange={(e) => setMetAt(e.target.value)}
              className={`${inputCls("sm")} w-full`}
              autoComplete="off"
            />
          </label>

          <label className={labelCls}>
            出会った日
            <input
              type="date"
              name="metOn"
              value={metOn}
              onChange={(e) => setMetOn(e.target.value)}
              className={`${inputCls("sm")} w-full`}
            />
          </label>

          <label className={labelCls}>
            タグ
            <span className={hintCls}>空白かカンマで区切ってください（例：黒酢 宮崎 ギフト）</span>
            <input
              type="text"
              name="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={`${inputCls("sm")} w-full`}
              autoComplete="off"
            />
          </label>

          <label className={labelCls}>
            メモ
            <span className={hintCls}>あなたにだけ見えます。相手には表示されません。</span>
            <textarea
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className={`${inputCls("sm")} w-full resize-y leading-[1.9]`}
            />
          </label>

          {saveState?.error ? (
            <p className="rounded-[8px] border border-[#E7C7BE] bg-[var(--red-soft)] px-3 py-2 text-[13px] leading-6 text-[var(--red)]">
              {saveState.error}
            </p>
          ) : null}
          {saveState?.ok ? (
            <p className="rounded-[8px] border border-[var(--green-soft)] bg-[var(--green-soft)] px-3 py-2 text-[13px] leading-6 text-[var(--green-d)]">
              保存しました。続けて次の1枚をどうぞ。
            </p>
          ) : null}

          <div>
            <button type="submit" disabled={saving} className={btn("primary", "md")}>
              {saving ? "保存しています…" : "この名刺を保存する"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
