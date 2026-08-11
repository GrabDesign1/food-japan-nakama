"use client";

import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  sendMessage,
  saveDraft,
  uploadMessageAttachment,
  createTemplate,
  deleteTemplate,
} from "../actions";
import { btn, h2Cls } from "@/lib/ui";

type Template = { id: string; name: string; body: string };

/** 3.50 KB のように読みやすく表示する。 */
export function formatBytes(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** 送信ボタン。押した直後に「送信中…」へ変わり、二重送信も防ぐ。 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${btn("primary")} shrink-0 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
          送信中…
        </span>
      ) : (
        "送信"
      )}
    </button>
  );
}

// 最初から用意されている定型文（削除不可）。提案フォーム（/ledger/[id]/propose）でも同じものを使う
export const DEFAULT_TEMPLATES: { name: string; body: string }[] = [
  {
    name: "はじめまして",
    body: "はじめまして。◯◯（事業者名）の△△と申します。\n貴社の取り組みを拝見し、ぜひ一度お話しできればと思いご連絡いたしました。\n共創に向けて、まずは気軽に情報交換させていただけますと幸いです。\nどうぞよろしくお願いいたします。",
  },
  {
    name: "日程の調整について",
    body: "お世話になっております。\n面談の日程について調整させていただければと思います。\n下記の候補の中から、ご都合のよい日時をお知らせいただけますでしょうか。\n\n【候補日】\n・\n・\n・\n\nオンライン・対面どちらでも対応可能です。\nどうぞよろしくお願いいたします。",
  },
];

