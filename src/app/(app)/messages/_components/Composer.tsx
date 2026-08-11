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
import { btn, h2Cls, input, inputBare } from "@/lib/ui";
import { MAX_ATTACHMENTS } from "@/lib/attachments";
import { ScheduleModal } from "@/components/ScheduleModal";

type Template = { id: string; name: string; body: string };
/** 添付1件（preview は画像のときだけ入るローカルURL） */
type Attach = { url: string; name: string; size: number; preview: string | null };

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
  const [attachments, setAttachments] = useState<Attach[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();

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

  /** 選択・貼り付け・ドロップの入口。まとめてアップロードして添付に積む。 */
  function uploadFiles(files: File[]) {
    if (!files.length) return;
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      showToast(`添付できるファイルは${MAX_ATTACHMENTS}件までです`);
      return;
    }
    const picked = files.slice(0, room);
    if (files.length > room) showToast(`添付は${MAX_ATTACHMENTS}件までのため、${room}件だけ追加します`);

    setUploading(true);
    startTransition(async () => {
      for (const file of picked) {
        const fd = new FormData();
        fd.append("file", file);
        // 画像はその場でプレビューできるようにローカルURLを作る（アップロード結果は非公開URLのため）
        const localPreview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        const res = await uploadMessageAttachment(threadId, fd);
        if (res.error || !res.url || !res.name) {
          if (localPreview) URL.revokeObjectURL(localPreview);
          showToast(res.error ?? "アップロードに失敗しました");
          continue;
        }
        setAttachments((prev) =>
          prev.length >= MAX_ATTACHMENTS
            ? prev
            : [...prev, { url: res.url!, name: res.name!, size: res.size ?? 0, preview: localPreview }]
        );
      }
      setUploading(false);
    });
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    uploadFiles(Array.from(e.target.files ?? []));
    if (fileRef.current) fileRef.current.value = "";
  }

  /** スクリーンショット等をそのまま貼り付けられるようにする（⌘V / Ctrl+V）。 */
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (!files.length) return;
    e.preventDefault();
    uploadFiles(files);
  }

  /** テキスト欄へのドラッグ&ドロップでも添付できるようにする。 */
  function onDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (!files.length) return;
    e.preventDefault();
    setDragOver(false);
    uploadFiles(files);
  }

  /** 添付を1件取り消す。 */
  function removeAttachment(url: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.url === url);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((a) => a.url !== url);
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
          placeholder={`${otherName} へのメッセージ（画像はここに貼り付け・ドロップできます）`}
          onPaste={onPaste}
          onDrop={onDrop}
          onDragOver={(e) => {
            if (e.dataTransfer?.types?.includes("Files")) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          className={`${inputBare()} w-full border ${
            dragOver ? "border-[var(--green)] bg-[var(--green-soft)]" : "border-[var(--line)] bg-white"
          }`}
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

        {attachments.length ? (
          <div className="mt-2 flex flex-col gap-2">
            {attachments.map((a) => (
              <div key={a.url} className="rounded-[10px] border border-[var(--green)] bg-white p-3">
                {a.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.preview}
                    alt={a.name}
                    className="mb-2 max-h-[220px] w-auto rounded object-contain"
                  />
                ) : (
                  <div className="mb-2 text-[28px] leading-none">📄</div>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="break-all text-[var(--ink)]">
                    {a.name}
                    <span className="text-[var(--muted)]">（{formatBytes(a.size)}）</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.url)}
                    className="shrink-0 text-[var(--red)] underline"
                  >
                    取り消す
                  </button>
                </div>
                <input
                  type="hidden"
                  name="attachments"
                  value={JSON.stringify({ url: a.url, name: a.name, size: a.size })}
                />
              </div>
            ))}
            <p className="text-[11px] text-[var(--muted)]">
              送信すると相手に届きます（相手はプレビューとダウンロードができます）。
              添付は{MAX_ATTACHMENTS}件まで・1件8MBまで。
            </p>
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
              disabled={pending || uploading || attachments.length >= MAX_ATTACHMENTS}
              className={btnCls}
            >
              📎 {uploading
                ? "アップロード中…"
                : attachments.length
                  ? `ファイル添付（${attachments.length}/${MAX_ATTACHMENTS}）`
                  : "ファイル添付"}
            </button>
          </div>
          <SubmitButton />
        </div>
        <input ref={fileRef} type="file" multiple hidden onChange={onPickFiles} />
      </form>

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
                <input value={tName} onChange={(e) => setTName(e.target.value)} className={input()} />
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

      {/* 面談日程（候補日を押して積み上げる。実装は共通コンポーネント） */}
      {modal === "schedule" ? (
        <ScheduleModal
          onClose={() => setModal(null)}
          insertLabel="メッセージに反映"
          onInsert={(text) => {
            appendText(text);
            setModal(null);
          }}
        />
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
