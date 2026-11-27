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
  // AIの提案と、NAKAMA会員との突き合わせ（2026-11-28）
  const [linkedMemberId, setLinkedMemberId] = useState("");
  const [greeting, setGreeting] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [scanState, scanAction, scanning] = useActionState<ScanState, FormData>(scanCard, {});
  const [saveState, saveAction, saving] = useActionState<SaveState, FormData>(saveCard, {});

  // 読み取れたら各欄に流し込む（本人がここから直す）
  useEffect(() => {
    if (scanState?.draft) {
      const d = scanState.draft as unknown as Record<string, string>;
      setValues(Object.fromEntries(CARD_FIELDS.map((f) => [f.key, d[f.key] ?? ""])));
    }
    // ⚠️ タグとあいさつ文は AI の下書き。本人がそのまま直せるよう、欄に入れておく
    if (scanState?.insight) {
      if (scanState.insight.tags.length) setTags(scanState.insight.tags.join(" "));
      if (scanState.insight.greeting) setGreeting(scanState.insight.greeting);
    }
    // ⚠️⚠️ 候補が**1件だけ**でも、勝手には結ばない。本人が押して選ぶ
    setLinkedMemberId("");
  }, [scanState]);

  // 保存できたら次の1枚へ
  useEffect(() => {
    if (saveState?.ok) {
      setDataUrl(""); setValues({}); setNote(""); setTags(""); setLocalError("");
      setLinkedMemberId(""); setGreeting("");
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
            {scanning ? "読み取って、相手のことを調べています…" : "読み取る"}
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

        {/*
          NAKAMAにいる会社かどうか（2026-11-28）。
          ⚠️⚠️ **勝手に結ばない。** 社名が同じだけの別会社ということがある。本人に選ばせる。
          ⚠️ これはエイトにできないこと＝会員名簿を持っているのはNAKAMAだけ。
        */}
        {scanState?.matches && scanState.matches.length > 0 ? (
          <div className="mt-4 rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3">
            <p className="text-[13px] font-bold text-[var(--green-d)]">
              この会社、NAKAMAにいるかもしれません
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-[var(--ink-2)]">
              同じ会社であれば選んでください。選ぶと、この名刺とその会員が結びつきます。
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {scanState.matches.map((m) => (
                <button
                  key={m.memberId}
                  type="button"
                  onClick={() =>
                    setLinkedMemberId((cur) => (cur === m.memberId ? "" : m.memberId))
                  }
                  aria-pressed={linkedMemberId === m.memberId}
                  className={`flex items-center gap-2.5 rounded-[8px] border bg-white px-3 py-2 text-left transition ${
                    linkedMemberId === m.memberId
                      ? "border-[var(--green)] ring-1 ring-[var(--green)]"
                      : "border-[var(--line)] hover:border-[var(--ink-2)]"
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white text-[12px] font-bold text-[var(--green-d)]">
                    {m.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (m.name[0] ?? "?").toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-[var(--ink)]">
                      {m.name}
                    </span>
                    <span className="block text-[11px] text-[var(--muted)]">
                      {[m.prefecture, m.contactName].filter(Boolean).join(" ・ ")}
                      {m.prefecture || m.contactName ? " ・ " : ""}
                      {m.reason}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] font-bold text-[var(--green-d)]">
                    {linkedMemberId === m.memberId ? "選択中" : "これ"}
                  </span>
                </button>
              ))}
            </div>
            {linkedMemberId ? (
              <a
                href={`/producers/${linkedMemberId}?from=${encodeURIComponent("/cards/scan")}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-[12px] font-bold text-[var(--green-d)] underline"
              >
                この会員のページを別のタブで見る →
              </a>
            ) : null}
          </div>
        ) : null}

        {/*
          一緒にできそうなこと（2026-11-28 ユーザー指示「AIをガンガン使ったものにして」）。
          ⚠️⚠️ **「AIの案」と必ず書く。** 名刺に書いていないことを、相手の実績のように見せない。
        */}
        {scanState?.insight && scanState.insight.ideas.length > 0 ? (
          <div className="mt-3 rounded-[10px] border border-[var(--line)] bg-white px-4 py-3">
            <p className="text-[13px] font-bold text-[var(--ink)]">
              一緒にできそうなこと
              <span className="ml-2 rounded-full bg-[var(--line-soft)] px-2 py-0.5 text-[11px] font-normal text-[var(--muted)]">
                AIの案
              </span>
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {scanState.insight.ideas.map((idea, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-6 text-[var(--ink-2)]">
                  <span className="text-[var(--muted)]">・</span>
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
              名刺とあなたのプロフィールから考えた案です。相手が実際にできるかどうかは確かめていません。
            </p>
          </div>
        ) : null}

        <form action={saveAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="imagePath" value={scanState?.imagePath ?? ""} />
          <input type="hidden" name="source" value={scanned ? "scan" : "manual"} />
          <input type="hidden" name="linkedMemberId" value={linkedMemberId} />
          {/* ⚠️ 上に出している「一緒にできそうなこと」を保存するための控え。
              hidden はフォームの中に置かないと送られない（一度外に置いて直した） */}
          {(scanState?.insight?.ideas ?? []).map((idea, i) => (
            <input key={i} type="hidden" name="ideas" value={idea} />
          ))}

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

          {/*
            最初のごあいさつ（2026-11-28）。
            ⚠️⚠️ **ここから勝手に送らない。** 名刺を取り込んだだけの相手に、
               こちらの判断でメッセージを送ってはいけない。下書きを置いておくだけ。
            ⚠️ 相手がNAKAMA会員だと分かったとき、本人がコピーして使う。
          */}
          {greeting ? (
            <label className={labelCls}>
              最初のごあいさつ（下書き）
              <span className={hintCls}>
                AIの案です。送る前に必ず読み直してください。送信はここからは行いません。
              </span>
              <textarea
                name="greetingDraft"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value.slice(0, 400))}
                rows={5}
                className={`${inputCls("sm")} w-full resize-y leading-[1.9]`}
              />
            </label>
          ) : null}

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