export function Composer({
  threadId,
  otherName,
  initialDraft,
  initialTemplates,
  myCompanyName,
  myPersonName,
}: {
  threadId: string;
  otherName: string;
  initialDraft: string;
  initialTemplates: Template[];
  myCompanyName: string;
  myPersonName: string;
}) {
  /** 定型文の「◯◯（事業者名）」「△△」を自分の情報で埋める（未登録なら元の記号のまま残す）。 */
  const fillTemplate = (body: string) =>
    body
      .replace(/◯◯（事業者名）/g, myCompanyName.trim() || "◯◯（事業者名）")
      .replace(/△△/g, myPersonName.trim() || "△△");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<null | "template" | "schedule" | "file">(null);
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [attachment, setAttachment] = useState<{ url: string; name: string; size: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // 添付モーダル（アップロード完了後に開き、ここでメッセージを書いて送信する）
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileBaseName, setFileBaseName] = useState("");
  const [fileExt, setFileExt] = useState("");
  const [fileMessage, setFileMessage] = useState("");
  const [pending, startTransition] = useTransition();

  // 面談日程
  const [rows, setRows] = useState([{ date: "", start: "", end: "" }]);
  const [remark, setRemark] = useState("");

  // テンプレート作成
  const [tName, setTName] = useState("");
  const [tBody, setTBody] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function appendText(t: string) {
    const el = textareaRef.current;
    if (!el) return;
    el.value = el.value.trim() ? el.value.trimEnd() + "\n\n" + t : t;
    el.focus();
  }

  function onSaveDraft() {
    startTransition(async () => {
      await saveDraft(threadId, textareaRef.current?.value ?? "");
      showToast("下書きを保存しました");
    });
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    // 画像はその場でプレビューできるようにローカルURLを作る（アップロード結果は非公開URLのため）
    const localPreview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    const dot = file.name.lastIndexOf(".");
    setFileBaseName(dot > 0 ? file.name.slice(0, dot) : file.name);
    setFileExt(dot > 0 ? file.name.slice(dot) : "");
    // アップロードには時間がかかるため、進行中であることを必ず画面に出す
    setUploading(true);
    startTransition(async () => {
      const res = await uploadMessageAttachment(threadId, fd);
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (res.error) {
        if (localPreview) URL.revokeObjectURL(localPreview);
        showToast(res.error);
        return;
      }
      if (res.url && res.name) {
        setAttachment({ url: res.url, name: res.name, size: res.size ?? 0 });
        setFilePreview(localPreview);
        setFileMessage("");
        // 登録（アップロード）が終わってからモーダルを開く
        setModal("file");
      }
    });
  }

  /** 添付モーダルを閉じる（送信せずに閉じた場合は添付を破棄する）。 */
  function closeFileModal(keepAttachment: boolean) {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    setModal(null);
    if (!keepAttachment) setAttachment(null);
  }

  /** モーダルからそのまま送信する。 */
  function onSendFile() {
    if (!attachment) return;
    const name = `${fileBaseName.trim() || "file"}${fileExt}`;
    const fd = new FormData();
    fd.set("message", fileMessage.trim());
    fd.set("attachmentUrl", attachment.url);
    fd.set("attachmentName", name);
    fd.set("attachmentSize", String(attachment.size));
    startTransition(async () => {
      await sendMessage(threadId, fd);
      closeFileModal(false);
      if (textareaRef.current) textareaRef.current.value = "";
      showToast("ファイルを送信しました");
    });
  }

  function onCreateTemplate() {
    startTransition(async () => {
      const res = await createTemplate(tName, tBody);
      if ("error" in res) {
        showToast(res.error);
        return;
      }
      setTemplates([res, ...templates]);
      setTName("");
      setTBody("");
      setCreating(false);
      showToast("テンプレートを作成しました");
    });
  }

  function onDeleteTemplate(id: string) {
    startTransition(async () => {
      await deleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
    });
  }

  function insertSchedule() {
    const lines = rows
      .filter((r) => r.date)
      .map((r) => {
        const dt = new Date(r.date);
        const w = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
        const p = (n: number) => String(n).padStart(2, "0");
        const range = r.start && r.end ? ` ${r.start}〜${r.end}` : r.start ? ` ${r.start}〜` : "";
        return `・${dt.getFullYear()}/${p(dt.getMonth() + 1)}/${p(dt.getDate())}（${w}）${range}`;
      });
    if (lines.length) {
      let text = "【面談候補日】\n" + lines.join("\n");
      if (remark.trim()) text += "\n備考：" + remark.trim();
      appendText(text);
    }
    setModal(null);
    setRows([{ date: "", start: "", end: "" }]);
    setRemark("");
  }

  const btnCls =
    "flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--green-d)] disabled:opacity-50";

  // メッセージの送信・返信は無料（2026-08-10 最終決定書：月額ゲート撤廃）

  return (
    <div className="border-t border-[var(--line)] p-4">
      <form action={sendMessage.bind(null, threadId)}>
        <textarea
          ref={textareaRef}
          name="message"
          rows={3}
          defaultValue={initialDraft}
          placeholder={`${otherName} へのメッセージ`}
          className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
        />

        {uploading ? (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--canvas)] px-3 py-2 text-[12px] text-[var(--ink-2)]">
            <span
              aria-hidden
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--green)]"
            />
            ファイルをアップロードしています…
          </div>
        ) : null}

        {attachment ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-[var(--green)] bg-[var(--green-soft)] px-3 py-2 text-[12px]">
            <span className="font-semibold text-[var(--green-d)]">
              📎 {attachment.name}
            </span>
            <span className="text-[11px] text-[var(--ink-2)]">を添付しました（送信すると相手に届きます）</span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="ml-auto text-[var(--red)] underline"
            >
              取り消す
            </button>
            <input type="hidden" name="attachmentUrl" value={attachment.url} />
            <input type="hidden" name="attachmentName" value={attachment.name} />
            <input type="hidden" name="attachmentSize" value={attachment.size} />
          </div>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={onSaveDraft} disabled={pending} className={btnCls}>
              ⤓ 下書き保存
            </button>
            <button type="button" onClick={() => setModal("template")} className={btnCls}>
              🗒 テンプレートから選択
            </button>
            <button type="button" onClick={() => setModal("schedule")} className={btnCls}>
              📅 面談日程を調整
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending || uploading}
              className={btnCls}
            >
              📎 {uploading ? "アップロード中…" : attachment ? "添付を変更" : "ファイル添付"}
            </button>
          </div>
          <SubmitButton />
        </div>
        <input ref={fileRef} type="file" hidden onChange={onPickFile} />
      </form>

      {/* 添付ファイルの送信（アップロード完了後に開く） */}
      {modal === "file" && attachment ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !pending && closeFileModal(false)} />
          <div className="relative z-10 flex max-h-[86vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[12px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
              <h2 className={h2Cls}>ファイルの送信</h2>
              <button
                type="button"
                onClick={() => !pending && closeFileModal(false)}
                className="text-[20px] leading-none text-[var(--muted)] hover:text-[var(--ink)]"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
                ファイルに関するメッセージ（任意）
                <textarea
                  autoFocus
                  rows={3}
                  value={fileMessage}
                  onChange={(e) => setFileMessage(e.target.value)}
                  placeholder="例：規格書をお送りします。ご確認ください。"
                  className="rounded-lg border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
                />
              </label>

              <label className="mt-4 flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
                ファイル名
                <span className="flex items-center gap-2">
                  <input
                    value={fileBaseName}
                    onChange={(e) => setFileBaseName(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
                  />
                  <span className="shrink-0 text-[13px] text-[var(--muted)]">{fileExt}</span>
                </span>
              </label>

              <div className="mt-4 grid place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--canvas)] p-4">
                {filePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={filePreview} alt="" className="max-h-[240px] w-auto object-contain" />
                ) : (
                  <div className="py-8 text-center text-[13px] text-[var(--muted)]">
                    <div className="text-[28px]">📄</div>
                    {fileBaseName}
                    {fileExt}
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] text-[var(--muted)]">
                {formatBytes(attachment.size)}・このファイルはスレッドの相手だけが開けます。
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] px-5 py-3.5">
              <button
                type="button"
                onClick={() => closeFileModal(false)}
                disabled={pending}
                className={btn("secondary")}
              >
                キャンセル
              </button>
              <button type="button" onClick={onSendFile} disabled={pending} className={btn("primary")}>
                {pending ? "送信中…" : "送信"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* トースト */}
      {toast ? (
        <div className="fixed right-6 top-6 z-[60] rounded-md bg-[var(--green)] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {/* テンプレートモーダル */}
      {modal === "template" ? (
        <Modal title={creating ? "メッセージテンプレート作成" : "メッセージテンプレート選択"} onClose={() => { setModal(null); setCreating(false); }}>
          {creating ? (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-[13px] text-[var(--ink-2)]">
                テンプレート名
                <input value={tName} onChange={(e) => setTName(e.target.value)} className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]" />
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-[var(--ink-2)]">
                テンプレート本文
                <textarea value={tBody} onChange={(e) => setTBody(e.target.value)} rows={6} className="rounded-md border border-[var(--green)] px-3 py-2 text-[14px] outline-none" />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={onCreateTemplate} disabled={pending} className={btn("primary", "sm")}>
                  保存する
                </button>
                <button type="button" onClick={() => setCreating(false)} className={btn("secondary", "sm")}>
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* 最初から用意されている定型文 */}
              {DEFAULT_TEMPLATES.map((t) => (
                <div key={t.name} className="rounded-lg border border-[var(--line)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[14px] font-medium text-[var(--ink)]">
                      {t.name}
                      <span className="rounded bg-[var(--green-soft)] px-1.5 py-0.5 text-[10px] text-[var(--green-d)]">
                        定型
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => { appendText(fillTemplate(t.body)); setModal(null); }}
                      className={`${btn("primary", "sm")} shrink-0`}
                    >
                      この文面を使う
                    </button>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap line-clamp-2 text-[12px] text-[var(--muted)]">{fillTemplate(t.body)}</p>
                </div>
              ))}

              {/* 自分で作成したテンプレート */}
              {templates.map((t) => (
                <div key={t.id} className="rounded-lg border border-[var(--line)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-[var(--ink)]">{t.name}</span>
                    <div className="flex gap-3 text-[12px]">
                      <button
                        type="button"
                        onClick={() => { appendText(fillTemplate(t.body)); setModal(null); }}
                        className={`${btn("primary", "sm")} shrink-0`}
                      >
                        この文面を使う
                      </button>
                      <button type="button" onClick={() => onDeleteTemplate(t.id)} className="text-[var(--red)] underline">
                        削除
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-[var(--muted)]">{t.body}</p>
                </div>
              ))}

              <button type="button" onClick={() => setCreating(true)} className={`${btn("primary", "sm")} w-fit`}>
                ＋ 新規テンプレート作成
              </button>
            </div>
          )}
        </Modal>
      ) : null}

      {/* 面談日程モーダル */}
      {modal === "schedule" ? (
        <Modal title="面談日程調整" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-[var(--canvas)] p-4">
              <div className="mb-2 text-[13px] font-semibold text-[var(--ink-2)]">候補日</div>
              <div className="flex flex-col gap-2">
                {rows.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input type="date" value={r.date} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-[13px]" />
                    <input type="time" value={r.start} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-[13px]" />
                    <span>〜</span>
                    <input type="time" value={r.end} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-[13px]" />
                    {rows.length > 1 ? (
                      <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-[12px] text-[var(--red)]">削除</button>
                    ) : null}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setRows([...rows, { date: "", start: "", end: "" }])} className={`${btn("secondary", "sm")} mt-3`}>
                候補日を追加する
              </button>
            </div>
            <label className="flex flex-col gap-1 text-[13px] text-[var(--ink-2)]">
              備考
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3} className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={insertSchedule} className={btn("primary", "sm")}>
                メッセージに反映
              </button>
              <button type="button" onClick={() => setModal(null)} className={btn("secondary", "sm")}>
                キャンセル
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[86vh] w-full max-w-[640px] overflow-y-auto rounded-[12px] bg-white p-7 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className={`${h2Cls} flex items-center gap-2`}>
            <span className="inline-block h-5 w-1.5 rounded bg-[var(--green)]" />
            {title}
          </h2>
          <button type="button" onClick={onClose} className={btn("secondary", "sm")}>
            ✕ 閉じる
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
