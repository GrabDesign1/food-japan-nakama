"use client";

import { useRef, useState, useTransition } from "react";
import {
  sendMessage,
  saveDraft,
  uploadMessageAttachment,
  createTemplate,
  deleteTemplate,
} from "../actions";
import { btn, h2Cls } from "@/lib/ui";

type Template = { id: string; name: string; body: string };

// 最初から用意されている定型文（削除不可）
const DEFAULT_TEMPLATES: { name: string; body: string }[] = [
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
  locked = false,
}: {
  threadId: string;
  otherName: string;
  initialDraft: string;
  initialTemplates: Template[];
  locked?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<null | "template" | "schedule">(null);
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
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
    startTransition(async () => {
      const res = await uploadMessageAttachment(threadId, fd);
      if (res.error) showToast(res.error);
      else if (res.url && res.name) setAttachment({ url: res.url, name: res.name });
      if (fileRef.current) fileRef.current.value = "";
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

  // フリープランは送信・返信不可。入力欄をアップグレード案内に置き換える。
  if (locked) {
    return (
      <div className="border-t border-[var(--line)] p-4">
        <div className="rounded-[10px] border border-[#B77F0B] bg-[#FAF0D6] p-5">
          <div className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
            <span>🔒</span>
            メッセージの送信・返信は「共創コミュニティ」プランの機能です
          </div>
          <p className="mb-3 text-[12px] leading-6 text-[var(--ink-2)]">
            フリープランではメッセージの送信・返信はご利用いただけません。
            アップグレードすると、この会話を続けて商談を進められます。
          </p>
          <a
            href="/billing"
            className={`${btn("primary")} inline-block`}
          >
            アップグレードする
          </a>
        </div>
      </div>
    );
  }

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

        {attachment ? (
          <div className="mt-2 flex items-center gap-2 text-[12px]">
            <span className="rounded bg-[var(--green-soft)] px-2 py-1 text-[var(--green-d)]">
              📎 {attachment.name}
            </span>
            <button type="button" onClick={() => setAttachment(null)} className="text-[var(--red)]">
              取り消し
            </button>
            <input type="hidden" name="attachmentUrl" value={attachment.url} />
            <input type="hidden" name="attachmentName" value={attachment.name} />
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
            <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className={btnCls}>
              📎 ファイル添付
            </button>
          </div>
          <button className={`${btn("primary")} shrink-0 whitespace-nowrap`}>
            送信
          </button>
        </div>
        <input ref={fileRef} type="file" hidden onChange={onPickFile} />
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
                    <button type="button" onClick={() => { appendText(t.body); setModal(null); }} className="text-[12px] text-[var(--green-d)] underline">
                      使う
                    </button>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap line-clamp-2 text-[12px] text-[var(--muted)]">{t.body}</p>
                </div>
              ))}

              {/* 自分で作成したテンプレート */}
              {templates.map((t) => (
                <div key={t.id} className="rounded-lg border border-[var(--line)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-[var(--ink)]">{t.name}</span>
                    <div className="flex gap-3 text-[12px]">
                      <button type="button" onClick={() => { appendText(t.body); setModal(null); }} className="text-[var(--green-d)] underline">
                        使う
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

function Modal({
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
